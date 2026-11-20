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
  const projects = $derived(lists.filter((l) => l.completable && !l.completed_at));
  const plain_lists = $derived(lists.filter((l) => !l.completable));
  const completed = $derived(lists.filter((l) => l.completable && l.completed_at));

  let show_completed = $state(false);

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

  {#if projects.length}
    <h2 class="text-sm font-semibold text-muted px-1 pt-2">{t("projects")}</h2>
    {#each projects as list (list.id)}
      <CardList {list} />
    {/each}
  {/if}

  {#if plain_lists.length && projects.length}
    <h2 class="text-sm font-semibold text-muted px-1 pt-2">{t("lists")}</h2>
  {/if}
  {#each plain_lists as list (list.id)}
    <CardList {list} />
  {/each}

  {#if !lists.length}
    <div class="flex flex-col items-center justify-center gap-4 pt-16 text-center">
      <Icon name="categories" size={48} class="text-muted opacity-40" />
      <p class="text-muted">{t("no_lists_yet")}</p>
    </div>
  {/if}

  {#if completed.length}
    <button
      type="button"
      onclick={() => (show_completed = !show_completed)}
      class="flex items-center gap-1 text-sm font-semibold text-muted px-1 py-2"
      aria-expanded={show_completed}
    >
      <Icon
        name="chevron-right"
        size={16}
        class={show_completed ? "transition-transform rotate-90" : "transition-transform"}
      />
      <span>{t("completed_projects")} ({completed.length})</span>
    </button>

    {#if show_completed}
      {#each completed as list (list.id)}
        <CardList {list} />
      {/each}
    {/if}
  {/if}
</div>
