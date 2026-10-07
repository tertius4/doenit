import toast from "$display/toast/toast.svelte";
import t, { type TranslationKey } from "$display/translate";
import Api from "$logic/api";
import type { SocialProvider } from "$services/social-login";

/** Translates known error keys (e.g. "sign_in_error_no_idtoken"); anything else is shown as-is. */
function errorMessage(error: string | undefined) {
  if (!error) return t("something_went_wrong");
  return error.startsWith("sign_in_error_") ? t(error as TranslationKey) : error;
}

/** Shared sign-in / sign-out flow with loading state and error toasts. Ignores calls while one is running. */
class AuthFlow {
  is_loading = $state(false);

  async signIn(provider: SocialProvider = "google") {
    if (this.is_loading) return;

    // `finally`: the guard above makes a stuck `is_loading` a permanently dead button, so it has to
    // clear even when the call below throws or never settles.
    this.is_loading = true;
    let result: Result;
    try {
      result = await Api.auth.signIn(provider);
    } finally {
      this.is_loading = false;
    }

    if (result.ok || result.error === "USER_CANCELED") return;
    toast.error(t("sign_in_failed"), errorMessage(result.error));
  }

  async signOut() {
    if (this.is_loading) return;

    this.is_loading = true;
    let result: Result;
    try {
      result = await Api.auth.signOut();
    } finally {
      this.is_loading = false;
    }

    if (result.ok) return;
    toast.error(t("sign_out_failed"), errorMessage(result.error));
  }
}

export function createAuthFlow() {
  return new AuthFlow();
}
