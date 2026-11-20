<script>
  import Icon from "$display/comps/Icon.svelte";
  import EditList from "./EditList.svelte";
  import View from "$display/view";
  import t from "$display/translate";
  import { onMount } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {{ id: string, name: string, description?: string, owner_id?: string, scope_id?: string | null }} list
   */

  /** @type {Props} */
  const { list } = $props();

  let is_editing = $state(false);

  /** @type {AL.ListListItem[]} */
  const lists = $state([]);
  const members = $derived(lists[0]?.members ?? []);
  const task_count = $derived(lists[0]?.task_count ?? 0);
  const member_names = $derived(!members.length ? t("just_you") : members.map(({ name }) => name).join(", "));

  // svelte-ignore state_referenced_locally
  onMount(View.lists.getOne(list.id, lists));
</script>

<button
  aria-label={t("list_settings")}
  type="button"
  onclick={() => (is_editing = true)}
  class="bg-surface text-left rounded-lg px-4 py-3 space-y-2 w-full"
>
  <h1 class="text-2xl font-bold text-secondary-400 wrap-break-word">{list.name}</h1>

  {#if list.description}
    <p class="text-muted wrap-break-word">{list.description}</p>
  {/if}

  <div class="flex items-center gap-2 bg-card rounded-lg px-3 py-2 font-medium text-sm active:opacity-70">
    <Icon name={members.length > 1 ? "users" : "settings"} size={18} class="shrink-0" />
    <span class="flex-1 truncate">{member_names}</span>
    <Icon name="chevron-right" size={18} class="shrink-0 text-muted" />
  </div>
</button>

<EditList
  bind:open={is_editing}
  id={list.id}
  name={list.name}
  description={list.description}
  owner_id={list.owner_id}
  is_shared={!!list.scope_id}
  {task_count}
/>
