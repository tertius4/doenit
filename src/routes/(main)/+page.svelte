<script>
  import { t } from "$lib/services/language.svelte";
  import { Selected } from "$lib/selected.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import View from "$display/view";
  import Task from "$display/features/main_page/Task.svelte";

  const search_text = getContext("search_text");

  /** @type {Logic.MainPageTask[]} */
  let tasks = $state([]);

  onMount(View.main.taskList(tasks));
</script>

<div class="space-y-2">
  {#each tasks as task (task.id)}
    <Task {...task} is_selected={Selected.tasks.has(task.id)} />
  {:else}
    <div class="flex flex-col items-center gap-4 py-12">
      {#if !Selected.categories.size}
        <div class="text-lg">{t("empty_list")}</div>
      {:else if search_text.value?.trim().length}
        <div class="text-lg">{t("no_tasks_found_for_search")}</div>
      {:else}
        <div class="text-lg">{t("no_tasks_found")}</div>
      {/if}

      <button
        type="button"
        class="rounded-lg bg-card px-12 py-6 flex justify-center items-center gap-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        onclick={() => goto("/create")}
      >
        <Icon name="plus" />
        <span class="text-lg">{t("create_new_task")}</span>
      </button>
    </div>
  {/each}
</div>
