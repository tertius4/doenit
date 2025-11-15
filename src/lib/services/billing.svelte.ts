import { PUBLIC_FIREBASE_FUNCTIONS_URL } from "$env/static/public";
import { t } from "$lib/services/language.svelte";
import { Capacitor } from "@capacitor/core";
import user, { signIn } from "$lib/core/user.svelte";
import { Alert } from "$lib/core/alert";

interface BillingPlugin {
  initialize(): Promise<void>;
  queryProductDetails(options: { product_ids: string[] }): Promise<{ products: Product[] }>;
  startPurchase(options: { product_id: string }): Promise<{ purchase_token: string }>;
  queryPurchases(): Promise<{ purchases: Purchase[] }>;
  acknowledgePurchase(options: { purchase_token: string }): Promise<void>;
}

const BillingService = Capacitor.registerPlugin<BillingPlugin>("BillingService");

class Billing {
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
    if (!Capacitor.isNativePlatform()) {
      console.warn("Billing only works on native platforms");
      return;
    }

    try {
      await BillingService.initialize();
      this.#initialized = true;

      // Laai produkte
      await this.loadProducts();

      // Kyk vir bestaande aankope
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error("Failed to initialize billing:", error);
      Alert.error(t("billing_init_error"));
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
      console.error("Failed to load products:", error);
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
      Alert.error(`${t("billing_check_error")}: ${error_message}`);
    }
  }

  async subscribe() {
    if (!this.#initialized) {
      Alert.error(t("billing_not_initialized"));
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

      Alert.success(t("subscription_success"));
    } catch (error: any) {
      const error_message = error instanceof Error ? error.message : String(error);
      if (error_message === "User cancelled") {
        console.log("User cancelled subscription");
      } else {
        const error_message = error instanceof Error ? error.message : String(error);
        Alert.error(`${t("subscription_failed")}: ${error_message}`);
      }
    }
  }

  async changeToFreePlan() {
    if (!this.#initialized) {
      Alert.error(t("billing_not_initialized"));
      return;
    }

    if (!this.#is_plus_user) {
      Alert.show({ message: t("already_free_plan") });
      return;
    }

    try {
      if (!user.value) {
        const result = await signIn();
        if (!result.success) {
          if (result.error_message === "USER_CANCELED") {
            return;
          }

          throw result.error_message || t("something_went_wrong");
        }
      }

      const id_token = await user.value?.id_token;
      if (!id_token) {
        Alert.error(t("authentication_required"));
        return;
      }

      // Call backend to cancel subscription
      const response = await fetch(`${PUBLIC_FIREBASE_FUNCTIONS_URL}/cancelSubscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${id_token}`,
        },
        body: JSON.stringify({
          purchase_token: this.#current_purchase?.purchase_token,
          product_id: this.#current_purchase?.product_id,
        }),
      });

      if (!response.ok) {
        const error_data = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error_data.error || "Failed to cancel subscription");
      }

      // Reset local state
      this.#is_plus_user = false;
      this.#current_purchase = null;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("cancellation_failed")}: ${error_message}`);
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
      const id_token = await user.value?.id_token;
      if (!id_token) return;

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
        throw new Error("Failed to verify purchase");
      }
    } catch (error) {
      console.error("Failed to verify purchase with backend:", error);
    }
  }
}

export const billing = new Billing();
