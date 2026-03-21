<script>
  import { user } from "$lib/core/user.svelte";
  import Drawer from "./element/Drawer.svelte";
  import ButtonLanguage from "./element/button/ButtonLanguage.svelte";
  import { language, t } from "$lib/services/language.svelte";

  let is_open = $state(true);

  /**
   * Hanteer taal verandering
   * @param {Language} lang
   */
  function onlanguagechange(lang) {
    if (!lang) return;

    language.value = lang;
    user.update({ language_code: lang });
    is_open = false;
  }

  function handleClose() {
    is_open = false;
    language.value = language.value || "af";
  }
</script>

<Drawer {is_open} onclose={handleClose}>
  <div class="mb-6 px-2 text-normal **:select-none **:transition-all **:duration-300">
    <h3 class="mb-3 font-regular text-lg">In watter taal moet Doenit praat?</h3>

    <div class="flex gap-2 w-full">
      <ButtonLanguage
        class="w-full h-15 text-lg"
        selected={language.value === "af"}
        flagSrc="flags/af.webp"
        languageName="Afrikaans"
        onclick={() => onlanguagechange("af")}
      />
      <ButtonLanguage
        class="w-full h-15 text-lg"
        selected={language.value === "en"}
        flagSrc="flags/en.webp"
        languageName="English"
        onclick={() => onlanguagechange("en")}
      />
    </div>
  </div>
</Drawer>
