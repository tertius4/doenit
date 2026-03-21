<script>
  import Icon from "$display/comps/Icon.svelte";
  import { alert } from "$lib/core/alert";
  import { Selected } from "$lib/selected.svelte";
  import { t } from "$lib/services/language.svelte";
  import Api from "$logic/api";
  import { Share } from "@capacitor/share";

  const { onclick = () => {} } = $props();

  const multiple = $derived(Selected.tasks.size > 1);

  async function handleShare() {
    const task_ids = [...Selected.tasks.values()];
    if (!task_ids?.length) return;

    const result = await Api.task.getShareTaskText(task_ids);
    if (!result.ok) return alert.error(result.error);

    await Share.share({ title: "Deel Taak", text: result.value, dialogTitle: "Deel Taak" });

    Selected.tasks.clear();

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
