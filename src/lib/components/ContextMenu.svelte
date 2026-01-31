<script>
  import BulkAssignCategory from "./BulkAssignCategory.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { slide } from "svelte/transition";
  import { Selected } from "$lib/selected.svelte";
  import { Share } from "@capacitor/share";
  import { DB } from "$lib/DB";
  import { t } from "$lib/services/language.svelte";

  let { show = $bindable() } = $props();

  const multiple = $derived(Selected.tasks.size > 1);

  async function handleShare() {
    const task_ids = [...Selected.tasks.values()];
    if (!task_ids) return;

    const tasks = await DB.Task.getAll({ selector: { id: { $in: task_ids } }, sort: [{ name: "asc" }] });

    const dot = tasks.length === 1 ? "" : "• ";
    await Share.share({
      title: "Deel Taak",
      text: dot + tasks.map((task) => task.name).join(`,\n• `),
      dialogTitle: "Deel Taak",
    });

    show = false;
    Selected.tasks.clear();
  }
</script>

<svelte:body
  onclick={(e) => {
    const is_open_button = e.target.id === "meer-opsies";
    if (is_open_button) return;

    let target = e.target;
    while (target) {
      if (target.id === "context-menu") return;
      target = target.parentNode;
    }

    show = false;
  }}
/>

<div
  id="context-menu"
  transition:slide
  class="absolute right-4 w-75 max-w-[90%] top-16 bg-surface rounded-lg shadow-lg border border-default z-50 p-2 space-y-2"
>
  <button
    type="button"
    aria-label="Share Task"
    onclick={handleShare}
    class="rounded-lg bg-card border border-default font-medium flex justify-between items-center p-4 w-full"
  >
    <span>{t("share")} {multiple ? t("tasks") : t("task")}</span>
    <Icon name="share" class="text-lg text-normal" />
  </button>

  <BulkAssignCategory
    onclose={() => {
      show = false;
      Selected.tasks.clear();
    }}
  />
</div>
