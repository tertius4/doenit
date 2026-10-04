import toast from "$display/toast/toast.svelte";
import t, { type TranslationKey } from "$display/translate";
import Api from "$logic/api";

/** Translates known error keys (e.g. "sign_in_error_no_idtoken"); anything else is shown as-is. */
function errorMessage(error: string | undefined) {
  if (!error) return t("something_went_wrong");
  return error.startsWith("sign_in_error_") ? t(error as TranslationKey) : error;
}

/** Shared sign-in / sign-out flow with loading state and error toasts. Ignores calls while one is running. */
class AuthFlow {
  is_loading = $state(false);

  async signIn() {
    if (this.is_loading) return;

    this.is_loading = true;
    const result = await Api.auth.signIn();
    this.is_loading = false;

    if (result.ok || result.error === "USER_CANCELED") return;
    toast.error(t("sign_in_failed"), errorMessage(result.error));
  }

  async signOut() {
    if (this.is_loading) return;

    this.is_loading = true;
    const result = await Api.auth.signOut();
    this.is_loading = false;

    if (result.ok) return;
    toast.error(t("sign_out_failed"), errorMessage(result.error));
  }
}

export function createAuthFlow() {
  return new AuthFlow();
}
