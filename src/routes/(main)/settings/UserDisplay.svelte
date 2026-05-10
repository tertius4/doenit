<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  let is_open = $state(false);
  let is_loading = $state(false);

  const is_logged_in = $derived(context.user?.id);

  async function handleSignIn() {
    is_loading = true;
    const result = await Api.auth.signIn();
    is_loading = false;

    if (!result.ok) {
      if (result.error === "USER_CANCELED") {
        return;
      }

      toast.error("Inteken fout", result.error || t("something_went_wrong"));
    }
  }

  async function handleSignOut() {
    is_open = false;

    is_loading = true;
    const result = await Api.auth.signOut();
    is_loading = false;
    if (result.ok) return;

    toast.error("Uitteken fout", result.error || t("something_went_wrong"));
  }
</script>

<div class="bg-surface rounded-lg items-center p-4 flex flex-col relative gap-4">
  {#if is_loading}
    <div class="relative flex gap-x-2 w-full justify-start">
      <div class="w-13 h-13 rounded-full bg-card animate-pulse"></div>
      <div class="space-y-2">
        <div class="bg-card h-[45%] rounded-lg w-40 animate-pulse"></div>
        <div class="bg-card h-[45%] rounded-lg w-25 animate-pulse"></div>
      </div>

      <!-- Position center -->
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Icon name="loading" class="animate-spin text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("loading")}</p>
      </div>
    </div>
  {:else if !is_logged_in}
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
        <Icon name="loading" class="mr-3 animate-spin" />
        {t("loading")}
      {:else}
        <img src="google.svg" alt="Google" class="h-5 w-5 mr-3" />
        {t("log_in_with_google")}
      {/if}
    </button>
  {:else if context.user}
    <button
      aria-label={t("sign_out")}
      type="button"
      class="relative h-13 flex justify-start w-full"
      onclick={() => (is_open = true)}
    >
      {#if context.user.avatar}
        <img
          src={context.user.avatar}
          alt={t("profile")}
          class="my-auto rounded-full absolute inset-0 z-1 size-13"
          referrerpolicy="no-referrer"
          onerror={(e) => {
            if (e.target instanceof HTMLElement) {
              e.target.style.display = "none";
            }
          }}
        />
        <Icon name="user" class="my-auto rounded-full absolute inset-0 z-0 size-13 border-2" />
      {/if}

      <div class="space-y-0.5 ml-17">
        <h2 class="text-left text-2xl font-semibold">
          {context.user.name}
        </h2>
        <p class="text-left text-sm font-medium text-muted">
          {context.user.email_address}
        </p>
      </div>
    </button>
  {/if}
</div>

<Modal bind:is_open class="max-w-80! *:space-y-2" onclose={() => (is_open = false)}>
  <ModalHeader>{t("sign_out")}?</ModalHeader>
  <div class="flex gap-1 w-full justify-between">
    <button type="button" class="py-1 px-3 w-25 h-10 bg-card rounded-lg" onclick={() => (is_open = false)}>
      {t("no")}
    </button>
    <button type="button" class="py-1 px-3 w-25 h-10 bg-primary rounded-lg text-alt" onclick={handleSignOut}>
      {t("sign_out")}
    </button>
  </div>
</Modal>
