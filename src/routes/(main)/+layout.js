// import { text } from "$lib/services/text.svelte";
// import { RateApp } from "$lib/services/rateApp";
// import { user } from "$lib/core/user.svelte";
// import { alert } from "$lib/core/alert";

// // Hou dit
// import { Cached } from "$lib/core/cache.svelte";
// import { Selected } from "$lib/selected.svelte";
// import { mount } from "svelte";
// import LanguageSelector from "$lib/components/LanguageSelector.svelte";

export async function load() {
  // try {
  //   await user.initialize();
  //   for (const id of user.favourite_category_ids) {
  //     Selected.categories.add(id);
  //   }

  //   RateApp.showRatingPrompt();
  //   text.init();

  //   if (!user.language_code) {
  //     mount(LanguageSelector, {
  //       target: document.body,
  //     });
  //   }
  // } catch (error) {
  //   const error_message = error instanceof Error ? error.message : JSON.stringify(error);
  //   alert.error("Fout met inisialisering van die toepassing. Probeer asseblief weer: " + error_message);
  // }
}
