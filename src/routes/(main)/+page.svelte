<script>
  import { goto } from "$app/navigation";
  import Icon from "$display/comps/Icon.svelte";

  import View from "$display/view";

  import { Selected } from "$lib/selected.svelte";
  import { t } from "$lib/services/language.svelte";

  import { getContext, onMount } from "svelte";

  const search_text = getContext("search_text");

  /** @type {Logic.MainPageTask[]} */
  let tasks = $state([]);

  onMount(View.main.taskList(tasks));
</script>

{#each tasks as task}
  <!-- <Task /> -->
  ...
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
