<script>
  import Icon from "$display/comps/Icon.svelte";
  import EditList from "./EditList.svelte";
  import ProjectProgress from "./ProjectProgress.svelte";
  import View from "$display/view";
  import Api from "$logic/api";
  import t from "$display/translate";
  import toast from "$display/toast/toast.svelte";
  import { context } from "$logic/context.svelte";
  import { invalidate } from "$app/navigation";
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
  const live = $derived(lists[0]);
  const is_admin = $derived(
    list.owner_id === (context.user?.id ?? "device") || members.some((m) => m.is_me && m.is_admin),
  );
  let is_busy = $state(false);
  const member_names = $derived(!members.length ? t("just_you") : members.map(({ name }) => name).join(", "));

  // svelte-ignore state_referenced_locally
  onMount(View.lists.getOne(list.id, lists));

  async function toggleCompleted() {
    if (is_busy || !live) return;
    is_busy = true;
    const result = live.completed_at ? await Api.lists.reopen(list.id) : await Api.lists.complete(list.id);
    is_busy = false;
    if (!result.ok) return toast.error(result.error);
    invalidate("lists:page");
  }
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

{#if live?.completable}
  <div class="bg-surface rounded-lg px-4 py-3 space-y-3">
    <ProjectProgress
      done={live.done_count}
      open={live.task_count}
      target_date={live.target_date}
      completed_at={live.completed_at}
    />
    {#if is_admin}
      <button
        type="button"
        disabled={is_busy}
        onclick={toggleCompleted}
        class={[
          "w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium text-sm active:opacity-70",
          live.completed_at ? "bg-card" : "bg-primary text-white",
        ]}
      >
        <Icon name={live.completed_at ? "restore" : "check"} size={18} />
        {live.completed_at ? t("reopen_project") : t("complete_project")}
      </button>
    {/if}
  </div>
{/if}

<EditList
  bind:open={is_editing}
  id={list.id}
  name={list.name}
  description={list.description}
  owner_id={list.owner_id}
  is_shared={!!list.scope_id}
  completable={live?.completable ?? false}
  target_date={live?.target_date ?? null}
  {task_count}
/>
