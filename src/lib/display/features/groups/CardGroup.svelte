<script>
  import { goto } from "$app/navigation";
  import { slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import { getInitials } from "$lib";
  import Tag from "$display/comps/button/Tag.svelte";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} name
   * @property {string} owner_id
   * @property {string} [description]
   * @property {string[]} [member_names]
   */

  /** @type {Props} */
  const { id, name, description, member_names = [] } = $props();

  const member_names_str = $derived([...member_names, "Dean", "Sarah"].join(", "));
  const initials = $derived(getInitials(name));
</script>

<button
  type="button"
  in:slide
  onclick={() => goto(`/groups/${id}`)}
  class="relative w-full flex items-center gap-3 bg-surface rounded-lg px-3 py-2 text-left active:bg-card transition-colors"
>
  <div class="flex-1">
    <p class="text-secondary-300 mb-1 font-semibold text-lg truncate">{name}</p>

    <p class="text-sm text-muted truncate empty:hidden">{description}</p>
    <div class="flex gap-1 font-medium text-sm">
      <Icon name="user" size={16} />

      {#if member_names.length > 0}
        <span class="truncate">{member_names_str}</span>
      {:else}
        Net jy
      {/if}
    </div>
  </div>

  <div class="absolute top-2 right-2 flex flex-col items-end gap-1 shrink-0">
    {#if member_names.length > 0}
      <Tag>
        <span class="capitalize text-xs font-bold text-secondary-300">{member_names.length} taak</span>
      </Tag>
    {/if}
  </div>
</button>
