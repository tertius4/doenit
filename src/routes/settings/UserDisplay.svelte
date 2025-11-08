<script>
  import Modal from "$lib/components/modal/Modal.svelte";
  import { Alert } from "$lib/core/alert";
  import user, { signIn, signOut } from "$lib/core/user.svelte";
  import { Loading } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";

  let is_open = $state(false);
  let is_loading = $state(false);

  async function handleSignIn() {
    is_loading = true;
    const result = await signIn();
    is_loading = false;

    if (result.success) return;

    Alert.error(result.error_message || t("something_went_wrong"));
  }

  async function handleSignOut() {
    is_open = false;

    const result = await signOut();
    if (result.success) return;

    Alert.error(result.error_message || t("something_went_wrong"));
  }
</script>

<div class="bg-surface rounded-lg items-center p-4 flex flex-col relative gap-4">
  {#if user.is_loading}
    <div class="relative flex gap-x-2 w-full justify-start">
      <div class="w-13 h-13 rounded-full bg-card animate-pulse"></div>
      <div class="space-y-2">
        <div class="bg-card h-[45%] rounded-lg w-40 animate-pulse"></div>
        <div class="bg-card h-[45%] rounded-lg w-25 animate-pulse"></div>
      </div>

      <!-- Position center -->
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Loading class="text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("loading")}</p>
      </div>
    </div>
  {:else if !user.value}
    <div class="text-center space-y-0.5">
      <h2 class="text-2xl font-semibold">{t("you_are_not_logged_in")}</h2>
      <p class="text-sm text-muted">{t("please_log_in_profile")}</p>
    </div>

    <button
      type="button"
      aria-label={t("log_in_with_google")}
      class={{
        "flex items-center w-60 justify-center bg-card border border-default font-medium py-2 px-4 rounded-lg": true,
        "opacity-50": is_loading,
      }}
      onclick={handleSignIn}
    >
      {#if is_loading}
        <Loading class="mr-3" />
        {t("loading")}
      {:else}
        <img src="google.svg" alt="Google" class="h-5 w-5 mr-3" />
        {t("log_in_with_google")}
      {/if}
    </button>
  {:else}
    <button
      aria-label="teken uit"
      type="button"
      class="flex justify-start gap-4 w-full"
      onclick={() => (is_open = true)}
    >
      {#if user.value.avatar}
        <img
          src={user.value.avatar}
          alt={t("profile")}
          class="w-13 h-13 my-auto rounded-full"
          referrerpolicy="no-referrer"
        />
      {/if}

      <div class="space-y-0.5">
        <h2 class="text-left text-2xl font-semibold">
          {user.value.name}
        </h2>
        <p class="text-left text-sm font-medium text-muted">
          {user.value.email}
        </p>
      </div>
    </button>
  {/if}
</div>

<Modal bind:is_open class="max-w-[80%]!" onclose={() => (is_open = false)}>
  <div class="font-medium mb-2 text-lg">{t("sign_out")}?</div>
  <div class="flex gap-1 w-full justify-between">
    <button type="button" class="py-1 px-3 w-20 h-10 bg-card rounded-lg" onclick={() => (is_open = false)}>
      {t("no")}
    </button>
    <button type="button" class="py-1 px-3 w-20 h-10 bg-primary rounded-lg text-alt" onclick={() => handleSignOut()}>
      {t("yes")}
    </button>
  </div>
</Modal>
