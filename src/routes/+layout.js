import { text } from "$lib/services/text.svelte";
import { RateApp } from "$lib/services/rateApp";
import { user } from "$lib/base/user.svelte";
import { Alert } from "$lib/core/alert";
import { DB } from "$lib/DB";

// Hou dit
import { Cached } from "$lib/core/cache.svelte";
import { Selected } from "$lib/selected.svelte";

export const ssr = false;

export async function load() {
  try {
    await DB.init();
    await user.init();
    for (const id of user.favourite_category_ids) {
      Selected.categories.add(id);
    }

    RateApp.showRatingPrompt();
    text.init();
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    Alert.error("Fout met inisialisering van die toepassing. Probeer asseblief weer: " + error_message);
  }
}
