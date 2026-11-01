<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
</script>

<section class="sticky top-0 z-10 mb-2 rounded-md p-4 bg-surface border border-warning space-y-3">
  <div>
    <h3 class="font-semibold">{t("update_required")}</h3>
    <p>{t("update_required_message")}</p>
  </div>

  <button
    type="button"
    onclick={() => Api.settings.openStorePage()}
    class="w-full justify-center h-12 bg-card border-default border rounded-md flex items-center gap-2"
  >
    <Icon name="download" class="text-xl" />
    {t("update_now")}
  </button>
</section>
