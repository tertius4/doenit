<script>
  import { selected_tasks } from "$display/selected.svelte";
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { Share } from "@capacitor/share";
  import t from "$display/translate";
  import Api from "$logic/api";

  const { onclick = () => {} } = $props();

  const multiple = $derived(selected_tasks.size > 1);

  async function handleShare() {
    const result = await Api.task.getShareTaskText({
      ids: [...selected_tasks.values()],
    });
    if (!result.ok) return toast.error(result.error);

    await Share.share({ title: "Deel Taak", text: result.value, dialogTitle: "Deel Taak" });

    selected_tasks.clear();

    onclick();
  }
</script>

<button
  type="button"
  aria-label="Share Task"
  onclick={handleShare}
  class="rounded-lg bg-card border border-default font-medium flex justify-between items-center p-4 w-full"
>
  <span>{t("share")} {multiple ? t("tasks") : t("task")}</span>
  <Icon name="share" class="text-lg text-normal" />
</button>
