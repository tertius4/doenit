import { notifications } from "$lib/services/notification.svelte";
import { billing } from "$lib/core/billing.svelte";
import { text } from "$lib/services/text.svelte";
import { RateApp } from "$lib/services/rateApp";
import { user } from "$lib/base/user.svelte";
import { Alert } from "$lib/core/alert";
import { DB } from "$lib/DB";

// Hou dit
import { Cached } from "$lib/core/cache.svelte";

export const ssr = false;

export async function load() {
  try {
    await DB.init();
    billing.init();
    user.init();

    RateApp.showRatingPrompt();
    text.init();
    notifications.init();
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    Alert.error("Fout met inisialisering van die toepassing. Probeer asseblief weer: " + error_message);
  }
}
