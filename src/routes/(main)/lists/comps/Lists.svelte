<script>
  import Icon from "$display/comps/Icon.svelte";
  import CardList from "$display/features/lists/CardList.svelte";
  import t from "$display/translate";
  import View from "$display/view";
  import { goto } from "$app/navigation";
  import { INBOX_ID } from "$lib";
  import { onMount } from "svelte";

  /** @type {AL.ListListItem[]} */
  let lists = $state([]);
  /** @type {AL.ListOption[]} */
  let options = $state([]);

  const inbox_count = $derived(options.find((o) => o.id === INBOX_ID)?.task_count ?? 0);

  onMount(View.lists.getList(lists));
  onMount(View.lists.options(options));
</script>

<div class="flex flex-col space-y-2 pt-2">
  <!-- The Inbox holds tasks without a list. It is always there and can't be shared. -->
  <button
    type="button"
    onclick={() => goto(`/lists/${INBOX_ID}`)}
    class="relative w-full flex items-center gap-3 bg-surface rounded-lg px-3 py-3 text-left active:bg-card transition-colors"
  >
    <Icon name="tasks" size={20} class="shrink-0 text-muted" />
    <span class="flex-1 font-semibold text-lg leading-none truncate">{t("inbox")}</span>
    <span class="text-sm text-muted font-mono">{inbox_count}</span>
  </button>

  {#each lists as list (list.id)}
    <CardList
      id={list.id}
      name={list.name}
      description={list.description}
      owner_id={list.owner_id}
      is_shared={list.is_shared}
      task_count={list.task_count}
      members={list.members}
    />
  {:else}
    <div class="flex flex-col items-center justify-center gap-4 pt-16 text-center">
      <Icon name="categories" size={48} class="text-muted opacity-40" />
      <p class="text-muted">{t("no_lists_yet")}</p>
    </div>
  {/each}
</div>
