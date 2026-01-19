import { PUBLIC_APP_ID, PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { Alert } from "$lib/core/alert";
import { Capacitor } from "@capacitor/core";
import { createContext } from "svelte";
import { user } from "$lib/base/user.svelte";

/**
 * For the Google Play Billing products.
 */
interface BillingProduct {
  product_id: string;
  title: string;
  description: string;
  price: string;
  price_currency_code: string;
}

interface BillingPlugin {
  initialize(): Promise<void>;
  queryProducts(options: { product_ids: string[] }): Promise<{ products: BillingProduct[] }>;
  startPurchase(options: { product_id: string; account_id: string }): Promise<{ purchase_token: string }>;
  queryPurchases(options: { account_id: string }): Promise<{ purchases: Purchase[] }>;
  acknowledgePurchase(options: { purchase_token: string }): Promise<void>;
}

const BillingService = Capacitor.registerPlugin<BillingPlugin>("BillingService");

export class BillingContext {
  #is_initialized = $state(false);

  async subscribe(product_id: string) {
    try {
      if (!user.uid) throw new Error("Gebruiker nie aangemeld nie");
      const result = await BillingService.startPurchase({
        account_id: user.uid,
        product_id: product_id,
      });

      // Check if result and purchase_token exist
      if (!result || !result.purchase_token) {
        throw new Error("Purchase failed: No purchase token returned");
      }

      const { purchase_token } = result;

      // Bevestig die aankoop
      await BillingService.acknowledgePurchase({ purchase_token });
      await this.refresh();
    } catch (error: any) {
      const error_message = error instanceof Error ? error.message : String(error);
      if (error_message !== "User cancelled") {
        alert(`Kon nie inteken nie: ${error_message}`);
      }
    }
  }

  async refresh() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      if (!user.uid) throw new Error("Gebruiker nie aangemeld nie");
      if (!this.#is_initialized) {
        await BillingService.initialize();
        this.#is_initialized = true;
      }

      let products: Product[] = [];
      const product_ids = user.is_developer ? ["doenit.plus", "doenit.testing"] : ["doenit.plus"];
      const { products: queried_products } = await BillingService.queryProducts({ product_ids });

      // Haal die app naam uit die title van die produk uit.
      for (let i = 0; i < queried_products.length; i++) {
        const product = queried_products[i];

        products.push({
          product_id: product.product_id,
          title: product.title.replace(/\(.*\)$/, ""),
          description: product.description,
          price: product.price,
          price_currency_code: product.price_currency_code,
          is_active: false,
          is_canceled: false,
        });
      }

      const { purchases } = await BillingService.queryPurchases({
        account_id: user.uid,
      });
      for (const purchase of purchases) {
        purchase.title = purchase.title.replace(/\(.*\)$/, "");

        if (!purchase.acknowledged) {
          await BillingService.acknowledgePurchase({ purchase_token: purchase.purchase_token });
        }

        const current_product = user.products.find((p) => p.product_id === purchase.product_id);
        purchase.verified_at = current_product?.verified_at;

        let isValid = null;
        let details: SubscriptionDetails | null = null;
        let verified_at = null;
        const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
        // Verifieer die aankoop met die backend, as dit langer as 'n week gelede was.

        // Could not (yet) sync with google.
        if (!user.getToken) return;

        if (!purchase.verified_at || Date.now() - +new Date(purchase.verified_at) > WEEK_IN_MS) {
          const result = await verifyPurchaseWithBackend(purchase);
          verified_at = new Date().toISOString();
          isValid = result.isValid;
          details = result.details;
        }

        const index = products.findIndex((p) => p.product_id === purchase.product_id);
        if (index !== -1) {
          products[index].is_active = isValid ?? current_product?.is_active ?? false;
          products[index].is_canceled = details?.isCancelled ?? current_product?.is_canceled ?? false;
          products[index].verified_at = verified_at ?? current_product?.verified_at;
          products[index].expiry_date = details?.expiryTime ?? current_product?.expiry_date;
        } else {
          products.push({
            product_id: purchase.product_id,
            title: purchase.title || "",
            description: purchase.description || "",
            price: purchase.price || "",
            price_currency_code: purchase.price_currency_code || "",
            is_active: isValid ?? current_product?.is_active ?? false,
            is_canceled: details?.isCancelled ?? current_product?.is_canceled ?? false,
            verified_at: verified_at ?? current_product?.verified_at,
            expiry_date: details?.expiryTime ?? current_product?.expiry_date,
          });
        }
      }

      user.products = products;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Kon nie betaaldiens-initialisering voltooi nie: ${error_message}`);
    }
  }
}

export const [getBillingContext, setBillingContext] = createContext<BillingContext>();

async function verifyPurchaseWithBackend(
  purchase: Purchase
): Promise<{ isValid: boolean; details: SubscriptionDetails | null }> {
  try {
    const id_token = user.getToken ? await user.getToken() : null;
    if (!id_token) return { isValid: false, details: null };

    const package_name = PUBLIC_APP_ID ?? "doenit.app";

    const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/verifySubscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${id_token}`,
      },
      body: JSON.stringify({
        purchase_token: purchase.purchase_token,
        product_id: purchase.product_id,
        package_name: package_name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If valid is explicitly false, don't throw error - just return false
      if (data.valid === false) {
        console.log("Purchase verification failed:", data.error);
        return { isValid: false, details: null };
      }
      throw new Error(data.error || "Iets het verkeerd geloop tydens verifikasie.");
    }

    const isValid = data.valid === true || data.success === true;
    const details: SubscriptionDetails | null =
      isValid && data.subscription
        ? {
            expiryTime: data.subscription.expiryTime ? new Date(data.subscription.expiryTime) : null,
            autoRenewing: data.subscription.autoRenewing || false,
            isCancelled: data.subscription.isCancelled || false,
            cancelReason: data.subscription.cancelReason,
          }
        : null;

    return { isValid, details };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    if (error_message === "User not found") return { isValid: false, details: null };
    if (error_message === "Failed to fetch") return { isValid: false, details: null };

    alert(`Kon nie aankoop met backend verifieer nie: ${error_message}`);
    return { isValid: false, details: null };
  }
}
