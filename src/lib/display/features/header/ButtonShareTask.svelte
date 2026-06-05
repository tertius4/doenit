<script>
  import { selected_tasks } from "$display/selected.svelte";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Share } from "@capacitor/share";
  import t from "$display/translate";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {() => void} [onclick]
   */

  /** @type {Props & Record<string, any>} */
  const { onclick = () => {}, ...rest } = $props();

  const can_share = $state(await Share.canShare());
  const multiple = $derived(selected_tasks.size > 1);

  async function handleShare() {
    const result = await Api.task.getShareTaskText({
      ids: [...selected_tasks.values()],
    });
    if (!result.ok) return toast.error(result.error);

    if (!Share.canShare()) {
      return toast.error(t("sharing_not_supported"));
    }

    await Share.share({ title: "Deel Taak", text: result.value, dialogTitle: "Deel Taak" });

    selected_tasks.clear();

    onclick();
  }
</script>

<button
  {...rest}
  type="button"
  hidden={!can_share.value}
  aria-label="Share Task"
  onclick={handleShare}
  class="rounded-lg font-medium flex gap-3 items-center px-4 py-3 w-full hover:bg-card active:bg-card transition-colors"
>
  <Icon name="share" size={16} />
  <span>{t("share")} {multiple ? t("tasks") : t("task")}</span>
</button>
