<script>
  import ButtonsSignIn from "$display/comps/button/ButtonsSignIn.svelte";
  import { createAuthFlow } from "$display/auth.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import { mount, unmount } from "svelte";
  import * as env from "$env/static/public";
  import ModalPersonalSync from "$display/comps/modal/ModalPersonalSync.svelte";

  /**
   * Shown on the web until the user is signed in and has Sync on. The browser is only a window onto the synced tasks:
   * nothing important should live only in a browser, which is easily cleared or shared.
   */

  const auth = createAuthFlow();

  function turnOnSync() {
    const component = mount(ModalPersonalSync, {
      target: document.body,
      props: {
        onconfirm: async () => {
          const result = await Api.personal_sync.enable();
          if (!result.ok) toast.error(result.error);
        },
        onclose: () => unmount(component),
      },
    });
  }
</script>

<div class="h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center bg-page text-normal">
  <img src="/logo.png" alt="Doenit" class="w-24 h-24" />
  <h1 class="text-2xl font-bold">{t("web_gate_title")}</h1>

  {#if !context.user}
    <p class="max-w-sm text-muted">{t("web_gate_sign_in")}</p>
    <ButtonsSignIn {auth} />
  {:else}
    <p class="max-w-sm text-muted">{t("web_gate_sync")}</p>
    <button type="button" class="w-60 py-2 px-4 rounded-lg font-medium bg-primary text-alt" onclick={turnOnSync}>
      {t("sync_devices")}
    </button>
    <button type="button" class="text-sm text-muted underline" onclick={() => auth.signOut()}>{t("sign_out")}</button>
  {/if}

  <div class="flex flex-col items-center gap-2 pt-4 text-sm text-muted">
    <span>{t("web_gate_get_app")}</span>
    <div class="flex gap-4">
      {#if env.PUBLIC_GOOGLE_PLAY_STORE_URL}
        <a class="underline" href={env.PUBLIC_GOOGLE_PLAY_STORE_URL} target="_blank" rel="noopener">Google Play</a>
      {/if}
      {#if env.PUBLIC_APP_STORE_URL}
        <a class="underline" href={env.PUBLIC_APP_STORE_URL} target="_blank" rel="noopener">App Store</a>
      {/if}
    </div>
  </div>
</div>
