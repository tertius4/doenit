import { PUBLIC_APP_ID, PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { user } from "$lib/base/user.svelte";
import { Capacitor } from "@capacitor/core";
import { retry, wait } from "$lib";
import { Alert } from "./alert";

interface BillingPlugin {
  initialize(): Promise<void>;
  queryProductDetails(options: { product_ids: string[] }): Promise<{ products: Product[] }>;
  startPurchase(options: { product_id: string; email_address: string }): Promise<{ purchase_token: string }>;
  queryPurchases(options: { email_address: string }): Promise<{ purchases: Purchase[] }>;
  acknowledgePurchase(options: { purchase_token: string }): Promise<void>;
}

const BillingService = Capacitor.registerPlugin<BillingPlugin>("BillingService");

class Billing {
  getToken: (() => Promise<string>) | null = null;
  #initialized = $state(false);
  #products: Product[] = $state([]);
  #purchases: Purchase[] = $state([]);

  is_plus_user = $state(false);

  get initialized() {
    return this.#initialized;
  }

  get products() {
    return this.#products;
  }

  get purchases() {
    return this.#purchases;
  }

  async init() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await BillingService.initialize();
      this.#initialized = true;

      // Kyk vir bestaande aankope
      await this.checkSubscriptionStatus();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Kon nie betaaldiens-initialisering voltooi nie: ${error_message}`);
    }
  }

  async loadProducts(): Promise<Product[]> {
    try {
      const queryProducts = async () => {
        const result = await BillingService.queryProductDetails({
          product_ids: ["doenit.plus", "doenit.testing"],
        });

        const products = result.products ?? [];

        // Haal die app naam uit die title van die produk uit.
        for (let i = 0; i < products.length; i++) {
          products[i].title = products[i].title.replace(/\(.*\)$/, "");
        }

        return products;
      };

      return retry(queryProducts, 3, 1000, "loadProducts");
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Kon nie produkte laai nie: ${error_message}`);
      return [];
    }
  }

  async checkSubscriptionStatus() {
    try {
      const queryPurchases = () => BillingService.queryPurchases({ email_address: user.email_address || "" });
      const { purchases } = await retry(queryPurchases, 3, 1000, "checkSubscriptionStatus");

      // Clear previous state
      this.#purchases = [];

      // Process each active purchase
      for (const purchase of purchases) {
        if (!purchase.acknowledged) {
          await this.acknowledgePurchase(purchase.purchase_token);
        }

        // Verify purchase with backend
        const verificationResult = await this.verifyPurchaseWithBackend(purchase);
        if (purchase.product_id === "doenit.plus" && verificationResult.isValid) {
          this.is_plus_user = verificationResult.isValid;
        }

        purchase.title = purchase.title?.replace(/\(Doenit–Afrikaanse ToDo\/Taaklys\)$/, "");
        this.#purchases.push(purchase);
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Kon nie intekenstatus nagaan nie: ${error_message}`);
    }
  }

  async subscribe(product_id: string) {
    if (!this.#initialized) {
      alert("Betalingsdiens is nie geïnitialiseer nie.");
      return;
    }

    try {
      const result = await BillingService.startPurchase({
        email_address: user.email_address ?? "",
        product_id: product_id,
      });

      // Check if result and purchase_token exist
      if (!result || !result.purchase_token) {
        throw new Error("Purchase failed: No purchase token returned");
      }

      const { purchase_token } = result;

      // Bevestig die aankoop
      await this.acknowledgePurchase(purchase_token);
      // Herlaai subscription status
      await this.checkSubscriptionStatus();
    } catch (error: any) {
      const error_message = error instanceof Error ? error.message : String(error);
      if (error_message !== "User cancelled") {
        alert(`Kon nie 'subscribe' nie: ${error_message}`);
      }
    }
  }

  private async acknowledgePurchase(purchase_token: string) {
    try {
      await BillingService.acknowledgePurchase({ purchase_token });
    } catch (error) {
      console.error("Failed to acknowledge purchase:", error);
    }
  }

  private async verifyPurchaseWithBackend(
    purchase: Purchase
  ): Promise<{ isValid: boolean; details: SubscriptionDetails | null }> {
    try {
      const id_token = this.getToken ? await this.getToken() : null;
      if (!id_token) throw new Error("Gebruiker is nie geverifieer nie.");

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

  async queryPurchases(): Promise<{ purchases: Purchase[] }> {
    if (!Capacitor.isNativePlatform()) {
      return { purchases: [] };
    }

    try {
      const { purchases } = await BillingService.queryPurchases({
        email_address: user.email_address ?? "",
      });

      for (let i = 0; i < purchases.length; i++) {
        purchases[i].title = purchases[i].title?.replace(/\(Doenit–Afrikaanse ToDo\/Taaklys\)$/, "");
      }

      return { purchases };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error("Failed to query purchases:", error_message);
      throw error;
    }
  }
}

export const billing = new Billing();
