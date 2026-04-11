<script>
  import Drawer from "$display/comps/Drawer.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import ButtonLanguage from "./ButtonLanguage.svelte";

  let is_open = $state(!context.settings.language);

  const is_af = $derived(context.settings.language === "af");
  const is_en = $derived(context.settings.language === "en");

  /**
   * Update App Settings
   * @param {Object} change
   * @param {"af" | "en"} [change.language]
   */
  async function onchange(change) {
    const result = await Api.settings.update(change);
    if (!result.ok) return toast.error(result.error || "Failed to update settings");

    is_open = false;
  }
</script>

<Drawer
  {is_open}
  onclose={() => onchange({ language: "af" })}
  class="text-normal **:select-none **:transition-all **:duration-300 p-4!"
>
  <h3 class="mb-1 font-medium text-lg!">Watter taal moet Doenit praat?</h3>

  <div class=" flex gap-4">
    <ButtonLanguage
      class="w-full h-20 *:text-lg! *:first:h-12"
      selected={is_af}
      flag_src="flags/af.webp"
      language_name={t("afrikaans")}
      onclick={() => onchange({ language: "af" })}
    />
    <ButtonLanguage
      class="w-full h-20 *:text-lg! *:first:h-12"
      selected={is_en}
      flag_src="flags/en.webp"
      language_name={t("english")}
      onclick={() => onchange({ language: "en" })}
    />
  </div>
</Drawer>
