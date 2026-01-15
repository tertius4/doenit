<script>
  import { backHandler } from "$lib/BackHandler.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { afterNavigate, goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { t } from "$lib/services/language.svelte";
  import { user } from "$lib/base/user.svelte";
  import { Crown, Loading, Star } from "$lib/icon";
  import { Alert } from "$lib/core/alert";
  import { Browser } from "@capacitor/browser";
  import { Capacitor } from "@capacitor/core";
  import { DateUtil } from "$lib/core/date_util";
  import { getBillingContext } from "$lib/contexts/billing.svelte";

  const billingContext = getBillingContext();

  let is_loading = $state(true);

  afterNavigate(async () => {
    if (!Capacitor.isNativePlatform()) return;

    is_loading = true;
    await billingContext.refresh();
    is_loading = false;
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

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

      await billingContext.subscribe(product_id);
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

  {#if is_loading && !user.products.length}
    <div class="flex justify-center items-center py-12">
      <Loading class="text-4xl text-primary animate-spin" />
    </div>
  {:else}
    {#if !!user.products.length}
      <section class="mb-10">
        <div class="space-y-4">
          {#each user.products as product}
            {#if product.is_active}
              <div class="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white shadow-lg">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <Star class="text-2xl flex-shrink-0" />
                      <h3 class="text-2xl font-bold">
                        {product.title || product.product_id}
                      </h3>
                    </div>

                    {#if product.description}
                      <p class="text-sm opacity-90 mb-2">{product.description}</p>
                    {/if}

                    <div class="grid grid-cols-2 gap-4">
                      {#if product.price}
                        <div class="bg-white/10 rounded-lg p-3">
                          <p class="text-xs opacity-80 mb-1">{t("price")}</p>
                          <p class="text-lg font-semibold">{product.price}</p>
                        </div>
                      {/if}

                      {#if product.expiry_date}
                        <div class="bg-white/10 rounded-lg p-3">
                          <p class="text-xs opacity-80 mb-1">{t("expire_on")}</p>
                          <p class="text-lg font-semibold">{DateUtil.format(product.expiry_date, "D MMM YYYY")}</p>
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
            {:else}
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
            {/if}
          {/each}
        </div>
      </section>
    {/if}

    <!-- Empty State -->
    {#if !user.products.length && !is_loading}
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
