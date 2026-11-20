<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import { onMount, untrack } from "svelte";
  import { backHandler, modalStack } from "$logic/navigation";
  import { on } from "svelte/events";
  import CloseButton from "$display/comps/modal/CloseButton.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import ModalEditListInfo from "./ModalEditListInfo.svelte";
  import ModalSendInvite from "$display/comps/modal/ModalSendInvite.svelte";
  import ButtonLeaveList from "./ButtonLeaveList.svelte";
  import ButtonDeleteList from "./ButtonDeleteList.svelte";
  import { goto, invalidate } from "$app/navigation";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [id]
   * @prop {string} [owner_id]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {boolean} [is_shared=false] - Whether the list has its own scope yet.
   * @prop {boolean} [completable=false]
   * @prop {string | null} [target_date=null]
   * @prop {number} [task_count=0] - Open tasks in the list.
   * @prop {() => *} [onclose]
   */

  /** @type {Props} */
  let {
    open = $bindable(false),
    id,
    owner_id,
    name = "",
    description = "",
    is_shared = false,
    completable = false,
    target_date = null,
    task_count = 0,
    onclose,
  } = $props();

  const SEARCH_THRESHOLD = 6;

  let edit_open = $state(false);
  let invite_open = $state(false);
  let is_loading = $state(false);
  let search = $state("");

  /** @type {import("$logic/api/lists").ListMember[]} */
  let members = $state([]);
  /** @type {DB.Contact[]} */
  let all_contacts = $state([]);
  /** @type {Set<string>} ids of contacts/members with a request in flight */
  let pending = $state(new Set());
  /** @type {import("$logic/api/lists").ListMember | null} */
  let member_to_remove = $state(null);
  /** @type {DB.Contact | null} The first person a private list with tasks is shared with waits for a yes. */
  let contact_to_share = $state(null);

  const is_owner = $derived(!!owner_id && owner_id === (context.user?.id ?? "device"));
  const is_signed_in = $derived(!!context.user?.id);
  const my_member = $derived(members.find((m) => m.is_me) ?? null);
  const is_admin = $derived(is_owner || my_member?.role === "admin");
  const member_uids = $derived(new Set(members.map((m) => m.firebase_uid)));
  const available_contacts = $derived(all_contacts.filter((c) => c.firebase_uid && !member_uids.has(c.firebase_uid)));
  const filtered_contacts = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return available_contacts;

    return available_contacts.filter((c) => `${c.name ?? ""} ${c.email_address ?? ""}`.toLowerCase().includes(query));
  });

  let load_id = 0;

  async function loadMembers() {
    if (!id) return;

    const current = ++load_id;
    is_loading = true;

    try {
      // The owner is known up front, so contacts can load in parallel; other admins are only known after the members.
      const members_promise = Api.lists.getMembers(id);
      const contacts_promise = is_owner ? Api.lists.getContacts() : null;

      const members_result = await members_promise;
      if (current !== load_id) return;
      if (!members_result.ok) return toast.error(members_result.error);
      members = members_result.value;

      const should_load_contacts = is_owner || members.some((m) => m.is_me && m.role === "admin");
      if (!should_load_contacts) return;

      const contacts_result = await (contacts_promise ?? Api.lists.getContacts());
      if (current !== load_id) return;
      if (!contacts_result.ok) return toast.error(contacts_result.error);
      all_contacts = contacts_result.value;
    } finally {
      if (current === load_id) is_loading = false;
    }
  }

  $effect(() => {
    if (!open) return;

    untrack(loadMembers);

    return () => {
      load_id++; // Drop responses that are still in flight.
      members = [];
      all_contacts = [];
      search = "";
      is_loading = false;
    };
  });

  /**
   * Runs a request for `key`, ignoring repeated taps while it is in flight.
   * @param {string} key
   * @param {() => Promise<*>} request
   */
  async function once(key, request) {
    if (pending.has(key)) return;

    pending = new Set(pending).add(key);
    try {
      await request();
    } finally {
      const next = new Set(pending);
      next.delete(key);
      pending = next;
    }
  }

  /**
   * Sharing a private list shows everything in it to the new member, so with tasks in it, ask first.
   * @param {DB.Contact} contact
   */
  function requestAddMember(contact) {
    if (!is_shared && task_count > 0) {
      contact_to_share = contact;
      return;
    }
    return addMember(contact);
  }

  async function confirmShare() {
    const contact = contact_to_share;
    contact_to_share = null;
    if (contact) await addMember(contact);
  }

  /** @param {DB.Contact} contact */
  function addMember(contact) {
    return once(contact.id, async () => {
      if (!id) return;

      const result = await Api.lists.addMember(id, contact.id);
      if (!result.ok) return toast.error(result.error);

      members = [...members.filter((m) => m.id !== result.value.id), result.value];
    });
  }

  /** @param {import("$logic/api/lists").ListMember} member */
  function memberLabel(member) {
    if (member.is_me) return t("you");
    return member.contact?.name || member.contact?.email_address || t("unknown_member");
  }

  /** @param {import("$logic/api/lists").ListMember} member */
  function canRemove(member) {
    // Leaving is done with the leave button; admin rows (the owner) can't be removed.
    return is_admin && !member.is_me && member.role !== "admin";
  }

  async function confirmRemoveMember() {
    const member = member_to_remove;
    if (!member) return;

    await once(member.id, async () => {
      const result = await Api.lists.removeMember(member.id);
      if (!result.ok) return toast.error(result.error);

      members = members.filter((m) => m.id !== member.id);
      member_to_remove = null;
    });
  }

  /**
   * @param {{ name: string, description: string, completable: boolean, target_date: string | null }} values
   */
  async function handleEditSave(values) {
    const result = await Api.lists.save({ id, ...values });
    if (result.ok) await invalidate("lists:page");

    return result;
  }

  // The list id is what the public API expects as `list_id`.
  async function copyListId() {
    if (!id) return;

    const result = await Api.clipboard.copy(id);
    if (!result.ok) toast.error(t("copy_failed"));
  }

  function handleClose() {
    open = false;
    if (onclose) onclose();
  }

  /** The list is gone for this user, so its page is no longer reachable. */
  function leavePage() {
    open = false;
    goto("/lists", { replaceState: true, invalidateAll: true });
  }

  /** @type {symbol | undefined} */
  let stack_token;

  onMount(() => {
    const token = backHandler.register(() => {
      if (!open || !stack_token || !modalStack.isTop(stack_token)) return false;
      handleClose();
      return true;
    }, 1000);

    return () => backHandler.unregister(token);
  });

  $effect(() => {
    if (!open) return;

    const entry = modalStack.push();
    stack_token = entry;

    return () => {
      modalStack.remove(entry);
      stack_token = undefined;
    };
  });

  function closeOnEsc() {
    return on(window, "keydown", (e) => {
      if (e.key === "Escape" && stack_token && modalStack.isTop(stack_token)) handleClose();
    });
  }

  /** Move focus into the dialog and give it back when it closes. */
  function manageFocus(/** @type {HTMLElement} */ node) {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.focus();

    return () => previous?.focus();
  }
