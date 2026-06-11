<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import { onMount } from "svelte";
  import { backHandler } from "$logic/navigation";
  import { on } from "svelte/events";
  import CloseButton from "$display/comps/modal/CloseButton.svelte";
  import ModalEditGroupInfo from "./ModalEditGroupInfo.svelte";
  import ButtonLeaveGroup from "./ButtonLeaveGroup.svelte";
  import ButtonDisbandGroup from "./ButtonDisbandGroup.svelte";
  import { goto } from "$app/navigation";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false]
   * @prop {string} [id]
   * @prop {string} [owner_id]
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {(id: string) => *} [onsubmit]
   * @prop {() => *} [onclose]
   */

  /** @type {Props & Record<string, any>} */
  let { open = $bindable(false), id, owner_id, name = "", description = "", ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { onsubmit, onclose, ...rest } = props;

  let edit_open = $state(false);

  /** @type {(DB.Member & {contact: DB.Contact | null})[]} */
  let members = $state([]);
  /** @type {DB.Contact[]} */
  let all_contacts = $state([]);

  const is_admin = $derived(!owner_id || owner_id === (context.user?.id || "device"));
  const my_member = $derived(members.find((m) => m.contact && isMe(m.contact)) ?? null);
  const member_contact_ids = $derived(new Set(members.map((m) => m.firebase_uid)));
  const available_contacts = $derived(all_contacts.filter((c) => !member_contact_ids.has(c.firebase_uid)));

  async function loadMembers() {
    if (!id) return;

    const [members_result, contacts_result] = await Promise.all([Api.groups.getMembers(id), Api.groups.getContacts()]);

    if (members_result.ok) members = members_result.value;
    if (contacts_result.ok) all_contacts = contacts_result.value;
  }

  $effect(() => {
    if (open) loadMembers();
    if (!open) {
      members = [];
      all_contacts = [];
    }
  });

  /** @param {string} contact_id */
  async function addMember(contact_id) {
    if (!id) return;
    const result = await Api.groups.addMember(id, contact_id);
    if (!result.ok) return toast.error(result.error);
    await loadMembers();
  }

  /**
   * @param {DB.Member & {contact: DB.Contact | null}} member
   */
  async function removeMember(member) {
    const result = await Api.groups.removeMember(member.id);
    if (!result.ok) return toast.error(result.error);
    await loadMembers();
  }

  /**
   * @param {string} new_name
   * @param {string} new_description
   */
  async function handleEditSave(new_name, new_description) {
    const result = await Api.groups.save({ id: id, name: new_name, description: new_description });
    if (!result.ok) return toast.error(result.error);
  }

  function handleClose() {
    id = id;
    open = false;
    if (onclose) onclose();
  }

  /** @param {DB.Contact} contact */
  function isMe(contact) {
    return !!context.user?.email_address && contact.email_address === context.user.email_address;
  }

  onMount(() => {
    const token = backHandler.register(() => {
      if (open) handleClose();
      return open;
    }, 1000);

    return () => backHandler.unregister(token);
  });

  $effect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  });

  function closeOnEsc() {
    return on(window, "keydown", (e) => {
      if (e.key === "Escape") handleClose();
    });
  }
</script>

{#if open}
  <div
    aria-modal="true"
    {@attach closeOnEsc}
    role="dialog"
    class="fixed inset-0 z-40 bg-surface"
    style="top: env(safe-area-inset-top); bottom: env(safe-area-inset-bottom); left: env(safe-area-inset-left); right: env(safe-area-inset-right);"
    {...rest}
  >
    <div class="relative flex flex-col h-full w-full">
      <CloseButton class="absolute top-2 right-2" onclose={handleClose} />

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto p-4 pt-8 space-y-4">
        <div class="flex items-center justify-center">
          <h1 class="text-center text-3xl font-semibold">{name}</h1>
        </div>

        {#if description}
          <p class="text-center text-muted">{description}</p>
        {/if}

        <hr class="border-default" />

        <!-- Current members -->
        <div>
          <p class="font-semibold mb-2">{t("group_members")}</p>

          <ul class="space-y-1">
            {#each members as member (member.id)}
              {@const contact = member.contact}
              {#if contact}
                <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2 h-10">
                  <span class="grow truncate text-sm">{contact.name}</span>
                  <span class="text-xs text-muted truncate">{contact.email_address}</span>

                  {#if is_admin || isMe(contact)}
                    <button
                      type="button"
                      title={isMe(contact) ? t("leave_group") : t("remove_from_group")}
                      class="text-error shrink-0"
                      onclick={() => removeMember(member)}
                    >
                      <Icon name={isMe(contact) ? "leave" : "trash"} size={18} />
                    </button>
                  {/if}
                </li>
              {/if}
            {:else}
              <li class="text-sm text-muted">{t("no_members_yet")}</li>
            {/each}
          </ul>
        </div>

        <!-- Add contacts (admin only) -->
        {#if is_admin}
          <div>
            <p class="font-semibold mb-2">{t("add_member")}</p>

            {#if !available_contacts.length}
              <p class="text-sm text-muted">{t("no_contacts_to_add")}</p>
            {:else}
              <ul class="space-y-1">
                {#each available_contacts as contact (contact.id)}
                  <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                    <span class="grow truncate text-sm">{contact.name}</span>
                    <span class="text-xs text-muted truncate">{contact.email_address ?? ""}</span>
                    <button
                      type="button"
                      title={t("add_member")}
                      class="text-primary shrink-0"
                      onclick={() => addMember(contact.id)}
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
      <div class="flex items-center justify-between px-4 py-3 border-t border-default shrink-0">
        <div>
          {#if is_admin && id}
            <ButtonDisbandGroup
              group_id={id}
              ondisband={() => {
                open = false;
                goto("/groups", { replaceState: true, invalidateAll: true });
              }}
            />
          {:else if !is_admin && my_member}
            <ButtonLeaveGroup member_id={my_member.id} onleave={handleClose} />
          {/if}
        </div>

        {#if is_admin}
          <button
            type="button"
            class="bg-primary text-alt p-3 rounded-full shadow-md"
            title={t("edit_group")}
            onclick={() => (edit_open = true)}
          >
            <Icon name="edit" size={20} />
          </button>
        {/if}
      </div>
    </div>
  </div>

  <ModalEditGroupInfo bind:open={edit_open} {id} {name} {description} onsubmit={handleEditSave} />
{/if}
