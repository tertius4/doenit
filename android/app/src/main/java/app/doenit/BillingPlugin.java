package doenit.app;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.*;
import com.android.billingclient.api.AccountIdentifiers;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsParams.Product;
import com.android.billingclient.api.QueryProductDetailsParams.Product.Builder;

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

    private BillingClientStateListener createStateListener(PluginCall call, Runnable onSuccess) {
        return new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                int response_code = billingResult.getResponseCode();
                if (response_code != BillingClient.BillingResponseCode.OK) {
                    Log.e(TAG, "Failed to initialize: " + billingResult.getDebugMessage());
                    call.reject("Failed to initialize billing: " + billingResult.getDebugMessage());
                    return;
                }

                isInitialized = true;
                if (onSuccess != null) {
                    onSuccess.run();
                } else {
                    call.resolve();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isInitialized = false;
                Log.w(TAG, "Billing service disconnected");
            }
        };
    }

    private void initializeBillingClient() {
        Activity activity = getActivity();
        if (activity == null) {
            Log.e(TAG, "Activity not available for billing client initialization");
            return;
        }

        PurchasesUpdatedListener purchasesUpdatedListener = (billingResult, purchases) -> {
            handlePurchaseUpdate(billingResult, purchases);
        };

        BillingClient.Builder builder = BillingClient.newBuilder(activity)
                .setListener(purchasesUpdatedListener)
                .enablePendingPurchases();

        billingClient = builder.build();
    }

    private void reconnectAndExecute(PluginCall call, Runnable onSuccess) {
        if (billingClient == null) {
            Log.w(TAG, "Billing client is null, initializing...");
            initializeBillingClient();
            if (billingClient == null) {
                call.reject("Failed to initialize billing client");
                return;
            }
        }

        billingClient.startConnection(createStateListener(call, onSuccess));
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        initializeBillingClient();
        if (billingClient == null) {
            call.reject("Failed to initialize billing client");
            return;
        }
        billingClient.startConnection(createStateListener(call, null));
    }

    private void handlePurchaseUpdate(BillingResult billingResult, List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();

        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            Log.d(TAG, "Purchase successful, processing " + purchases.size() + " purchase(s)");
            for (Purchase purchase : purchases) {
                handlePurchase(purchase);
            }
        } else if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d(TAG, "User cancelled purchase");
            if (pendingPurchaseCall != null) {
                JSObject error = new JSObject();
                error.put("code", "USER_CANCELED");
                error.put("message", "User cancelled the purchase");
                pendingPurchaseCall.reject("User cancelled", error);
                pendingPurchaseCall = null;
            }
        } else {
            Log.e(TAG, "Purchase failed: " + billingResult.getDebugMessage());
            if (pendingPurchaseCall != null) {
                JSObject error = new JSObject();
                error.put("code", String.valueOf(responseCode));
                error.put("message", billingResult.getDebugMessage());
                pendingPurchaseCall.reject("Purchase failed", error);
                pendingPurchaseCall = null;
            }
        }
    }

    @PluginMethod
    public void queryProductDetails(PluginCall call) {
        if (!isInitialized || !billingClient.isReady()) {
            reconnectAndExecute(call, () -> queryProductDetailsInternal(call));
            return;
        }

        queryProductDetailsInternal(call);
    }

    private void queryProductDetailsInternal(PluginCall call) {
        JSArray product_ids = call.getArray("product_ids");
        if (product_ids == null) {
            call.reject("Missing product_ids parameter");
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        try {
            for (int i = 0; i < product_ids.length(); i++) {
                String product_id = product_ids.getString(i);
                productList.add(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(product_id)
                                .setProductType(BillingClient.ProductType.SUBS)
                                .build());
            }
        } catch (JSONException e) {
            Log.e(TAG, "Invalid product IDs", e);
            call.reject("Invalid product IDs", e);
            return;
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.e(TAG, "Failed to query products: " + billingResult.getDebugMessage());
                call.reject("Failed to query products: " + billingResult.getDebugMessage());
                return;
            }

            JSArray products = new JSArray();
            for (ProductDetails productDetails : productDetailsList) {
                JSObject product = BillingUtils.productDetailsToJSObject(productDetails);
                products.put(product);
            }

            JSObject result = new JSObject();
            result.put("products", products);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void startPurchase(PluginCall call) {
        if (!isInitialized || !billingClient.isReady()) {
            reconnectAndExecute(call, () -> startPurchaseInternal(call));
            return;
        }
        startPurchaseInternal(call);
    }

    private void startPurchaseInternal(PluginCall call) {
        String product_id = call.getString("product_id");
        String email_address = call.getString("email_address");

        if (Utils.isEmpty(product_id)) {
            call.reject("Missing product_id parameter");
            return;
        }

        if (billingClient == null) {
            call.reject("Billing client not initialized");
            return;
        }

        // Replace any existing pending call
        if (pendingPurchaseCall != null) {
            Log.w(TAG, "Superseding existing pending purchase");
            pendingPurchaseCall.reject("Purchase superseded by new purchase request");
        }
        pendingPurchaseCall = call;

        // Query product details
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(product_id)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.e(TAG, "Failed to query product: " + billingResult.getDebugMessage());
                rejectPendingPurchase("Failed to query product: " + billingResult.getDebugMessage());
                return;
            }

            if (productDetailsList == null || productDetailsList.isEmpty()) {
                rejectPendingPurchase("Product not found: " + product_id);
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            if (productDetails.getSubscriptionOfferDetails() == null ||
                    productDetails.getSubscriptionOfferDetails().isEmpty()) {
                rejectPendingPurchase("No subscription offers available for: " + product_id);
                return;
            }

            launchBillingFlow(productDetails, email_address);
        });
    }

    private void launchBillingFlow(ProductDetails productDetails, String email_address) {
        ProductDetails.SubscriptionOfferDetails offerDetails = productDetails.getSubscriptionOfferDetails().get(0);

        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        productDetailsParamsList.add(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerDetails.getOfferToken())
                        .build());

        BillingFlowParams.Builder flowParamsBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList);

        // Set obfuscated account ID if email provided
        if (!Utils.isEmpty(email_address)) {
            String hashedAccountId = BillingUtils.hashAccountId(email_address);
            if (!Utils.isEmpty(hashedAccountId)) {
                flowParamsBuilder.setObfuscatedAccountId(hashedAccountId);
            }
        }

        BillingFlowParams flowParams = flowParamsBuilder.build();
        Activity activity = getActivity();

        if (activity == null) {
            rejectPendingPurchase("Activity not available");
            return;
        }

        BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to launch billing flow: " + launchResult.getDebugMessage());
            rejectPendingPurchase("Failed to launch billing flow: " + launchResult.getDebugMessage());
        }
    }

    private void rejectPendingPurchase(String message) {
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject(message);
            pendingPurchaseCall = null;
        }
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!isInitialized || !billingClient.isReady()) {
            reconnectAndExecute(call, () -> queryPurchasesInternal(call));
            return;
        }
        queryPurchasesInternal(call);
    }

    private void queryPurchasesInternal(PluginCall call) {
        String email_address = call.getString("email_address");
        if (Utils.isEmpty(email_address)) {
            JSObject result = new JSObject();
            result.put("purchases", new JSArray());
            call.resolve(result);
            return;
        }

        String hashed_account_id = BillingUtils.hashAccountId(email_address);
        if (Utils.isEmpty(hashed_account_id)) {
            JSObject result = new JSObject();
            result.put("purchases", new JSArray());
            call.resolve(result);
            return;
        }

        String subs = BillingClient.ProductType.SUBS;
        QueryPurchasesParams query_params = QueryPurchasesParams.newBuilder().setProductType(subs).build();
        billingClient.queryPurchasesAsync(
                query_params,
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        Log.e(TAG, "Query purchases failed: " + billingResult.getDebugMessage());
                        call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                        return;
                    }

                    Log.d(TAG, "Query returned " + (purchases != null ? purchases.size() : 0) + " total purchases");
                    List<Purchase> filtered_purchases = new ArrayList<>();
                    for (Purchase purchase : purchases) {
                        AccountIdentifiers identifiers = purchase.getAccountIdentifiers();
                        if (identifiers == null) {
                            continue;
                        }

                        String purchase_account_id = identifiers.getObfuscatedAccountId();
                        if (!hashed_account_id.equals(purchase_account_id)) {
                            continue;
                        }

                        filtered_purchases.add(purchase);

                    }

                    if (filtered_purchases.isEmpty()) {
                        JSObject result = new JSObject();
                        result.put("purchases", new JSArray());
                        call.resolve(result);
                        return;
                    }

                    queryPurchasesWithDetails(call, filtered_purchases);
                });

    }

    private void queryPurchasesWithDetails(PluginCall call, List<Purchase> purchases) {
        // Collect all product IDs from purchases
        List<Product> product_list = new ArrayList<>();

        for (Purchase purchase : purchases) {
            List<String> products = purchase.getProducts();
            if (products == null || products.isEmpty()) {
                continue;
            }

            String product_id = products.get(0);

            Builder productBuilder = QueryProductDetailsParams.Product.newBuilder();
            productBuilder.setProductId(product_id);
            productBuilder.setProductType(BillingClient.ProductType.SUBS);
            Product product = productBuilder.build();

            product_list.add(product);
        }

        // Query product details for all purchased products
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder();
        params.setProductList(product_list);
        params.build();

        billingClient.queryProductDetailsAsync(params, (productDetailsResult, productDetailsList) -> {
            JSArray purchasesArray = new JSArray();

            for (Purchase purchase : purchases) {
                List<String> products = purchase.getProducts();
                if (products == null || products.isEmpty()) {
                    continue;
                }

                // If purchase_state is not 1 (PURCHASED), skip adding product details
                if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
                    continue;
                }

                String product_id = products.get(0);

                JSObject purchaseObj = new JSObject();
                purchaseObj.put("product_id", product_id);
                purchaseObj.put("purchase_token", purchase.getPurchaseToken());
                purchaseObj.put("purchase_state", purchase.getPurchaseState());
                purchaseObj.put("acknowledged", purchase.isAcknowledged());
                purchaseObj.put("order_id", purchase.getOrderId());
                purchaseObj.put("purchase_time", purchase.getPurchaseTime());

                if (productDetailsList == null) {
                    purchasesArray.put(purchaseObj);
                    continue;
                }

                boolean details_found = productDetailsResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                if (!details_found) {
                    purchasesArray.put(purchaseObj);
                    continue;
                }

                // Add product details if available
                for (ProductDetails productDetails : productDetailsList) {
                    if (productDetails.getProductId().equals(product_id)) {
                        BillingUtils.addPricingToPurchase(purchaseObj, productDetails, product_id);
                        break;
                    }
                }

                purchasesArray.put(purchaseObj);
            }

            JSObject result = new JSObject();
            result.put("purchases", purchasesArray);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (!isInitialized || !billingClient.isReady()) {
            reconnectAndExecute(call, () -> acknowledgePurchaseInternal(call));
            return;
        }
        acknowledgePurchaseInternal(call);
    }

    private void acknowledgePurchaseInternal(PluginCall call) {
        String purchaseToken = call.getString("purchase_token");
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder();
        params.setPurchaseToken(purchaseToken);
        params.build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                call.resolve();
            } else {
                call.reject("Failed to acknowledge purchase: " + billingResult.getDebugMessage());
            }
        });
    }

    private void handlePurchase(Purchase purchase) {
        int purchaseState = purchase.getPurchaseState();

        if (purchaseState == Purchase.PurchaseState.PURCHASED) {
            resolvePurchase(purchase, false);
            acknowledgePurchaseIfNeeded(purchase);
        } else if (purchaseState == Purchase.PurchaseState.PENDING) {
            resolvePurchase(purchase, true);
        }
    }

    private void resolvePurchase(Purchase purchase, boolean isPending) {
        if (pendingPurchaseCall != null) {
            JSObject result = new JSObject();
            result.put("purchase_token", purchase.getPurchaseToken());
            result.put("product_id", purchase.getProducts().get(0));
            result.put("order_id", purchase.getOrderId());
            if (isPending) {
                result.put("pending", true);
            }
            pendingPurchaseCall.resolve(result);
            pendingPurchaseCall = null;
        }
    }

    private void acknowledgePurchaseIfNeeded(Purchase purchase) {
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();

            billingClient.acknowledgePurchase(params, billingResult -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    Log.e(TAG, "Failed to acknowledge purchase: " + billingResult.getDebugMessage());
                }
            });
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null && billingClient.isReady()) {
            billingClient.endConnection();
        }
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject("Plugin destroyed");
            pendingPurchaseCall = null;
        }
        super.handleOnDestroy();
    }
}