</script>

{#if open}
  <div
    aria-modal="true"
    aria-labelledby="edit-list-title"
    {@attach closeOnEsc}
    {@attach manageFocus}
    role="dialog"
    tabindex="-1"
    class="fixed inset-0 z-40 bg-surface outline-none"
    style="top: max(0px, env(safe-area-inset-top)); bottom: calc(env(safe-area-inset-bottom) - 1px); left: max(0px, env(safe-area-inset-left)); right: max(0px, env(safe-area-inset-right));"
  >
    <div class="relative flex flex-col h-full w-full">
      <CloseButton class="absolute top-2 right-2" onclose={handleClose} />

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="space-y-2 px-10">
          <h1 id="edit-list-title" class="text-center text-3xl font-semibold wrap-break-word">{name}</h1>

          {#if description}
            <p class="text-center text-muted wrap-break-word">{description}</p>
          {/if}

          {#if is_admin}
            <button
              type="button"
              class="mx-auto flex items-center gap-1 text-sm text-primary"
              onclick={() => (edit_open = true)}
            >
              <Icon name="edit" size={16} />
              <span>{t("edit_list")}</span>
            </button>
          {/if}

          {#if id}
            <button type="button" onclick={copyListId} class="mx-auto block text-xs text-muted underline active:opacity-70">
              {t("copy_list_id")}
            </button>
          {/if}
        </div>

        <hr class="border-default" />

        <!-- Current members -->
        <div>
          <p class="font-semibold mb-2">{t("list_members")}</p>

          <ul class="space-y-1">
            {#each members as member (member.id)}
              {@const contact = member.contact}
              <li class="flex items-center gap-3 rounded-xl bg-card px-3 py-2 min-h-14">
                {@render avatar(memberLabel(member), 36)}
                <span class="grow flex items-center gap-1 truncate">
                  {#if member.role === "admin"}
                    <Icon name="crown" size={12} />
                  {/if}
                  <span class="truncate">{memberLabel(member)}</span>
                </span>
                {#if contact?.name && contact.email_address}
                  <span class="text-xs text-muted truncate">{contact.email_address}</span>
                {/if}

                {#if canRemove(member)}
                  <button
                    type="button"
                    title={t("remove_from_list")}
                    aria-label={t("remove_from_list")}
                    class="text-error shrink-0 disabled:opacity-50"
                    disabled={pending.has(member.id)}
                    onclick={() => (member_to_remove = member)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                {/if}
              </li>
            {:else}
              <li class="text-sm text-muted">
                {#if is_loading}
                  <Icon name="loading" size={20} class="animate-spin" />
                {:else}
                  {is_shared ? t("no_members_yet") : t("just_you")}
                {/if}
              </li>
            {/each}
          </ul>
        </div>

        <!-- Add contacts (admin only). Sharing needs an account. -->
        {#if is_admin && !is_signed_in}
          <p class="text-sm text-muted">{t("sign_in_to_share")}</p>
        {:else if is_admin}
          <div>
            <p class="font-semibold mb-2">{t("add_member")}</p>

            {#if !available_contacts.length}
              <p class="text-sm text-muted mb-2">{t("no_contacts_to_add")}</p>
            {:else}
              {#if available_contacts.length >= SEARCH_THRESHOLD}
                <input
                  type="search"
                  bind:value={search}
                  placeholder={t("search_contacts")}
                  aria-label={t("search_contacts")}
                  class="bg-card border border-default p-2 mb-2 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary"
                />
              {/if}

              <ul class="space-y-2 mb-2">
                {#each filtered_contacts as contact (contact.id)}
                  {@const label = contact.name || contact.email_address || ""}
                  <li>
                    <!-- The whole card adds the contact; the pill only shows what a tap does. -->
                    <button
                      type="button"
                      aria-label={t("add_member_named", { name: label })}
                      class="w-full flex items-center gap-3 min-h-16 px-3 py-2 rounded-xl bg-card border border-default text-left active:scale-[0.98] disabled:opacity-60"
                      disabled={pending.has(contact.id)}
                      onclick={() => requestAddMember(contact)}
                    >
                      {@render avatar(label, 40)}
                      <span class="grow min-w-0 flex flex-col">
                        <span class="font-semibold truncate">{label}</span>
                        {#if contact.name && contact.email_address}
                          <span class="text-sm text-muted truncate">{contact.email_address}</span>
                        {/if}
                      </span>
                      <span class="shrink-0 flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-alt text-sm font-semibold">
                        {#if pending.has(contact.id)}
                          <Icon name="loading" size={14} class="animate-spin" />
                        {:else}
                          <Icon name="plus" size={14} />
                        {/if}
                        {t("add")}
                      </span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}

            {#if !is_loading}
              <button
                type="button"
                class="w-full flex items-center gap-3 min-h-14 px-3 py-2 rounded-xl border border-dashed border-default text-left"
                onclick={() => (invite_open = true)}
              >
                <span class="shrink-0 h-10 w-10 rounded-full border border-dashed border-primary text-primary flex items-center justify-center">
                  <Icon name="user-plus" size={18} />
                </span>
                <span class="flex flex-col">
                  <span class="font-semibold text-primary">{t("invite_someone_new")}</span>
                  <span class="text-xs text-muted">{t("invite_someone_new_hint")}</span>
                </span>
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center px-4 py-3 border-t border-default shrink-0">
        {#if is_owner && id}
          <ButtonDeleteList list_id={id} {task_count} {is_shared} ondelete={leavePage} />
        {:else if my_member}
          <ButtonLeaveList member_id={my_member.id} onleave={leavePage} />
        {/if}
      </div>
    </div>
  </div>

  <ModalEditListInfo bind:open={edit_open} {name} {description} {completable} {target_date} onsubmit={handleEditSave} />
  <ModalSendInvite bind:open={invite_open} />

  <Modal is_open={!!contact_to_share} close_on_outside_click={false} onclose={() => (contact_to_share = null)}>
    <ModalHeader>{t("share_list")}</ModalHeader>
    <p class="text-sm mt-4 mb-6">
      {t("confirm_share_list", {
        count: task_count,
        name: contact_to_share?.name || contact_to_share?.email_address || "",
      })}
    </p>
    <footer class="flex gap-2 justify-between">
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-card" onclick={() => (contact_to_share = null)}>
        {t("cancel")}
      </button>
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-primary text-alt" onclick={confirmShare}>
        {t("share")}
      </button>
    </footer>
  </Modal>

  <Modal is_open={!!member_to_remove} close_on_outside_click={false} onclose={() => (member_to_remove = null)}>
    <ModalHeader>{t("remove_from_list")}</ModalHeader>
    <p class="text-sm mt-4 mb-6">{t("confirm_remove_member")}</p>
    <footer class="flex gap-2 justify-between">
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-card" onclick={() => (member_to_remove = null)}>
        {t("cancel")}
      </button>
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-error text-alt" onclick={confirmRemoveMember}>
        {t("remove_from_list")}
      </button>
    </footer>
  </Modal>
{/if}

{#snippet avatar(/** @type {string} */ label, /** @type {number} */ size)}
  <span
    class="shrink-0 rounded-full bg-surface text-muted font-semibold uppercase flex items-center justify-center"
    style="width: {size}px; height: {size}px;"
    aria-hidden="true"
  >
    {label.trim().charAt(0) || "?"}
  </span>
{/snippet}
