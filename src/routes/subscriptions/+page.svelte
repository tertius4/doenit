<script>
  import { backHandler } from "$lib/BackHandler.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { billing } from "$lib/core/billing.svelte";
  import { t } from "$lib/services/language.svelte";
  import { user } from "$lib/base/user.svelte";
  import { Check, Crown, Loading, Star, Sync } from "$lib/icon";
  import { Alert } from "$lib/core/alert";
  import { Browser } from "@capacitor/browser";
  import { Capacitor } from "@capacitor/core";
  import { DateUtil } from "$lib/core/date_util";

  let is_loading = $state(false);
  /** @type {Purchase[]} */
  let purchased_products = $state([]);
  /** @type {Product[]} */
  let all_products = $state([]);

  const products = $derived(
    all_products.filter((p) => purchased_products.every((pp) => pp.product_id !== p.product_id))
  );

  onMount(async () => {
    if (!Capacitor.isNativePlatform()) return;

    await loadAllProducts();
    await loadPurchasedProducts();
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  async function loadPurchasedProducts() {
    is_loading = true;

    try {
      const result = await billing.queryPurchases();
      purchased_products = result?.purchases || [];
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("failed_to_load_purchases")}: ${error_message || t("something_went_wrong")}`);
    }

    is_loading = false;
  }

  async function loadAllProducts() {
    try {
      const temp_products = await billing.loadProducts();
      if (user.is_developer) {
        all_products = temp_products;
      } else {
        all_products = temp_products.filter((p) => p.product_id !== "doenit.testing");
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  }

  /**
   * @param {string} product_id
   */
  async function handleSubscribe(product_id) {
    try {
      is_loading = true;
      if (!user.is_logged_in) {
        const result = await user.signIn();
        if (!result.success) {
          if (result.error_message === "USER_CANCELED") {
            is_loading = false;
            return;
          }
          throw result.error_message || t("something_went_wrong");
        }
      }

      await billing.subscribe(product_id);
      await loadPurchasedProducts();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      if (error_message !== "User cancelled") {
        Alert.error(error_message || t("something_went_wrong"));
      }
    } finally {
      is_loading = false;
    }
  }

  async function handleManageSubscription() {
    try {
      await Browser.open({ url: "https://play.google.com/store/account/subscriptions" });
    } catch (error) {
      Alert.error(t("something_went_wrong"));
    }
  }

  /**
   * Formats a timestamp to a readable date string.
   * @param {number} timestamp
   */
  function formatDate(timestamp) {
    if (!timestamp) return "";

    return DateUtil.format(new Date(timestamp), "D MMM YYYY");
  }
</script>

<div class="max-w-4xl mx-auto py-4">
  <!-- Header -->
  <div class="text-center mb-8">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
      <Crown class="text-4xl text-primary" />
    </div>
    <h1 class="text-3xl font-bold mb-2">{t("subscriptions")}</h1>
    <p class="text-base opacity-70">{t("manage_your_subscriptions")}</p>
  </div>

  {#if is_loading && !purchased_products.length}
    <div class="flex justify-center items-center py-12">
      <Loading class="text-4xl text-primary animate-spin" />
    </div>
  {:else}
    {#if !!purchased_products.length}
      <section class="mb-10">
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <Check class="text-2xl text-success" />
          {t("active_subscriptions")}
        </h2>

        <div class="space-y-4">
          {#each purchased_products as purchase}
            <div class="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white shadow-lg">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <Star class="text-2xl flex-shrink-0" />
                    <h3 class="text-2xl font-bold">
                      {purchase.title || purchase.product_id}
                    </h3>
                  </div>

                  {#if purchase.description}
                    <p class="text-sm opacity-90 mb-2">{purchase.description}</p>
                  {/if}

                  <div class="grid grid-cols-2 gap-4">
                    {#if purchase.price}
                      <div class="bg-white/10 rounded-lg p-3">
                        <p class="text-xs opacity-80 mb-1">{t("price")}</p>
                        <p class="text-lg font-semibold">{purchase.price}</p>
                      </div>
                    {/if}

                    {#if purchase.purchase_time}
                      <div class="bg-white/10 rounded-lg p-3">
                        <p class="text-xs opacity-80 mb-1">{t("purchased_on")}</p>
                        <p class="text-lg font-semibold">{formatDate(purchase.purchase_time)}</p>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              {#if Capacitor.isNativePlatform()}
                <button
                  type="button"
                  onclick={handleManageSubscription}
                  class="w-full bg-white text-primary font-semibold py-3 px-4 rounded-lg shadow-md"
                >
                  {t("manage_subscription")}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Available Products Section -->
    {#if !!products.length}
      <section>
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <Crown class="text-2xl text-primary" />
          {t("available_products")}
        </h2>

        <div class="grid gap-6 md:grid-cols-2">
          {#each products as product}
            <div class="bg-surface rounded-xl border border-default shadow-sm overflow-hidden p-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="bg-primary/10 rounded-full p-3">
                  <Crown class="text-2xl text-primary" />
                </div>
                <h3 class="text-xl font-bold flex-1">
                  {product.title}
                </h3>
              </div>

              {#if product.description}
                <p class="text-sm opacity-70 mb-4">
                  {product.description}
                </p>
              {/if}

              <!-- Price -->
              <div class="bg-primary/5 rounded-lg p-4 mb-4 text-center">
                <div class="text-3xl font-bold text-primary mb-1">{product.price}</div>
                <div class="text-sm opacity-70">{t("per_month")}</div>
              </div>

              {#if Capacitor.isNativePlatform()}
                <button
                  type="button"
                  onclick={() => handleSubscribe(product.product_id)}
                  disabled={is_loading}
                  class="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:transform-none shadow-md"
                >
                  {#if is_loading}
                    <div class="flex items-center justify-center gap-2">
                      <Loading class="animate-spin" />
                      {t("loading")}
                    </div>
                  {:else}
                    {t("subscribe_now")}
                  {/if}
                </button>
              {:else}
                <div class="text-center text-sm opacity-70 italic">
                  {t("subscription_available_on_mobile")}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Empty State -->
    {#if !purchased_products.length && !products.length && !is_loading}
      <div class="text-center py-12">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-surface rounded-full mb-4">
          <Crown class="text-4xl opacity-30" />
        </div>
        <h3 class="text-xl font-semibold mb-2">{t("no_products_available")}</h3>
        <p class="text-sm opacity-70">{t("check_back_later")}</p>
      </div>
    {/if}
  {/if}
</div>
