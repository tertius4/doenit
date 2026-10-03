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
  import ModalEditGroupInfo from "./ModalEditGroupInfo.svelte";
  import ButtonLeaveGroup from "./ButtonLeaveGroup.svelte";
  import ButtonDisbandGroup from "./ButtonDisbandGroup.svelte";
  import { goto, invalidate } from "$app/navigation";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [id]
   * @prop {string} [owner_id]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {() => *} [onclose]
   */

  /** @type {Props} */
  let { open = $bindable(false), id, owner_id, name = "", description = "", onclose } = $props();

  const SEARCH_THRESHOLD = 6;

  let edit_open = $state(false);
  let is_loading = $state(false);
  let search = $state("");

  /** @type {import("$logic/api/groups").GroupMember[]} */
  let members = $state([]);
  /** @type {DB.Contact[]} */
  let all_contacts = $state([]);
  /** @type {Set<string>} ids of contacts/members with a request in flight */
  let pending = $state(new Set());
  /** @type {import("$logic/api/groups").GroupMember | null} */
  let member_to_remove = $state(null);

  const is_owner = $derived(!!owner_id && owner_id === context.user?.id);
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
      const members_promise = Api.groups.getMembers(id);
      const contacts_promise = is_owner ? Api.groups.getContacts() : null;

      const members_result = await members_promise;
      if (current !== load_id) return;
      if (!members_result.ok) return toast.error(members_result.error);
      members = members_result.value;

      const should_load_contacts = is_owner || members.some((m) => m.is_me && m.role === "admin");
      if (!should_load_contacts) return;

      const contacts_result = await (contacts_promise ?? Api.groups.getContacts());
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

  /** @param {DB.Contact} contact */
  function addMember(contact) {
    return once(contact.id, async () => {
      if (!id) return;

      const result = await Api.groups.addMember(id, contact.id);
      if (!result.ok) return toast.error(result.error);

      members = [...members.filter((m) => m.id !== result.value.id), result.value];
    });
  }

  /** @param {import("$logic/api/groups").GroupMember} member */
  function memberLabel(member) {
    if (member.is_me) return t("you");
    return member.contact?.name || member.contact?.email_address || t("unknown_member");
  }

  /** @param {import("$logic/api/groups").GroupMember} member */
  function canRemove(member) {
    // Leaving is done with the leave button; admin rows (the owner) can't be removed.
    return is_admin && !member.is_me && member.role !== "admin";
  }

  async function confirmRemoveMember() {
    const member = member_to_remove;
    if (!member) return;

    await once(member.id, async () => {
      const result = await Api.groups.removeMember(member.id);
      if (!result.ok) return toast.error(result.error);

      members = members.filter((m) => m.id !== member.id);
      member_to_remove = null;
    });
  }

  /**
   * @param {string} new_name
   * @param {string} new_description
   */
  async function handleEditSave(new_name, new_description) {
    const result = await Api.groups.save({ id, name: new_name, description: new_description });
    if (result.ok) await invalidate("groups:page");

    return result;
  }

  function handleClose() {
    open = false;
    if (onclose) onclose();
  }

  /** The user is no longer part of this group, so its page is no longer reachable. */
  function leavePage() {
    open = false;
    goto("/groups", { replaceState: true, invalidateAll: true });
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
    aria-labelledby="edit-group-title"
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
          <h1 id="edit-group-title" class="text-center text-3xl font-semibold wrap-break-word">{name}</h1>

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
              <span>{t("edit_group")}</span>
            </button>
          {/if}
        </div>

        <hr class="border-default" />

        <!-- Current members -->
        <div>
          <p class="font-semibold mb-2">{t("group_members")}</p>

          <ul class="space-y-1">
            {#each members as member (member.id)}
              {@const contact = member.contact}
              <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2 h-12">
                <span class="grow flex items-center gap-1 truncate text-sm">
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
                    title={t("remove_from_group")}
                    aria-label={t("remove_from_group")}
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
                  {t("no_members_yet")}
                {/if}
              </li>
            {/each}
          </ul>
        </div>

        <!-- Add contacts (admin only) -->
        {#if is_admin}
          <div>
            <p class="font-semibold mb-2">{t("add_member")}</p>

            {#if !available_contacts.length}
              <p class="text-sm text-muted">
                {t("no_contacts_to_add")}
                {#if !is_loading}
                  · <a href="/contacts" class="text-primary underline">{t("contacts")}</a>
                {/if}
              </p>
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

              <ul class="space-y-1">
                {#each filtered_contacts as contact (contact.id)}
                  <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2 h-12">
                    <span class="grow truncate text-sm">{contact.name || contact.email_address}</span>
                    {#if contact.name}
                      <span class="text-xs text-muted truncate">{contact.email_address ?? ""}</span>
                    {/if}
                    <button
                      type="button"
                      title={t("add_member")}
                      aria-label={t("add_member")}
                      class="text-primary shrink-0 disabled:opacity-50"
                      disabled={pending.has(contact.id)}
                      onclick={() => addMember(contact)}
                    >
                      <Icon name="plus" size={18} />
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center px-4 py-3 border-t border-default shrink-0">
        {#if is_owner && id}
          <ButtonDisbandGroup group_id={id} ondisband={leavePage} />
        {:else if my_member}
          <ButtonLeaveGroup member_id={my_member.id} onleave={leavePage} />
        {/if}
      </div>
    </div>
  </div>

  <ModalEditGroupInfo bind:open={edit_open} {name} {description} onsubmit={handleEditSave} />

  <Modal is_open={!!member_to_remove} close_on_outside_click={false} onclose={() => (member_to_remove = null)}>
    <ModalHeader>{t("remove_from_group")}</ModalHeader>
    <p class="text-sm mt-4 mb-6">{t("confirm_remove_member")}</p>
    <footer class="flex gap-2 justify-between">
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-card" onclick={() => (member_to_remove = null)}>
        {t("cancel")}
      </button>
      <button type="button" class="text-sm px-4 py-2 rounded-md bg-error text-alt" onclick={confirmRemoveMember}>
        {t("remove_from_group")}
      </button>
    </footer>
  </Modal>
{/if}
