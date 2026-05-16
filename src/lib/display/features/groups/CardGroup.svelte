<script>
  import { goto } from "$app/navigation";
  import { slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import { getInitials } from "$lib";

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

  const initials = $derived(getInitials(name));
</script>

<button
  type="button"
  in:slide
  onclick={() => goto(`/groups/${id}`)}
  class="w-full flex items-center gap-3 bg-surface rounded-xl px-3 py-3 text-left active:bg-card transition-colors"
>
  <div
    class="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-lg"
  >
    {initials}
  </div>

  <div class="flex-1 min-w-0">
    <p class="font-semibold text-base truncate">{name}</p>
    {#if description}
      <p class="text-sm text-muted truncate">{description}</p>
    {:else if member_names.length > 0}
      <p class="text-sm text-muted truncate">{member_names.join(", ")}</p>
    {/if}
  </div>

  <div class="flex flex-col items-end gap-1 shrink-0">
    {#if member_names.length > 0}
      <span class="text-xs text-muted">{member_names.length} lede</span>
    {/if}
    <Icon name="chevron-right" class="w-4 h-4 text-muted" />
  </div>
</button>
