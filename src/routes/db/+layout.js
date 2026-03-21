import { text } from "$lib/services/text.svelte";
import { alert } from "$lib/core/alert";

export async function load() {
  try {
    // await db.init();

    text.init();
  } catch (error) {
    const error_message = error instanceof Error ? error.message : JSON.stringify(error);
    alert.error("Fout met inisialisering van die toepassing. Probeer asseblief weer: " + error_message);
  }
}
