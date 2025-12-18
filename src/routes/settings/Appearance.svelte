<script>
  import ButtonLanguage from "$lib/components/element/button/ButtonLanguage.svelte";
  import ButtonTextSize from "$lib/components/element/button/ButtonTextSize.svelte";
  import { Moon, Sun } from "$lib/icon";
  import { t, language } from "$lib/services/language.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import { text } from "$lib/services/text.svelte";
  import { user } from "$lib/base/user.svelte";

  /**
   * Handle language change
   * @param {Language} lang
   */
  function onlanguagechange(lang) {
    language.value = lang;
  }

  function toggle() {
    if (user.theme === "dark") {
      user.theme = "light";
    } else {
      user.theme = "dark";
    }
  }
</script>

<Accordion label={t("appearance")}>
  <!-- Theme selector -->
  <div class="mb-6">
    <h3 class="mb-1">{t("theme")}</h3>
    <button
      class="relative flex h-12 w-full p-1 gap-2 rounded-lg bg-card"
      onclick={toggle}
      aria-label={t("toggle_theme")}
    >
      <div class="relative w-full">
        <div class="absolute z-2 flex w-full h-full justify-center items-center gap-2">
          <Sun variant={user.theme === "light" ? "filled" : "outline"} />
          <span class="font-medium">{t("light_theme")}</span>
        </div>
      </div>

      <div class="relative w-full">
        <div class="absolute z-2 flex w-full h-full justify-center items-center gap-2">
          <span class="font-medium">{t("dark_theme")}</span>
          <Moon variant={user.theme === "dark" ? "filled" : "outline"} />
        </div>
      </div>

      <div class="absolute inset-0 {user.theme === 'dark' ? 'translate-x-full' : ''} w-1/2 h-full p-1">
        <div class="rounded-lg h-full z-1 w-full bg-surface"></div>
      </div>
    </button>
  </div>

  <!-- Language selector -->
  <div class="mb-6">
    <h3 class="mb-1">{t("language")}</h3>

    <div class="flex gap-2">
      <ButtonLanguage
        selected={language.value === "af"}
        flagSrc="flags/af.webp"
        languageName={t("afrikaans")}
        onclick={() => onlanguagechange("af")}
      />
      <ButtonLanguage
        selected={language.value === "en"}
        flagSrc="flags/en.webp"
        languageName={t("english")}
        onclick={() => onlanguagechange("en")}
      />
    </div>
  </div>

  <!-- Text size selector -->
  <div>
    <h3 class="mb-1">{t("text_size")}</h3>
    <div class="flex gap-2">
      <ButtonTextSize class="text-[16px]" onclick={() => (text.size = 16)} selected={text.size === 16}>
        {t("small")}
      </ButtonTextSize>
      <ButtonTextSize class="text-[20px]" onclick={() => (text.size = 20)} selected={text.size === 20}>
        {t("medium")}
      </ButtonTextSize>
      <ButtonTextSize class="text-[24px]" onclick={() => (text.size = 24)} selected={text.size === 24}>
        {t("large")}
      </ButtonTextSize>
    </div>
  </div>
</Accordion>
