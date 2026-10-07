<script>
  import Icon from "$display/comps/Icon.svelte";
  import { Capacitor } from "@capacitor/core";
  import t from "$display/translate";

  /**
   * The sign-in buttons, shared by Settings, Groups and Contacts so a provider only has to be
   * added in one place.
   *
   * @typedef {Object} Props
   * @prop {{ is_loading: boolean, signIn: (provider?: "google" | "apple") => Promise<void> }} auth
   * @prop {string} [class] - Extra classes for the wrapper.
   */

  /** @type {Props} */
  const { auth, class: className = "" } = $props();

  // Apple only offers Sign in with Apple on its own platforms.
  const show_apple = Capacitor.getPlatform() === "ios";

  const base = "flex items-center w-60 justify-center font-medium py-2 px-4 rounded-lg";
</script>

<div class={["flex flex-col items-center gap-4", className]}>
  <button
    type="button"
    aria-label={t("log_in_with_google")}
    class={[base, "bg-card border border-default", auth.is_loading && "opacity-50"]}
    onclick={() => auth.signIn()}
  >
    {#if auth.is_loading}
      <Icon name="loading" class="mr-3 animate-spin" />
      {t("loading")}
    {:else}
      <img src="/google.svg" alt="Google" class="h-5 w-5 mr-3" />
      {t("log_in_with_google")}
    {/if}
  </button>

  {#if show_apple}
    <button
      type="button"
      aria-label={t("log_in_with_apple")}
      class={[base, "bg-black text-white", auth.is_loading && "opacity-50"]}
      onclick={() => auth.signIn("apple")}
    >
      {#if auth.is_loading}
        <Icon name="loading" class="mr-3 animate-spin" />
        {t("loading")}
      {:else}
        <!-- From the sprite, not <img>: an <img> cannot inherit the button's currentColor,
             which left the black glyph invisible on the black button. -->
        <Icon name="apple" size={20} class="mr-3" />
        {t("log_in_with_apple")}
      {/if}
    </button>
  {/if}
</div>
