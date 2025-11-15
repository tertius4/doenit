package doenit.app;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.*;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "BillingService")
public class BillingPlugin extends Plugin {
    private static final String TAG = "[Doenit BillingPlugin]";
    private BillingClient billingClient;
    private boolean isInitialized = false;
    private PluginCall pendingPurchaseCall;

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();

        billingClient = BillingClient.newBuilder(activity)
                .setListener((billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        for (Purchase purchase : purchases) {
                            handlePurchase(purchase);
                        }
                    } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
                        // Handle user cancellation
                        if (pendingPurchaseCall != null) {
                            JSObject error = new JSObject();
                            error.put("code", "USER_CANCELED");
                            error.put("message", "User cancelled the purchase");
                            pendingPurchaseCall.reject("User cancelled", error);
                            pendingPurchaseCall = null;
                        }
                    } else {
                        // Handle other errors
                        if (pendingPurchaseCall != null) {
                            pendingPurchaseCall.reject("Purchase failed: " + billingResult.getDebugMessage());
                            pendingPurchaseCall = null;
                        }
                    }
                })
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isInitialized = true;
                    call.resolve();
                } else {
                    call.reject("Failed to initialize billing: " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isInitialized = false;
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }

    @PluginMethod
    public void queryProductDetails(PluginCall call) {
        if (!isInitialized) {
            call.reject("Billing not initialized");
            return;
        }

        JSArray productIds = call.getArray("product_ids");
        if (productIds == null) {
            call.reject("Missing product_ids parameter");
            return;
        }
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();

        try {
            for (int i = 0; i < productIds.length(); i++) {
                String productId = productIds.getString(i);
                Log.d(TAG, "queryProductDetails: Adding product ID: " + productId);
                productList.add(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(productId)
                                .setProductType(BillingClient.ProductType.SUBS)
                                .build());
            }
            Log.d(TAG, "queryProductDetails: Total products to query: " + productList.size());
        } catch (JSONException e) {
            Log.e(TAG, "queryProductDetails: Invalid product IDs", e);
            call.reject("Invalid product IDs", e);
            return;
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        Log.d(TAG, "queryProductDetails: Querying product details from Google Play");
        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            Log.d(TAG, "queryProductDetails: Response code: " + billingResult.getResponseCode());

            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.e(TAG, "queryProductDetails: Failed - " + billingResult.getDebugMessage());
                call.reject("Failed to query products: " + billingResult.getDebugMessage());
                return;
            }

            Log.d(TAG, "queryProductDetails: Successfully retrieved " + productDetailsList.size() + " products");
            JSArray products = new JSArray();

            for (ProductDetails productDetails : productDetailsList) {
                Log.d(TAG, "queryProductDetails: Processing product: " + productDetails.getProductId());
                JSObject product = new JSObject();
                product.put("productId", productDetails.getProductId());
                product.put("title", productDetails.getTitle());
                product.put("description", productDetails.getDescription());

                if (productDetails.getSubscriptionOfferDetails() == null || productDetails.getSubscriptionOfferDetails().isEmpty()) {
                    Log.w(TAG, "queryProductDetails: No subscription offers for " + productDetails.getProductId());
                    products.put(product);
                    continue;
                }

                ProductDetails.SubscriptionOfferDetails offerDetails = productDetails
                        .getSubscriptionOfferDetails().get(0);
                ProductDetails.PricingPhase pricingPhase = offerDetails.getPricingPhases().getPricingPhaseList()
                        .get(0);

                Log.d(TAG, "queryProductDetails: Price for " + productDetails.getProductId() + ": "
                        + pricingPhase.getFormattedPrice());
                product.put("price", pricingPhase.getFormattedPrice());
                product.put("priceAmountMicros", pricingPhase.getPriceAmountMicros());
                product.put("priceCurrencyCode", pricingPhase.getPriceCurrencyCode());

                products.put(product);
            }

            JSObject result = new JSObject();
            result.put("products", products);
            Log.d(TAG, "queryProductDetails: Resolving with " + products.length() + " products");
            call.resolve(result);
        });
    }

    @PluginMethod
    public void startPurchase(PluginCall call) {
        if (!isInitialized) {
            call.reject("Billing not initialized");
            return;
        }

        String productId = call.getString("product_id");
        
        // Save the call to resolve later
        pendingPurchaseCall = call;

        // First query the product details
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK &&
                    !productDetailsList.isEmpty()) {

                ProductDetails productDetails = productDetailsList.get(0);

                if (productDetails.getSubscriptionOfferDetails() != null &&
                        !productDetails.getSubscriptionOfferDetails().isEmpty()) {
                    ProductDetails.SubscriptionOfferDetails offerDetails = productDetails.getSubscriptionOfferDetails()
                            .get(0);

                    List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                    productDetailsParamsList.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
                                    .setOfferToken(offerDetails.getOfferToken())
                                    .build());

                    BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                            .setProductDetailsParamsList(productDetailsParamsList)
                            .build();

                    BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);

                    if (launchResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        // Don't resolve here - wait for the purchase listener
                        Log.d(TAG, "Billing flow launched successfully");
                    } else {
                        pendingPurchaseCall = null;
                        call.reject("Failed to launch billing flow: " + launchResult.getDebugMessage());
                    }
                } else {
                    call.reject("No subscription offers available");
                }
            } else {
                call.reject("Product not found");
            }
        });
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!isInitialized) {
            call.reject("Billing not initialized");
            return;
        }

        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSArray purchasesArray = new JSArray();

                        for (Purchase purchase : purchases) {
                            JSObject purchaseObj = new JSObject();
                            purchaseObj.put("product_id", purchase.getProducts().get(0));
                            purchaseObj.put("purchase_token", purchase.getPurchaseToken());
                            purchaseObj.put("purchase_state", purchase.getPurchaseState());
                            purchaseObj.put("acknowledged", purchase.isAcknowledged());
                            purchaseObj.put("order_id", purchase.getOrderId());
                            purchasesArray.put(purchaseObj);
                        }

                        JSObject result = new JSObject();
                        result.put("purchases", purchasesArray);
                        call.resolve(result);
                    } else {
                        call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                    }
                });
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (!isInitialized) {
            call.reject("Billing not initialized");
            return;
        }

        String purchaseToken = call.getString("purchaseToken");

        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                call.resolve();
            } else {
                call.reject("Failed to acknowledge purchase: " + billingResult.getDebugMessage());
            }
        });
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // Resolve the pending call with purchase token
            if (pendingPurchaseCall != null) {
                JSObject result = new JSObject();
                result.put("purchase_token", purchase.getPurchaseToken());
                result.put("product_id", purchase.getProducts().get(0));
                result.put("order_id", purchase.getOrderId());
                pendingPurchaseCall.resolve(result);
                pendingPurchaseCall = null;
            }

            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken())
                        .build();

                billingClient.acknowledgePurchase(params, billingResult -> {
                    Log.d(TAG, "Purchase acknowledged: " + billingResult.getDebugMessage());
                });
            }
        }
    }
}
