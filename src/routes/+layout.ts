import { browser } from "$app/environment";
import DB from "$lib/domain/db";
import alert from "$display/toast/toast.svelte";
import { initApp } from "$logic/context.svelte";
import { config } from "$lib/config";
import auth from "$services/social-login.js";
import firestore from "$services/firestore";

export const ssr = false;

const OAUTH_PENDING_KEY = "social_login_oauth_pending";

export async function load({ url, params }) {
  // If we're in a popup that was opened for OAuth, hand control back to the plugin and close.
  if (browser && window.opener && localStorage.getItem(OAUTH_PENDING_KEY)) {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    await SocialLogin.handleRedirectCallback();
    await auth.initialize({ web_client_id: config.google_web_client_id }); // Ensure auth is initialized to clear any internal state
    return; // window.close() is called internally
  }

  // Initialize Firebase before any DB or sync operations
  firestore.init();

  try {
    await DB.init();
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return alert.error("Databasis fout", message);
  }

  try {
    await initApp();
  } catch (error) {
    console.error("Failed to initialize app", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return alert.error("Initialisasie fout", message);
  }
}
