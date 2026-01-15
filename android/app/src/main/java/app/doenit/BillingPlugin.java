package doenit.app;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.*;
import com.android.billingclient.api.AccountIdentifiers;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsParams.Product;
import com.android.billingclient.api.QueryProductDetailsParams.Product.Builder;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.ProductDetails.SubscriptionOfferDetails;
import com.android.billingclient.api.ProductDetails.PricingPhase;

import static com.android.billingclient.api.BillingClient.BillingResponseCode;
import static com.android.billingclient.api.BillingClient.ProductType;
import static com.android.billingclient.api.Purchase.PurchaseState;

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
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 1000;
    
    private BillingClient billing_client;
    private PluginCall pending_purchase_call;

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            String msg = "Activity not available for billing";
            Log.e(TAG, msg);
            rejectWithError(call, "ACTIVITY_UNAVAILABLE", msg);
            return;
        }

        BillingClient.Builder builder = BillingClient.newBuilder(activity);
        builder.setListener(this::handlePurchaseUpdate);
        builder.enablePendingPurchases();
        billing_client = builder.build();

        if (billing_client == null) {
            String msg = "Failed to initialize billing client";
            rejectWithError(call, "INIT_FAILED", msg);
            return;
        }

        connectWithRetry(call, null, 0);
    }

    private void connectWithRetry(PluginCall call, Runnable on_success, int retry_count) {
        BillingClientStateListener listener = new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billing_result) {
                int code = billing_result.getResponseCode();
                
                if (code == BillingResponseCode.OK) {
                    if (on_success != null) {
                        on_success.run();
                        return;
                    }
                    call.resolve();
                    return;
                }
                
                boolean should_retry = retry_count < MAX_RETRIES;
                boolean can_retry = isRetryableError(code);
                
                if (!should_retry || !can_retry) {
                    String msg = "Failed to initialize billing: ";
                    msg += billing_result.getDebugMessage();
                    rejectWithError(call, "CONNECTION_FAILED", msg);
                    return;
                }
                
                int attempt = retry_count + 1;
                String log_msg = "Billing connection failed, retrying... ";
                log_msg += "(" + attempt + "/" + MAX_RETRIES + ")";
                Log.w(TAG, log_msg);
                
                Activity activity = getActivity();
                if (activity == null) {
                    return;
                }
                
                activity.runOnUiThread(() -> {
                    try {
                        long delay = RETRY_DELAY_MS * (retry_count + 1);
                        Thread.sleep(delay);
                        connectWithRetry(call, on_success, attempt);
                    } catch (InterruptedException e) {
                        String msg = "Failed to initialize billing: ";
                        msg += billing_result.getDebugMessage();
                        rejectWithError(call, "CONNECTION_FAILED", msg);
                    }
                });
            }

            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        };
        
        billing_client.startConnection(listener);
    }

    private boolean isRetryableError(int code) {
        if (code == BillingResponseCode.SERVICE_UNAVAILABLE) {
            return true;
        }
        if (code == BillingResponseCode.SERVICE_DISCONNECTED) {
            return true;
        }
        if (code == BillingResponseCode.ERROR) {
            return true;
        }
        return false;
    }

    private void rejectWithError(PluginCall call, String error_code, String message) {
        if (call == null) {
            return;
        }
        
        JSObject error = new JSObject();
        error.put("code", error_code);
        error.put("message", message);
        call.reject(message, error);
    }

    private void handlePurchaseUpdate(BillingResult billing_result, List<Purchase> purchases) {
        int response_code = billing_result.getResponseCode();

        if (response_code == BillingResponseCode.USER_CANCELED) {
            handleUserCancelled();
            return;
        }

        if (response_code != BillingResponseCode.OK) {
            handlePurchaseError(billing_result, response_code);
            return;
        }

        if (purchases == null) {
            return;
        }

        int count = purchases.size();
        String msg = "Purchase successful, processing " + count + " purchase(s)";
        Log.d(TAG, msg);

        for (Purchase purchase : purchases) {
            processPurchase(purchase);
        }
    }

    private void handleUserCancelled() {
        Log.d(TAG, "User cancelled purchase");
        
        if (pending_purchase_call == null) {
            return;
        }

        String msg = "User cancelled the purchase";
        rejectWithError(pending_purchase_call, "USER_CANCELED", msg);
        clearPendingPurchaseCall();
    }

    private void handlePurchaseError(BillingResult billing_result, int response_code) {
        String msg = "Purchase failed: " + billing_result.getDebugMessage();
        Log.e(TAG, msg);

        if (pending_purchase_call == null) {
            return;
        }

        String error_code = String.valueOf(response_code);
        String error_msg = billing_result.getDebugMessage();
        rejectWithError(pending_purchase_call, error_code, error_msg);
        clearPendingPurchaseCall();
    }

    private void clearPendingPurchaseCall() {
        pending_purchase_call = null;
    }

    private void processPurchase(Purchase purchase) {
        int purchase_state = purchase.getPurchaseState();
        boolean is_pending = purchase_state == PurchaseState.PENDING;

        if (pending_purchase_call != null) {
            JSObject result = new JSObject();
            String token = purchase.getPurchaseToken();
            List<String> products = purchase.getProducts();
            String product_id = products.get(0);
            String order_id = purchase.getOrderId();
            
            result.put("purchase_token", token);
            result.put("product_id", product_id);
            result.put("order_id", order_id);
            result.put("pending", is_pending);
            
            pending_purchase_call.resolve(result);
            clearPendingPurchaseCall();
        }

        if (is_pending) {
            return;
        }

        if (purchase_state != PurchaseState.PURCHASED) {
            return;
        }

        if (purchase.isAcknowledged()) {
            return;
        }

        acknowledgePurchaseInternal(purchase);
    }

    private void acknowledgePurchaseInternal(Purchase purchase) {
        String token = purchase.getPurchaseToken();
        
        AcknowledgePurchaseParams.Builder builder = AcknowledgePurchaseParams.newBuilder();
        builder.setPurchaseToken(token);
        AcknowledgePurchaseParams params = builder.build();

        billing_client.acknowledgePurchase(params, result -> {
            int code = result.getResponseCode();
            
            if (code == BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged successfully");
                return;
            }

            String msg = "Failed to acknowledge purchase: ";
            msg += result.getDebugMessage();
            Log.e(TAG, msg);
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        if (!billing_client.isReady()) {
            Runnable retry = () -> queryProducts(call);
            connectWithRetry(call, retry, 0);
            return;
        }

        JSArray product_ids = call.getArray("product_ids");
        if (product_ids == null) {
            String msg = "Missing product_ids parameter";
            rejectWithError(call, "MISSING_PARAM", msg);
            return;
        }

        List<Product> product_list = buildProductList(call, product_ids);
        if (product_list == null) {
            return;
        }

        QueryProductDetailsParams.Builder builder = QueryProductDetailsParams.newBuilder();
        builder.setProductList(product_list);
        QueryProductDetailsParams params = builder.build();

        billing_client.queryProductDetailsAsync(
            params,
            (result, details_list) -> {
                handleProductDetailsResponse(call, result, details_list);
            });
    }

    private List<Product> buildProductList(PluginCall call,JSArray product_ids) {
        List<Product> product_list = new ArrayList<>();

        try {
            int count = product_ids.length();
            for (int i = 0; i < count; i++) {
                String product_id = product_ids.getString(i);
                Product product = createProduct(product_id);
                product_list.add(product);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Invalid product IDs", e);
            String msg = "Invalid product IDs: " + e.getMessage();
            rejectWithError(call, "INVALID_PARAMS", msg);
            return null;
        }

        return product_list;
    }

    private Product createProduct(String product_id) {
        Builder builder = QueryProductDetailsParams.Product.newBuilder();
        builder.setProductId(product_id);
        builder.setProductType(ProductType.SUBS);
        return builder.build();
    }

    private void handleProductDetailsResponse(PluginCall call, BillingResult billing_result, List<ProductDetails> product_details_list) {
        int response_code = billing_result.getResponseCode();
        if (response_code != BillingResponseCode.OK) {
            String msg = "Failed to query products: ";
            msg += billing_result.getDebugMessage();
            Log.e(TAG, msg);
            String code = String.valueOf(response_code);
            rejectWithError(call, code, msg);
            return;
        }

        if (product_details_list == null) {
            String msg = "No product details returned";
            rejectWithError(call, "NO_PRODUCTS", msg);
            return;
        }

        JSArray products = new JSArray();
        for (ProductDetails details : product_details_list) {
            JSObject product = buildProductObject(details);
            if (product == null) {
                continue;
            }
            products.put(product);
        }

        JSObject result = new JSObject();
        result.put("products", products);
        call.resolve(result);
    }

    private JSObject buildProductObject(ProductDetails details) {
        List<SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            return null;
        }

        SubscriptionOfferDetails offer = offers.get(0);
        List<PricingPhase> phases = 
            offer.getPricingPhases().getPricingPhaseList();

        if (phases == null || phases.isEmpty()) {
            return null;
        }

        JSObject product = new JSObject();
        String product_id = details.getProductId();
        String title = details.getTitle();
        String description = details.getDescription();
        
        product.put("product_id", product_id);
        product.put("title", title);
        product.put("description", description);

        PricingPhase phase = phases.get(0);
        String price = phase.getFormattedPrice();
        long price_micros = phase.getPriceAmountMicros();
        String currency = phase.getPriceCurrencyCode();
        
        product.put("price", price);
        product.put("price_currency_code", currency);

        return product;
    }

    @PluginMethod
    public void startPurchase(PluginCall call) {
        if (!billing_client.isReady()) {
            Runnable retry = () -> startPurchase(call);
            connectWithRetry(call, retry, 0);
            return;
        }

        String product_id = call.getString("product_id");
        String email_address = call.getString("email_address");

        if (Utils.isEmpty(product_id)) {
            String msg = "Missing product_id parameter";
            rejectWithError(call, "MISSING_PARAM", msg);
            return;
        }

        if (billing_client == null) {
            String msg = "Billing client not initialized";
            rejectWithError(call, "NOT_INITIALIZED", msg);
            return;
        }

        pending_purchase_call = call;

        List<Product> product_list = new ArrayList<>();
        Product product = createProduct(product_id);
        product_list.add(product);

        QueryProductDetailsParams.Builder builder = QueryProductDetailsParams.newBuilder();
        builder.setProductList(product_list);
        QueryProductDetailsParams params = builder.build();

        billing_client.queryProductDetailsAsync(
            params,
            (result, details_list) -> {
                handleStartPurchaseResponse(
                    result,
                    details_list,
                    product_id,
                    email_address);
            });
    }

    private void handleStartPurchaseResponse(BillingResult billing_result, List<ProductDetails> product_details_list, String product_id, String email_address) {
        int response_code = billing_result.getResponseCode();
        
        if (response_code != BillingResponseCode.OK) {
            String msg = "Failed to query product: ";
            msg += billing_result.getDebugMessage();
            Log.e(TAG, msg);
            rejectPendingPurchase("QUERY_FAILED", msg);
            return;
        }

        if (product_details_list == null || product_details_list.isEmpty()) {
            String msg = "Product not found: " + product_id;
            rejectPendingPurchase("PRODUCT_NOT_FOUND", msg);
            return;
        }

        ProductDetails details = product_details_list.get(0);
        List<SubscriptionOfferDetails> offers = 
            details.getSubscriptionOfferDetails();

        if (offers == null || offers.isEmpty()) {
            String msg = "No subscription offers available for: " + product_id;
            rejectPendingPurchase("NO_OFFERS", msg);
            return;
        }

        SubscriptionOfferDetails offer = offers.get(0);
        launchBillingFlow(details, offer, email_address);
    }

    private void launchBillingFlow(ProductDetails details, SubscriptionOfferDetails offer, String email_address) {
        String offer_token = offer.getOfferToken();
        
        BillingFlowParams.ProductDetailsParams params = 
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offer_token)
                .build();

        List<BillingFlowParams.ProductDetailsParams> params_list = 
            new ArrayList<>();
        params_list.add(params);

        BillingFlowParams.Builder builder = BillingFlowParams.newBuilder();
        builder.setProductDetailsParamsList(params_list);

        if (!Utils.isEmpty(email_address)) {
            String hashed = Utils.hashAccountId(email_address);
            if (!Utils.isEmpty(hashed)) {
                builder.setObfuscatedAccountId(hashed);
            }
        }

        BillingFlowParams flow_params = builder.build();
        Activity activity = getActivity();

        if (activity == null) {
            String msg = "Activity not available";
            rejectPendingPurchase("ACTIVITY_UNAVAILABLE", msg);
            return;
        }

        BillingResult result = 
            billing_client.launchBillingFlow(activity, flow_params);
        int code = result.getResponseCode();

        if (code == BillingResponseCode.OK) {
            return;
        }

        String msg = "Failed to launch billing flow: ";
        msg += result.getDebugMessage();
        Log.e(TAG, msg);
        rejectPendingPurchase("LAUNCH_FAILED", msg);
    }

    private void rejectPendingPurchase(String error_code, String message) {
        if (pending_purchase_call == null) {
            return;
        }
        
        rejectWithError(pending_purchase_call, error_code, message);
        clearPendingPurchaseCall();
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!billing_client.isReady()) {
            Runnable retry = () -> queryPurchases(call);
            connectWithRetry(call, retry, 0);
            return;
        }

        String email_address = call.getString("email_address");
        if (Utils.isEmpty(email_address)) {
            resolveEmptyPurchases(call);
            return;
        }

        String hashed_account_id = Utils.hashAccountId(email_address);
        if (Utils.isEmpty(hashed_account_id)) {
            resolveEmptyPurchases(call);
            return;
        }

        QueryPurchasesParams.Builder builder = QueryPurchasesParams.newBuilder();
        builder.setProductType(ProductType.SUBS);
        QueryPurchasesParams params = builder.build();

        billing_client.queryPurchasesAsync(
            params,
            (result, purchases) -> {
                handleQueryPurchasesResponse(
                    call,
                    result,
                    purchases,
                    hashed_account_id);
            });
    }

    private void resolveEmptyPurchases(PluginCall call) {
        JSObject result = new JSObject();
        result.put("purchases", new JSArray());
        call.resolve(result);
    }

    private void handleQueryPurchasesResponse(PluginCall call, BillingResult billing_result, List<Purchase> purchases, String hashed_account_id) {
        int response_code = billing_result.getResponseCode();
        
        if (response_code != BillingResponseCode.OK) {
            String msg = "Query purchases failed: ";
            msg += billing_result.getDebugMessage();
            Log.e(TAG, msg);
            String error_msg = "Failed to query purchases: " + msg;
            String code = String.valueOf(response_code);
            rejectWithError(call, code, error_msg);
            return;
        }

        int total = purchases != null ? purchases.size() : 0;
        Log.d(TAG, "Query returned " + total + " total purchases");

        List<Purchase> filtered = filterPurchasesByAccount(purchases, hashed_account_id);

        if (filtered.isEmpty()) {
            resolveEmptyPurchases(call);
            return;
        }

        List<Product> product_list = buildProductListFromPurchases(filtered);

        QueryProductDetailsParams.Builder builder = QueryProductDetailsParams.newBuilder();
        builder.setProductList(product_list);
        QueryProductDetailsParams params = builder.build();

        billing_client.queryProductDetailsAsync(
            params,
            (details_result, details_list) -> {
                resolvePurchasesWithDetails(
                    call,
                    filtered,
                    details_result,
                    details_list);
            });
    }

    private List<Purchase> filterPurchasesByAccount(List<Purchase> purchases, String hashed_account_id) {
        List<Purchase> filtered = new ArrayList<>();

        if (purchases == null) {
            return filtered;
        }

        for (Purchase purchase : purchases) {
            AccountIdentifiers identifiers = 
                purchase.getAccountIdentifiers();
            
            if (identifiers == null) {
                continue;
            }

            String purchase_account_id = identifiers.getObfuscatedAccountId();
            if (!hashed_account_id.equals(purchase_account_id)) {
                continue;
            }
            
            filtered.add(purchase);
        }

        return filtered;
    }

    private List<Product> buildProductListFromPurchases(List<Purchase> purchases) {
        List<Product> product_list = new ArrayList<>();

        for (Purchase purchase : purchases) {
            List<String> products = purchase.getProducts();
            
            if (products == null || products.isEmpty()) {
                continue;
            }

            String product_id = products.get(0);
            Product product = createProduct(product_id);
            product_list.add(product);
        }

        return product_list;
    }

    private void resolvePurchasesWithDetails(PluginCall call, List<Purchase> purchases, BillingResult details_result, List<ProductDetails> details_list) {
        JSArray purchases_array = new JSArray();

        for (Purchase purchase : purchases) {
            JSObject purchase_obj = buildPurchaseObject(
                purchase,
                details_result,
                details_list);

            if (purchase_obj == null) {
                continue;
            }
            
            purchases_array.put(purchase_obj);
        }

        JSObject result = new JSObject();
        result.put("purchases", purchases_array);
        call.resolve(result);
    }

    private JSObject buildPurchaseObject(Purchase purchase, BillingResult details_result, List<ProductDetails> details_list) {
        List<String> products = purchase.getProducts();
        if (products == null || products.isEmpty()) {
            return null;
        }

        int purchase_state = purchase.getPurchaseState();
        if (purchase_state != PurchaseState.PURCHASED) {
            return null;
        }

        String product_id = products.get(0);
        String purchase_token = purchase.getPurchaseToken();
        boolean acknowledged = purchase.isAcknowledged();
        String order_id = purchase.getOrderId();
        long purchase_time = purchase.getPurchaseTime();

        JSObject obj = new JSObject();
        obj.put("product_id", product_id);
        obj.put("purchase_token", purchase_token);
        obj.put("acknowledged", acknowledged);
        obj.put("order_id", order_id);
        obj.put("purchase_time", purchase_time);

        if (details_list == null) {
            return obj;
        }

        int code = details_result.getResponseCode();
        if (code != BillingResponseCode.OK) {
            return obj;
        }

        for (ProductDetails details : details_list) {
            String details_product_id = details.getProductId();
            
            if (!details_product_id.equals(product_id)) {
                continue;
            }

            String title = details.getTitle();
            String description = details.getDescription();
            obj.put("title", title);
            obj.put("description", description);

            List<SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
            
            if (offers == null || offers.isEmpty()) {
                return null;
            }

            SubscriptionOfferDetails offer = offers.get(0);
            List<PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            
            if (phases == null || phases.isEmpty()) {
                return null;
            }

            PricingPhase phase = phases.get(0);
            String price = phase.getFormattedPrice();
            long price_micros = phase.getPriceAmountMicros();
            String currency = phase.getPriceCurrencyCode();
            
            obj.put("price", price);
            obj.put("price_currency_code", currency);

            break;
        }

        return obj;
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (!billing_client.isReady()) {
            Runnable retry = () -> acknowledgePurchase(call);
            connectWithRetry(call, retry, 0);
            return;
        }

        String purchase_token = call.getString("purchase_token");
        
        if (Utils.isEmpty(purchase_token)) {
            String msg = "Missing purchase_token parameter";
            rejectWithError(call, "MISSING_PARAM", msg);
            return;
        }

        AcknowledgePurchaseParams.Builder builder = AcknowledgePurchaseParams.newBuilder();
        builder.setPurchaseToken(purchase_token);
        AcknowledgePurchaseParams params = builder.build();

        billing_client.acknowledgePurchase(params, result -> {
            int code = result.getResponseCode();
            
            if (code == BillingResponseCode.OK) {
                call.resolve();
                return;
            }

            String msg = "Failed to acknowledge purchase: ";
            msg += result.getDebugMessage();
            String error_code = String.valueOf(code);
            rejectWithError(call, error_code, msg);
        });
    }

    @Override
    protected void handleOnDestroy() {
        clearPendingPurchaseCall();
        
        if (billing_client != null && billing_client.isReady()) {
            billing_client.endConnection();
        }

        super.handleOnDestroy();
    }
}
