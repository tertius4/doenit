<script>
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Share } from "@capacitor/share";
  import t from "$display/translate";
  import Api from "$logic/api";

  const APP_URL = "https://tertius4.github.io/doenit";

  async function handleShare() {
    try {
      const can_share = await Share.canShare();
      if (can_share.value) {
        await Share.share({
          title: "Doenit",
          text: t("share_app_message"),
          url: APP_URL,
          dialogTitle: t("share_app"),
        });
        return;
      }

      const result = await Api.clipboard.copy(APP_URL, t("link_copied"));
      if (!result.ok) toast.error(t("sharing_not_supported"));
    } catch (error) {
      // Dismissing the share sheet rejects on some platforms; only report real failures.
      const message = error instanceof Error ? error.message : "";
      if (!/cancel/i.test(message)) toast.error(t("sharing_not_supported"));
    }
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
