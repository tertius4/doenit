<script>
  import ButtonLanguage from "./element/button/ButtonLanguage.svelte";
  import { context } from "$logic/context.svelte";
  import Drawer from "./element/Drawer.svelte";
  import Api from "$logic/api";

  let is_open = $state(true);

  const is_af = $derived(context.settings.language === "af");

  /**
   * Hanteer taal verandering
   * @param {Language} lang
   */
  async function onsubmit(lang) {
    await Api.settings.update({ language: lang || "af" });
    is_open = false;
  }
</script>

<Drawer {is_open} onclose={() => onsubmit("af")}>
  <div class="mb-6 px-2 text-normal **:select-none **:transition-all **:duration-300">
    <h3 class="mb-3 font-regular text-lg">In watter taal moet Doenit praat?</h3>

    <div class="flex gap-2 w-full">
      <ButtonLanguage
        class="w-full h-15 text-lg"
        selected={is_af}
        flagSrc="flags/af.webp"
        languageName="Afrikaans"
        onclick={() => onsubmit("af")}
      />
      <ButtonLanguage
        class="w-full h-15 text-lg"
        selected={!is_af}
        flagSrc="flags/en.webp"
        languageName="English"
        onclick={() => onsubmit("en")}
      />
    </div>
  </div>
</Drawer>
