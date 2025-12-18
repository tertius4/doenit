import { PUBLIC_APP_ID, PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { user } from "$lib/base/user.svelte";
import { Capacitor } from "@capacitor/core";
import { Crown, Users, DownloadCloud } from "$lib/icon";

interface SubscriptionDetails {
  expiryTime: Date | null;
  autoRenewing: boolean;
  isCancelled: boolean;
  cancelReason?: number;
}

interface BillingPlugin {
  initialize(): Promise<void>;
  queryProductDetails(options: { product_ids: string[] }): Promise<{ products: Product[] }>;
  startPurchase(options: { product_id: string; email_address: string }): Promise<{ purchase_token: string }>;
  queryPurchases(): Promise<{ purchases: Purchase[] }>;
  acknowledgePurchase(options: { purchase_token: string }): Promise<void>;
}

interface ProductConfig {
  id: string;
  name: string;
  icon: any;
  title_key: string;
  description_key: string;
  benefits: Array<{
    icon: any;
    title_key: string;
    description_key: string;
  }>;
}

const BillingService = Capacitor.registerPlugin<BillingPlugin>("BillingService");

// Produk Konfigurasies - Sentraal gestoor in billing service
export const PRODUCTS_CONFIG: Record<string, ProductConfig> = {
  "doenit.plus": {
    id: "doenit.plus",
    name: "Doenit Plus",
    icon: Crown,
    title_key: "plus_plan",
    description_key: "unlock_premium_features",
    benefits: [
      {
        icon: Users,
        title_key: "benefit_rooms",
        description_key: "benefit_rooms_desc",
      },
      {
        icon: DownloadCloud,
        title_key: "benefit_backup",
        description_key: "benefit_backup_desc",
      },
    ],
  },
  // Toekomstige produkte kan hier bygevoeg word
};

class Billing {
  getToken: (() => Promise<string>) | null = null;
  #initialized = $state(false);
  #is_plus_user = $state(false);
  #subscription_product: Product | null = $state(null);
  #current_purchase: Purchase | null = $state(null);
  #subscription_details: SubscriptionDetails | null = $state(null);

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

  get subscription_details() {
    return this.#subscription_details;
  }

  // Haal produk konfigurasie vir 'n spesifieke produk
  getProductConfig(product_id: string): ProductConfig | null {
    return PRODUCTS_CONFIG[product_id] || null;
  }

  // Haal alle produk konfigurasies
  getAllProductConfigs(): Record<string, ProductConfig> {
    return PRODUCTS_CONFIG;
  }

  async init() {
    if (!Capacitor.isNativePlatform()) return;
    if (!navigator.onLine) return;

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
        // Bevestig aankoop as dit nog nie bevestig is nie
        if (!active_purchase.acknowledged) {
          await this.acknowledgePurchase(active_purchase.purchase_token);
        }

        // Stuur purchase token na backend vir verifikasie
        // Backend sal kyk of die purchase se obfuscatedAccountId ooreenstem met user.email_address
        const verificationResult = await this.verifyPurchaseWithBackend(active_purchase);

        if (verificationResult.isValid) {
          this.#current_purchase = active_purchase;
          this.#is_plus_user = true;
          this.#subscription_details = verificationResult.details;
        } else {
          this.#is_plus_user = false;
          this.#current_purchase = null;
          this.#subscription_details = null;
        }
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
        email_address: user.email_address ?? "",
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

  async reactivate() {
    // Reactivating is done through Google Play Store
    // Just refresh the subscription status to check if user has reactivated
    await this.checkSubscriptionStatus();
  }
}

export const billing = new Billing();
