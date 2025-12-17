<script>
  import { t } from "$lib/services/language.svelte";
  import { Crown, Check, Users, DownloadCloud, Google, Loading } from "$lib/icon";
  import { user } from "$lib/base/user.svelte";
  import { billing } from "$lib/core/billing.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Alert } from "$lib/core/alert";
  import { Browser } from "@capacitor/browser";
  import { page } from "$app/state";

  let is_loading = $state(false);
  let is_cancelling = $state(false);
  let is_reactivating = $state(false);

  const product = $derived(billing.subscription_product);
  const subscription_details = $derived(billing.subscription_details);
  // This is here for dev on the website
  // let product = {
  //   productId: "doenit.plus",
  //   title: "Doenit Plus (Deel & Rugsteun) (Doenit – Afrikaanse ToDo/Taaklys)",
  //   description: "Outometiese rugsteun van jou take\nDeel take met vriende, familie of kollegas",
  //   price: "R 29,99",
  //   priceAmountMicros: 22990000,
  //   priceCurrencyCode: "ZAR",
  // };

  // Benefits list
  const benefits = $derived([
    {
      icon: Users,
      title: t("benefit_rooms"),
      description: t("benefit_rooms_desc"),
    },
    {
      icon: DownloadCloud,
      title: t("benefit_backup"),
      description: t("benefit_backup_desc"),
    },
  ]);

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  async function handleSubscribe() {
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

<!-- Current Plan Status -->
{#if billing.is_plus_user}
  <div class="mt-4 bg-surface rounded-lg p-4 border border-primary">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm">{t("current_plan")}</p>
        <p class="text-lg font-semibold text-primary">{t("plus_plan")}</p>
        {#if subscription_details?.isCancelled && subscription_details?.expiryTime}
          <p class="text-xs text-warning mt-1">
            {t("subscription_cancelled_until")}
            {subscription_details.expiryTime.toLocaleDateString()}
          </p>
        {:else if subscription_details?.expiryTime}
          <p class="text-xs opacity-70 mt-1">
            {t("renews_on")}
            {subscription_details.expiryTime.toLocaleDateString()}
          </p>
        {/if}
      </div>
      <Crown class="text-3xl text-primary" />
    </div>
    {#if subscription_details?.isCancelled}
      <button
        type="button"
        onclick={handleReactivateSubscription}
        disabled={is_reactivating}
        class="mt-4 w-full bg-primary text-white py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:transform-none"
      >
        {#if is_reactivating}
          <div class="flex items-center justify-center gap-2">
            <Loading />
            {t("loading")}
          </div>
        {:else}
          <div class="flex items-center justify-center gap-2">
            <Crown />
            {t("reactivate_subscription")}
          </div>
        {/if}
      </button>
    {:else}
      <button
        type="button"
        onclick={handleCancelSubscription}
        disabled={is_cancelling}
        class="mt-4 w-full bg-transparent border border-default py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:transform-none"
      >
        {#if is_cancelling}
          <div class="flex items-center justify-center gap-2">
            <Loading />
            {t("loading")}
          </div>
        {:else}
          <div class="flex items-center justify-center gap-2">
            <Google />
            {t("manage_subscriptions")}
          </div>
        {/if}
      </button>
    {/if}
  </div>
{:else}
  {#if product}
    <div class="mt-4 bg-gradient-to-br from-primary to-primary/60 rounded-xl p-6 text-white shadow-lg">
      <div class="text-center mb-6">
        <div class="inline-flex items-baseline gap-1 mb-2">
          <span class="text-4xl font-bold">{product.price}</span>
        </div>
        <div class="text-base opacity-80">{t("per_month")}</div>
      </div>

      <button
        type="button"
        onclick={handleSubscribe}
        disabled={is_loading}
        class="w-full bg-white text-primary font-semibold py-4 px-6 rounded-lg text-lg transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:transform-none shadow-md"
      >
        <div class="flex items-center justify-center gap-2">
          {#if is_loading}
            <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            {t("loading")}
          {:else}
            <Crown class="text-xl" />
            {t("subscribe_now")}
          {/if}
        </div>
      </button>
    </div>
  {:else}
    <div class="mt-4 p-4 flex items-center justify-center italic">
      {#if typeof navigator !== "undefined" && !navigator.onLine}
        {t("offline")}
      {:else}
        {t("no_products_found")}
      {/if}
    </div>
  {/if}

  <div class="mt-4 bg-surface rounded-lg p-4 border border-default">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm">{t("current_plan")}</p>
        <p class="text-lg font-semibold">{t("free_plan")}</p>
      </div>
    </div>
  </div>
{/if}

<!-- Benefits Section -->
<div class="mt-4">
  <h2 class="text-xl font-bold mb-4">{t("plus_benefits")}</h2>

  <div class="space-y-4">
    {#each benefits as benefit}
      {@const Icon = benefit.icon}
      <div class="bg-surface rounded-lg p-4 border border-default">
        <div class="flex items-start gap-4">
          <div class="bg-primary/20 rounded-full p-3 flex-shrink-0">
            <Icon class="text-2xl text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-lg mb-1">{benefit.title}</h3>
            <p class="text-sm">{benefit.description}</p>
          </div>
          {#if billing.is_plus_user}
            <Check class="text-2xl text-success flex-shrink-0" />
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
