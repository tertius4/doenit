<script>
  import InputText from "../input/InputText.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import Modal from "./Modal.svelte";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";

  /**
   * @typedef {{ id: string; contact_id: string; contact: DB.Contact | null }} GroupMember
   */

  /**
   * @typedef {Object} Props
   * @prop {boolean} [open=false] - Whether the modal is open.
   * @prop {string} [id] - The ID of the group to edit (undefined if creating a new group).
   * @prop {string} [owner_user_id] - The owner/admin user ID of the group.
   * @prop {string} [name] - The name of the group.
   * @prop {string} [description] - The description of the group.
   * @prop {(id: string) => *} [onsubmit] - Callback when a group is created/saved.
   * @prop {() => *} [onclose] - Callback when the modal is closed.
   */

  /** @type {Props & Record<string, any>} */
  let { open = $bindable(false), id, owner_user_id, name = "", description = "", ...props } = $props();
  // svelte-ignore state_referenced_locally
  const { onsubmit, onclose, ...rest } = props;

  // svelte-ignore state_referenced_locally
  let saved_id = $state(id);
  // svelte-ignore state_referenced_locally
  let saved_owner_user_id = $state(owner_user_id);

  let error_message = $state("");

  /** @type {GroupMember[]} */
  let members = $state([]);
  /** @type {DB.Contact[]} */
  let all_contacts = $state([]);

  const is_creating = $derived(!saved_id);
  const is_admin = $derived(
    !saved_owner_user_id || saved_owner_user_id === (context.user?.id || "device")
  );

  const member_contact_ids = $derived(new Set(members.map((m) => m.contact_id)));
  const available_contacts = $derived(all_contacts.filter((c) => !member_contact_ids.has(c.id)));

  async function loadMembers() {
    if (!saved_id) return;

    const [members_result, contacts_result] = await Promise.all([
      Api.groups.getGroupContacts(saved_id),
      Api.groups.getContacts(),
    ]);

    if (members_result.ok) members = members_result.value;
    if (contacts_result.ok) all_contacts = contacts_result.value;
  }

  $effect(() => {
    if (open && saved_id) loadMembers();
    if (!open) {
      members = [];
      all_contacts = [];
      error_message = "";
    }
  });

  async function saveGroup() {
    error_message = "";

    const result = await Api.groups.save({ id: saved_id, name, description: description || undefined });
    if (!result.ok) return (error_message = result.error);

    saved_id = result.value.id;
    saved_owner_user_id = result.value.owner_user_id;

    await loadMembers();

    if (onsubmit) onsubmit(result.value.id);
  }

  /** @param {string} contact_id */
  async function addMember(contact_id) {
    if (!saved_id) return;
    const result = await Api.groups.addContact(saved_id, contact_id);
    if (!result.ok) return toast.error(result.error);
    await loadMembers();
  }

  /** @param {GroupMember} member */
  async function removeMember(member) {
    const result = await Api.groups.removeContact(member.id);
    if (!result.ok) return toast.error(result.error);
    await loadMembers();
  }

  function handleClose() {
    error_message = "";
    saved_id = id;
    saved_owner_user_id = owner_user_id;
    if (onclose) onclose();
  }

  /**
   * @param {DB.Contact} contact
   */
  function isMe(contact) {
    return !!context.user?.id && contact.user_id === context.user.id;
  }
</script>

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveGroup} class="*:space-y-4" {...rest}>
  <ModalHeader>{is_creating ? t("create_new_group") : t("edit_group")}</ModalHeader>

  <InputText
    value={name}
    onchange={(value) => (name = value)}
    focus_on_mount={is_creating}
    maxlength="100"
    placeholder={t("enter_group_name")}
    onfocus={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />

  <InputText
    value={description}
    onchange={(value) => (description = value)}
    maxlength="250"
    placeholder={t("enter_group_description")}
  />

  {#if error_message}
    <p class="text-sm text-error">{error_message}</p>
  {/if}

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-md ml-auto" type="submit">
    <Icon name={is_creating ? "plus" : "save"} size={20} />
    <span>{is_creating ? t("create") : t("save")}</span>
  </button>

  {#if saved_id}
    <hr class="border-default" />

    <!-- Current members -->
    <div>
      <p class="font-semibold mb-2">{t("group_members")}</p>

      {#if members.length === 0}
        <p class="text-sm text-muted">&mdash;</p>
      {:else}
        <ul class="space-y-1">
          {#each members as member (member.id)}
            {@const contact = member.contact}
            {#if contact}
              <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
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
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Add contacts (admin only) -->
    {#if is_admin}
      <div>
        <p class="font-semibold mb-2">{t("add_member")}</p>

        {#if available_contacts.length === 0}
          <p class="text-sm text-muted">{t("no_contacts_to_add")}</p>
        {:else}
          <ul class="space-y-1">
            {#each available_contacts as contact (contact.id)}
              <li class="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                <span class="grow truncate text-sm">{contact.name}</span>
                <span class="text-xs text-muted truncate">{contact.email_address}</span>
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
  {/if}
</Modal>
