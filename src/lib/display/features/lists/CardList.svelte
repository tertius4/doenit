<script>
  import Tag from "$display/comps/button/Tag.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { slide } from "svelte/transition";
  import { goto } from "$app/navigation";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} name
   * @property {string} [description]
   * @property {number} task_count
   * @property {string} owner_id
   * @property {boolean} [is_shared]
   * @property {{ name: string, is_admin?: boolean }[]} [members]
   */

  /** @type {Props} */
  const { id, name, description, members = [], is_shared = false, task_count } = $props();
</script>

<button
  type="button"
  in:slide
  onclick={() => goto(`/lists/${id}`)}
  class="relative w-full flex items-center gap-3 bg-surface rounded-lg px-3 py-2 text-left active:bg-card transition-colors"
>
  <div class="flex-1">
    <h1 class="text-secondary-400 font-semibold text-lg leading-none truncate">{name}</h1>

    <p class="text-sm text-muted truncate empty:hidden mt-px">{description}</p>
    <!-- Only a shared list shows who is in it; a private list has no mark. -->
    {#if is_shared}
      <div class="flex gap-1 font-medium text-sm mt-1">
        <Icon name="users" size={16} />

        {#each members as member, i}
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
  </div>

  <div class="absolute top-2 right-2 flex flex-col items-end gap-1 shrink-0">
    <Tag>
      <span class="capitalize text-xs font-bold text-secondary-300">
        {task_count}
        {task_count === 1 ? t("task") : t("tasks")}
      </span>
    </Tag>
  </div>
</button>
