import { PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { Capacitor } from "@capacitor/core";

interface BillingPlugin {
  initialize(): Promise<void>;
  queryProductDetails(options: { product_ids: string[] }): Promise<{ products: Product[] }>;
  startPurchase(options: { product_id: string }): Promise<{ purchase_token: string }>;
  queryPurchases(): Promise<{ purchases: Purchase[] }>;
  acknowledgePurchase(options: { purchase_token: string }): Promise<void>;
}

const BillingService = Capacitor.registerPlugin<BillingPlugin>("BillingService");

class Billing {
  getToken: (() => Promise<string>) | null = null;
  #initialized = $state(false);
  #is_plus_user = $state(false);
  #subscription_product: Product | null = $state(null);
  #current_purchase: Purchase | null = $state(null);

  readonly PRODUCT_ID = "doenit.plus";

  get initialized() {
    return this.#initialized;
  }

  get is_plus_user() {
    return this.#is_plus_user;
  }

  get subscription_product() {
    return this.#subscription_product;
  }

  get current_purchase() {
    return this.#current_purchase;
  }

  async init() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await BillingService.initialize();
      this.#initialized = true;

      // Laai produkte
      await this.loadProducts();

      // Kyk vir bestaande aankope
      await this.checkSubscriptionStatus();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie betaaldiens-initialisering voltooi nie: ${error_message}`);
    }
  }

  async loadProducts() {
    try {
      const { products } = await BillingService.queryProductDetails({
        product_ids: [this.PRODUCT_ID],
      });

      if (products.length > 0) {
        this.#subscription_product = products[0];
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie produkte laai nie: ${error_message}`);
    }
  }

  async checkSubscriptionStatus() {
    try {
      const { purchases } = await BillingService.queryPurchases();
      const active_purchase = purchases.find((p) => p.product_id === this.PRODUCT_ID && p.purchase_state === 1);

      if (active_purchase) {
        this.#current_purchase = active_purchase;
        this.#is_plus_user = true;

        // Bevestig aankoop as dit nog nie bevestig is nie
        if (!active_purchase.acknowledged) {
          await this.acknowledgePurchase(active_purchase.purchase_token);
        }

        // Stuur purchase token na backend vir verifikasie
        await this.verifyPurchaseWithBackend(active_purchase);
      } else {
        this.#is_plus_user = false;
        this.#current_purchase = null;
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie intekenstatus nagaan nie: ${error_message}`);
    }
  }

  async subscribe() {
    if (!this.#initialized) {
      alert("Betalingsdiens is nie geïnitialiseer nie.");
      return;
    }

    try {
      const result = await BillingService.startPurchase({
        product_id: this.PRODUCT_ID,
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

  private async verifyPurchaseWithBackend(purchase: Purchase) {
    try {
      const id_token = this.getToken ? await this.getToken() : null;
      if (!id_token) throw new Error("Gebruiker is nie geverifieer nie.");

      const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/verifySubscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${id_token}`,
        },
        body: JSON.stringify({
          purchase_token: purchase.purchase_token,
          product_id: purchase.product_id,
        }),
      });

      if (!response.ok) {
        const error_data = await response.json();
        throw new Error(error_data.error || "Iets het verkeerd geloop tydens verifikasie.");
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie aankoop met backend verifieer nie: ${error_message}`);
    }
  }
}

export const billing = new Billing();
