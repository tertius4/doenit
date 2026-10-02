<script>
  import Icon from "$display/comps/Icon.svelte";
  import EditGroup from "./EditGroup.svelte";
  import View from "$display/view";
  import t from "$display/translate";
  import { onMount } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {{ id: string, name: string, description?: string, owner_id?: string }} group
   */

  /** @type {Props} */
  const { group } = $props();

  let is_editing = $state(false);

  /** @type {AL.GroupListItem[]} */
  const groups = $state([]);
  const members = $derived(groups.find((g) => g.id === group.id)?.members ?? []);
  const member_names = $derived(members.length === 1 ? t("just_you") : members.map(({ name }) => name).join(", "));

  onMount(View.groups.getList(groups));
</script>

<div class="bg-surface rounded-lg px-4 py-3 space-y-2">
  <h1 class="text-2xl font-bold text-secondary-400 wrap-break-word">{group.name}</h1>

  {#if group.description}
    <p class="text-muted wrap-break-word">{group.description}</p>
  {/if}

  <button
    type="button"
    onclick={() => (is_editing = true)}
    aria-label={t("group_members")}
    class="w-full flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-left font-medium text-sm active:opacity-70"
  >
    <Icon name="users" size={18} class="shrink-0" />
    <span class="flex-1 truncate">{member_names}</span>
    <Icon name="chevron-right" size={18} class="shrink-0 text-muted" />
  </button>
</div>

<EditGroup
  bind:open={is_editing}
  id={group.id}
  name={group.name}
  description={group.description}
  owner_id={group.owner_id}
/>
