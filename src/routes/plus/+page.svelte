<script>
  import { t } from "$lib/services/language.svelte";
  import { Check, Google, Loading } from "$lib/icon";
  import { user } from "$lib/base/user.svelte";
  import { billing } from "$lib/core/billing.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Alert } from "$lib/core/alert";
  import { Browser } from "@capacitor/browser";
  import { page } from "$app/state";

  // Huidige aktiewe produk ID
  // TODO: In die toekoms kan dit van die URL kom (bv. /products/doenit.plus)
  const active_product_id = "doenit.plus";

  // Haal produk konfigurasie van billing service
  const product_config = billing.getProductConfig(active_product_id);

  if (!product_config) {
    throw new Error(`Product configuration not found for: ${active_product_id}`);
  }

  let is_loading = $state(false);
  let is_cancelling = $state(false);
  let is_reactivating = $state(false);

  // Haal produk data van billing service
  const product = $derived(billing.subscription_product);
  const subscription_details = $derived(billing.subscription_details);
  // This is here for dev on the website.
  // let product = {
  //   productId: "doenit.plus",
  //   title: "Doenit Plus (Deel & Rugsteun) (Doenit – Afrikaanse ToDo/Taaklys)",
  //   description: "Outomatiese rugsteun van jou take\nDeel take met vriende, familie of kollegas",
  //   price: "R 9,99",
  //   priceAmountMicros: 9990000,
  //   priceCurrencyCode: "ZAR",
  // };
  const is_subscribed = $derived(billing.is_plus_user);

  // Verwerk benefits met translations
  const benefits = $derived(
    product_config.benefits.map((benefit) => ({
      icon: benefit.icon,
      title: t(benefit.title_key),
      description: t(benefit.description_key),
    }))
  );

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  async function handleSubscribePlus() {
    try {
      is_loading = true;
      if (!user.is_logged_in) {
        const skip_login = page.url.searchParams.get("show_login") === "false";
        if (skip_login) {
          is_loading = false;
          return;
        }

        const result = await user.signIn();
        if (!result.success) {
          if (result.error_message === "USER_CANCELED") {
            is_loading = false;
            return;
          }

          throw result.error_message || t("something_went_wrong");
        }
      }

      await billing.subscribe();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(error_message || t("something_went_wrong"));
    } finally {
      is_loading = false;
    }
  }

  async function handleCancelSubscription() {
    try {
      is_cancelling = true;
      await Browser.open({ url: "https://play.google.com/store/account/subscriptions" });
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(error_message || t("something_went_wrong"));
    } finally {
      is_cancelling = false;
    }
  }

  async function handleReactivateSubscription() {
    try {
      is_reactivating = true;
      await Browser.open({ url: "https://play.google.com/store/account/subscriptions" });
      // After user returns, refresh subscription status
      setTimeout(async () => {
        await billing.checkSubscriptionStatus();
        is_reactivating = false;
      }, 2000);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(error_message || t("something_went_wrong"));
      is_reactivating = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto py-6">
  <!-- Header Section -->
  <div class="text-center mb-8">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
      {#if product_config.icon}
        {@const ProductIcon = product_config.icon}
        <ProductIcon class="text-4xl text-primary" />
      {/if}
    </div>
    <h1 class="text-3xl font-bold mb-2">{product_config.name}</h1>
    <p class="text-base opacity-70">{t(product_config.description_key)}</p>
  </div>

  <!-- Current Plan Status (if subscribed) -->
  {#if is_subscribed}
    <div class="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-white shadow-lg mb-6">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <p class="text-sm opacity-80 mb-1">{t("current_plan")}</p>
          <p class="text-2xl font-bold">{t("plus_plan")}</p>
          {#if subscription_details?.isCancelled && subscription_details?.expiryTime}
            <div class="mt-3 bg-white/20 rounded-lg p-3">
              <p class="text-sm font-medium">
                ⚠️ {t("subscription_cancelled_until")}
                <span class="font-bold">{subscription_details.expiryTime.toLocaleDateString()}</span>
              </p>
            </div>
          {:else if subscription_details?.expiryTime}
            <p class="text-sm opacity-90 mt-2">
              {t("renews_on")}
              {subscription_details.expiryTime.toLocaleDateString()}
            </p>
          {/if}
        </div>
        {#if product_config.icon}
          {@const ProductIcon = product_config.icon}
          <div class="bg-white/20 rounded-full p-3">
            <ProductIcon class="text-3xl" />
          </div>
        {/if}
      </div>

      {#if subscription_details?.isCancelled}
        <button
          type="button"
          onclick={handleReactivateSubscription}
          disabled={is_reactivating}
          class="w-full bg-white text-primary font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:transform-none shadow-md"
        >
          {#if is_reactivating}
            <div class="flex items-center justify-center gap-2">
              <Loading />
              {t("loading")}
            </div>
          {:else}
            {@const ProductIcon = product_config.icon}
            <div class="flex items-center justify-center gap-2">
              <ProductIcon class="text-xl" />
              {t("reactivate_subscription")}
            </div>
          {/if}
        </button>
      {:else}
        <!-- Benefits Overview for Plus Users -->
        <div class="space-y-3">
          <h2 class="text-xl font-semibold mb-4">{t("your_benefits")}</h2>
          {#each benefits as benefit}
            {@const Icon = benefit.icon}
            <div class="bg-surface rounded-xl p-4 border border-primary/30 shadow-sm">
              <div class="flex items-start gap-4">
                <div class="bg-primary/10 rounded-full p-3 flex-shrink-0">
                  <Icon class="text-2xl text-primary" />
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-lg mb-1">{benefit.title}</h3>
                  <p class="text-sm opacity-80">{benefit.description}</p>
                </div>
                <Check class="text-2xl text-success flex-shrink-0 mt-1" />
              </div>
            </div>
          {/each}
        </div>

        <button
          type="button"
          onclick={handleCancelSubscription}
          disabled={is_cancelling}
          class="w-full bg-white/10 border-2 border-white/30 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:transform-none"
        >
          {#if is_cancelling}
            <div class="flex items-center justify-center gap-2">
              <Loading />
              {t("loading")}
            </div>
          {:else}
            <div class="flex items-center justify-center gap-2">
              <Google class="text-xl" />
              {t("manage_subscriptions")}
            </div>
          {/if}
        </button>
      {/if}
    </div>
  {:else}
    <!-- Subscription Offer (not subscribed) -->
    {#if product}
      <!-- Pricing Card -->
      <div class="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-8 text-white shadow-xl mb-6 text-center">
        <div class="mb-6">
          <div class="flex items-baseline justify-center gap-2 mb-2">
            <span class="text-5xl font-bold">{product.price}</span>
          </div>
          <div class="text-lg opacity-90">{t("per_month")}</div>
        </div>

        <button
          type="button"
          onclick={handleSubscribePlus}
          disabled={is_loading}
          class="w-full bg-white text-primary font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 hover:bg-white/95 hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:transform-none shadow-lg"
        >
          {#if is_loading}
            <div class="flex items-center justify-center gap-2">
              <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              {t("loading")}
            </div>
          {:else}
            {@const ProductIcon = product_config.icon}
            <div class="flex items-center justify-center gap-2">
              <ProductIcon class="text-2xl" />
              {t("subscribe_now")}
            </div>
          {/if}
        </button>
      </div>

      <!-- Benefits Section -->
      <div class="space-y-4 mb-6">
        <h2 class="text-xl font-semibold mb-4">{t("whats_included")}</h2>
        {#each benefits as benefit}
          {@const Icon = benefit.icon}
          <div
            class="bg-surface rounded-xl p-5 border border-default shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div class="flex items-start gap-4">
              <div class="bg-primary/10 rounded-full p-3 flex-shrink-0">
                <Icon class="text-2xl text-primary" />
              </div>
              <div class="flex-1 pt-1">
                <h3 class="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p class="text-sm opacity-80 leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Current Plan Info -->
      <div class="bg-surface/50 rounded-lg p-4 border border-default/50">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 bg-default rounded-full"></div>
          <div>
            <p class="text-sm opacity-70">{t("current_plan")}</p>
            <p class="text-base font-semibold">{t("free_plan")}</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="mt-8 p-8 flex items-center justify-center text-center">
        <div class="space-y-2">
          <div class="text-4xl opacity-30 mb-2">📦</div>
          <p class="text-base opacity-70 italic">
            {#if typeof navigator !== "undefined" && !navigator.onLine}
              {t("offline")}
            {:else}
              {t("no_products_found")}
            {/if}
          </p>
        </div>
      </div>
    {/if}
  {/if}
</div>
