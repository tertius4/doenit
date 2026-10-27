<script>
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  async function handleShare() {
    const result = await Api.share.text(t("share_app_message"));
    if (!result.ok) toast.error(t("sharing_not_supported"));
  }
</script>

<section class="rounded-md p-4 bg-surface">
  <button
    type="button"
    aria-label={t("share_app")}
    onclick={handleShare}
    class="w-full justify-center h-12 bg-card border-default border rounded-md flex items-center gap-2"
  >
    <Icon name="share" class="text-xl" />
    {t("share_app")}
  </button>
</section>
