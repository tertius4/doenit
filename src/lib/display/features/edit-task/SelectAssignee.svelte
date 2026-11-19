<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Drawer from "$display/comps/Drawer.svelte";
  import Api from "$logic/api";
  import { wait } from "$lib";

  /**
   * @typedef {DB.Member & { is_me?: boolean, contact: { name?: string, email_address: string } | null }} GroupMember
   */

  /**
   * @typedef {Object} Props
   * @property {string | undefined} scope_id
   * @property {string | undefined} value
   */

  /** @type {Props & Record<string, any>} */
  let { scope_id, value = $bindable(undefined) } = $props();

  /** More members than this and the strip gets an "All N" button that opens a search drawer. */
  const SEARCH_THRESHOLD = 7;
  /** How many members besides "me" the strip shows once search is available. */
  const STRIP_OTHERS = 5;
  /** Avatar backgrounds: all dark enough for white initials in both themes. */
  const AVATAR_COLORS = [
    "bg-secondary-600",
    "bg-tertiary-700",
    "bg-primary-600",
    "bg-emerald-800",
    "bg-violet-700",
    "bg-secondary-700",
  ];
  const OPTION_CLASS =
    "flex flex-col items-center gap-1.5 w-16 shrink-0 cursor-pointer outline-none rounded-lg focus-visible:ring-2 ring-primary";
  const ROW_CLASS =
    "flex items-center gap-3 w-full min-h-13 px-2 py-1.5 rounded-lg text-left cursor-pointer outline-none focus-visible:ring-2 ring-primary";

  /** @type {GroupMember[]} */
  let members = $state([]);
  let is_loading = $state(false);
  let is_searching = $state(false);
  let query = $state("");

  const me = $derived(members.find((m) => m.is_me) ?? null);
  const others = $derived(
    members.filter((m) => !m.is_me).sort((a, b) => displayName(a).localeCompare(displayName(b), "af")),
  );
  const has_search = $derived(members.length > SEARCH_THRESHOLD);

  const strip_members = $derived.by(() => {
    let shown = others;
    if (has_search) {
      shown = others.slice(0, STRIP_OTHERS);
      // The chosen person must always be visible in the strip.
      const selected = others.find((m) => m.firebase_uid === value);
      if (selected && !shown.includes(selected)) shown = [selected, ...shown.slice(0, STRIP_OTHERS - 1)];
    }
    return me ? [me, ...shown] : shown;
  });

  const trimmed_query = $derived(normalize(query.trim()));
  const search_results = $derived.by(() => {
    const all = me ? [me, ...others] : others;
    if (!trimmed_query) return all;
    return all.filter((m) => normalize(`${displayName(m)} ${m.contact?.email_address ?? ""}`).includes(trimmed_query));
  });
  const show_anyone_in_search = $derived(!trimmed_query || normalize(t("anyone")).includes(trimmed_query));

  $effect(() => {
    const id = scope_id;
    members = [];
    if (!id) {
      is_loading = false;
      return;
    }

    is_loading = true;
    Api.groups.getMembers(id).then((result) => {
      if (id !== scope_id) return;
      is_loading = false;
      if (!result.ok) return;

      members = result.value;
      // The assignee must be a member of the (new) group.
      if (value && !members.some((m) => m.firebase_uid === value)) value = undefined;
    });
  });

  /**
   * @param {GroupMember} member
   * @returns {string}
   */
  function displayName(member) {
    if (member.is_me) return t("me");
    return member.contact?.name || member.contact?.email_address || t("unknown_member");
  }

  /**
   * @param {GroupMember} member
   * @returns {string}
   */
  function initials(member) {
    if (member.is_me) return t("me").slice(0, 2).toUpperCase();
    const name = member.contact?.name?.trim();
    if (name) {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }
    return member.contact?.email_address?.[0]?.toUpperCase() || "?";
  }

  /**
   * A fixed colour per person, so someone always looks the same.
   * @param {string} firebase_uid
   */
  function avatarColor(firebase_uid) {
    let hash = 0;
    for (const char of firebase_uid) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  /**
   * Lower case without accents, so "marie" finds "Marié".
   * @param {string} text
   */
  function normalize(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  /**
   * @param {string | undefined} firebase_uid
   */
  async function selectFromSearch(firebase_uid) {
    value = firebase_uid;
    await wait(200); // Let the selection show before the drawer closes
    is_searching = false;
    query = "";
  }
</script>

{#snippet avatar(member, selected, size)}
  <span
    class={[
      "rounded-full flex items-center justify-center font-semibold shrink-0 box-border",
      size,
      member ? [avatarColor(member.firebase_uid), "text-white"] : "border-2 border-dashed border-default text-muted",
      selected && "outline-2 outline-offset-2 outline-primary",
    ]}
  >
    {#if member}
      {initials(member)}
    {:else}
      <Icon name="users" size={22} />
    {/if}
  </span>
{/snippet}

{#if scope_id && (is_loading || members.length > 0)}
  <fieldset class="min-w-0">
    <legend class="font-semibold">{t("choose_user")}</legend>

    <div
      class="flex gap-3 overflow-x-auto px-0.5 pt-2 pb-1 scrollbar-none"
      role="radiogroup"
      aria-label={t("choose_user")}
    >
      {#if is_loading}
        {#each { length: 4 } as _}
          <div class="flex flex-col items-center gap-1.5 w-16 shrink-0" aria-hidden="true">
            <span class="size-13 rounded-full bg-card animate-pulse"></span>
            <span class="h-3 w-10 rounded bg-card animate-pulse"></span>
          </div>
        {/each}
      {:else}
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          class={OPTION_CLASS}
          onclick={() => (value = undefined)}
        >
          {@render avatar(null, !value, "size-13")}
          <span class={["text-sm truncate max-w-full", value ? "text-muted" : "font-semibold"]}>{t("anyone")}</span>
        </button>

        {#each strip_members as member (member.id)}
          {@const selected = member.firebase_uid === value}
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            class={OPTION_CLASS}
            onclick={() => (value = member.firebase_uid)}
          >
            {@render avatar(member, selected, "size-13 text-lg")}
            <span class={["text-sm truncate max-w-full", selected ? "font-semibold" : "text-muted"]}>
              {displayName(member)}
            </span>
          </button>
        {/each}

        {#if has_search}
          <button type="button" class={OPTION_CLASS} onclick={() => (is_searching = true)}>
            <span class="size-13 rounded-full flex items-center justify-center bg-surface border border-default">
              <Icon name="search" size={22} />
            </span>
            <span class="text-sm text-muted truncate max-w-full">{t("all_members", { count: members.length })}</span>
          </button>
        {/if}
      {/if}
    </div>
  </fieldset>

  {#if has_search}
    <Drawer
      bind:is_open={is_searching}
      onclose={() => (query = "")}
      class="text-normal px-4! pb-4! flex flex-col gap-3 min-h-0"
    >
      <h3 class="font-semibold text-lg!">{t("choose_user")}</h3>

      <div class="relative">
        <Icon name="search" size={20} class="absolute left-3 top-0 bottom-0 my-auto text-muted pointer-events-none" />
        <input
          type="search"
          bind:value={query}
          placeholder={t("search_member")}
          aria-label={t("search_member")}
          class="bg-card border border-default h-12 w-full rounded-lg pl-10 pr-3 placeholder:text-muted outline-none focus:ring-1 ring-primary"
        />
      </div>

      <div class="overflow-y-auto max-h-[55vh] -mx-2 space-y-0.5" role="radiogroup" aria-label={t("choose_user")}>
        {#if show_anyone_in_search}
          <button
            type="button"
            role="radio"
            aria-checked={!value}
            class={[ROW_CLASS, !value && "bg-selected"]}
            onclick={() => selectFromSearch(undefined)}
          >
            {@render avatar(null, false, "size-9")}
            <span class="flex-1 min-w-0 truncate">{t("anyone")}</span>
            {#if !value}<Icon name="check" size={20} class="text-primary shrink-0" />{/if}
          </button>
        {/if}

        {#each search_results as member (member.id)}
          {@const selected = member.firebase_uid === value}
          {@const email = member.is_me ? "" : member.contact?.email_address}
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            class={[ROW_CLASS, selected && "bg-selected"]}
            onclick={() => selectFromSearch(member.firebase_uid)}
          >
            {@render avatar(member, false, "size-9 text-sm")}
            <span class="flex-1 min-w-0 flex flex-col">
              <span class="truncate">{displayName(member)}</span>
              {#if email && email !== displayName(member)}
                <span class="text-sm text-muted truncate">{email}</span>
              {/if}
            </span>
            {#if selected}<Icon name="check" size={20} class="text-primary shrink-0" />{/if}
          </button>
        {/each}

        {#if !show_anyone_in_search && search_results.length === 0}
          <p class="px-2 py-4 text-muted italic">{t("no_member_match", { query: query.trim() })}</p>
        {/if}
      </div>
    </Drawer>
  {/if}
{/if}
