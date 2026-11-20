<script>
  import Tag from "$display/comps/button/Tag.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { slide } from "svelte/transition";
  import { goto } from "$app/navigation";
  import t from "$display/translate";
  import ProjectProgress from "./ProjectProgress.svelte";

  /**
   * @typedef {Object} Props
   * @property {AL.ListListItem} list
   */

  /** @type {Props} */
  const { list } = $props();
</script>

<button
  type="button"
  in:slide
  onclick={() => goto(`/lists/${list.id}`)}
  class="relative w-full flex items-center gap-3 bg-surface rounded-lg px-3 py-2 text-left active:bg-card transition-colors"
>
  <div class="flex-1">
    <h1 class="text-secondary-400 font-semibold text-lg leading-none truncate pr-20 flex items-center gap-1.5">
      {#if list.completable}<Icon name="folder" size={16} class="shrink-0" />{/if}
      <span class="truncate">{list.name}</span>
    </h1>

    <p class="text-sm text-muted truncate empty:hidden mt-px">{list.description}</p>
    <!-- Only a shared list shows who is in it; a private list has no mark. -->
    {#if list.is_shared}
      <div class="flex gap-1 font-medium text-sm mt-1">
        <Icon name="users" size={16} />

        {#each list.members as member, i}
          {#if !!i}<span>, </span>{/if}
          <div class="flex gap-1 items-center justify-center truncate" title={member.name}>
            {#if member.is_admin}
              <Icon name="crown" size={12} />
            {/if}
            {member.name}
          </div>
        {/each}
      </div>
    {/if}

    {#if list.completable}
      <div class="mt-2">
        <ProjectProgress
          done={list.done_count}
          open={list.task_count}
          target_date={list.target_date}
          completed_at={list.completed_at}
        />
      </div>
    {/if}
  </div>

  <div class="absolute top-2 right-2 flex flex-col items-end gap-1 shrink-0">
    {#if !list.completable}
      <Tag>
        <span class="capitalize text-xs font-bold text-secondary-300">
          {list.task_count}
          {list.task_count === 1 ? t("task") : t("tasks")}
        </span>
      </Tag>
    {/if}
  </div>
</button>
