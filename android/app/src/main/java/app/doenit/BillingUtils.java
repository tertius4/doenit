package doenit.app;

import android.util.Log;
import com.android.billingclient.api.ProductDetails;
import com.getcapacitor.JSObject;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Utility class for billing-related operations.
 */
public class BillingUtils {
    private static final String TAG = "[Doenit BillingUtils]";

    /**
     * Hashes a string using SHA-256 and returns the first 64 characters.
     * Used for obfuscating account IDs in Google Play billing.
     * 
     * @param input The string to hash
     * @return The hashed string truncated to 64 characters, or null if hashing
     *         fails
     */
    public static String hashAccountId(String input) {
        if (Utils.isEmpty(input)) {
            return null;
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();

            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            // Truncate to 64 characters (Google's max for obfuscatedAccountId)
            return hexString.substring(0, Math.min(64, hexString.length()));
        } catch (NoSuchAlgorithmException e) {
            Log.e(TAG, "Failed to hash account ID", e);
            return null;
        }
    }

    /**
     * Converts ProductDetails to a JSObject for JavaScript consumption.
     * 
     * @param productDetails The product details from Google Play
     * @return JSObject containing product information
     */
    public static JSObject productDetailsToJSObject(ProductDetails productDetails) {
        JSObject product = new JSObject();
        product.put("product_id", productDetails.getProductId());
        product.put("title", productDetails.getTitle());
        product.put("description", productDetails.getDescription());

        if (productDetails.getSubscriptionOfferDetails() != null
                && !productDetails.getSubscriptionOfferDetails().isEmpty()) {
            ProductDetails.SubscriptionOfferDetails offerDetails = productDetails.getSubscriptionOfferDetails().get(0);
            ProductDetails.PricingPhase pricingPhase = offerDetails.getPricingPhases().getPricingPhaseList().get(0);

            product.put("price", pricingPhase.getFormattedPrice());
            product.put("price_amount_micros", pricingPhase.getPriceAmountMicros());
            product.put("price_currency_code", pricingPhase.getPriceCurrencyCode());
        }

        return product;
    }

    /**
     * Adds product pricing information to a purchase object.
     * 
     * @param purchaseObj    The purchase JSObject to add pricing to
     * @param productDetails The product details containing pricing info
     * @param productId      The product ID to match
     */
    public static void addPricingToPurchase(JSObject purchaseObj, ProductDetails productDetails, String productId) {
        if (!productDetails.getProductId().equals(productId)) {
            return;
        }

        purchaseObj.put("title", productDetails.getTitle());
        purchaseObj.put("description", productDetails.getDescription());

        if (productDetails.getSubscriptionOfferDetails() != null
                && !productDetails.getSubscriptionOfferDetails().isEmpty()) {
            ProductDetails.SubscriptionOfferDetails offerDetails = productDetails.getSubscriptionOfferDetails().get(0);
            ProductDetails.PricingPhase pricingPhase = offerDetails.getPricingPhases().getPricingPhaseList().get(0);

            purchaseObj.put("price", pricingPhase.getFormattedPrice());
            purchaseObj.put("price_amount_micros", pricingPhase.getPriceAmountMicros());
            purchaseObj.put("price_currency_code", pricingPhase.getPriceCurrencyCode());
        }
    }
}
