<script>
  import ButtonLanguage from "$display/features/settings/ButtonLanguage.svelte";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import ButtonTextSize from "./comps/ButtonTextSize.svelte";
  import { context } from "$logic/context.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  const is_dark = $derived(context.settings.theme === "dark");
  const is_af = $derived(context.settings.language === "af");
  const text_size = $derived(context.settings.text_size);

  /**
   * Update App Settings
   * @param {Object} change
   * @param {"light" | "dark"} [change.theme]
   * @param {"af" | "en"} [change.language]
   * @param {"sm" | "md" | "lg"} [change.text_size]
   */
  async function onchange(change) {
    await Api.settings.update(change);
  }
</script>

<Accordion label={t("appearance")}>
  <!-- Theme selector -->
  <div class="mb-6">
    <h3 class="mb-1">{t("theme")}</h3>
    <div class="relative flex h-12 w-full p-1 gap-2 rounded-lg bg-card">
      <button
        class="relative z-1 w-full flex h-full justify-center items-center gap-2"
        type="button"
        onclick={() => onchange({ theme: "light" })}
        aria-label={t("light_theme")}
      >
        <Icon name="sun" />
        <span class="font-medium">{t("light_theme")}</span>
      </button>

      <button
        class="w-full z-1 flex h-full justify-center items-center gap-2"
        type="button"
        onclick={() => onchange({ theme: "dark" })}
        aria-label={t("dark_theme")}
      >
        <span class="font-medium">{t("dark_theme")}</span>
        <Icon name="moon" />
      </button>

      <div class="z-0 absolute inset-0 {is_dark ? 'translate-x-full' : ''} w-1/2 h-full p-1">
        <div class="rounded-lg h-full z-1 w-full bg-surface"></div>
      </div>
    </div>
  </div>

  <!-- Language selector -->
  <div class="mb-6">
    <h3 class="mb-1">{t("language")}</h3>

    <div class="grid grid-cols-2 gap-2 max-w-80">
      <ButtonLanguage
        selected={is_af}
        flag_src="flags/af.webp"
        language_name={t("afrikaans")}
        onclick={() => onchange({ language: "af" })}
      />
      <ButtonLanguage
        selected={!is_af}
        flag_src="flags/en.webp"
        language_name={t("english")}
        onclick={() => onchange({ language: "en" })}
      />
    </div>
  </div>

  <!-- Text size selector -->
  <div>
    <h3 class="mb-1">{t("text_size")}</h3>
    <div class="grid grid-cols-3 gap-2 max-w-80">
      <ButtonTextSize class="text-[16px]" onclick={() => onchange({ text_size: "sm" })} selected={text_size === "sm"}>
        {t("small")}
      </ButtonTextSize>
      <ButtonTextSize
        class="text-[20px]"
        onclick={() => onchange({ text_size: "md" })}
        selected={text_size === "md" || text_size == null}
      >
        {t("medium")}
      </ButtonTextSize>
      <ButtonTextSize class="text-[24px]" onclick={() => onchange({ text_size: "lg" })} selected={text_size === "lg"}>
        {t("large")}
      </ButtonTextSize>
    </div>
  </div>
</Accordion>
