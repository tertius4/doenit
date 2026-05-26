<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import OptionCategory from "./OptionCategory.svelte";
  import Api from "$logic/api";
  import { onMount } from "svelte";
  import { wait } from "$lib";

  /**
   * @typedef {Object} Props
   * @property {string | undefined} scope_id
   * @property {string | undefined} value
   */

  /** @type {Props & Record<string, any>} */
  let { scope_id, value = $bindable(undefined) } = $props();

  /** @type {(DB.Member & { contact: { name?: string, email_address: string } | null })[]} */
  let members = $state([]);

  onMount(async () => {
    if (!scope_id) return;
    const result = await Api.groups.getMembers(scope_id);
    if (result.ok) members = result.value;
  });

  let is_open = $state(false);

  const selected_member = $derived(members.find((m) => m.firebase_uid === value) ?? null);

  /**
   * @param {DB.Member & { contact: { name?: string, email_address: string } | null }} member
   * @returns {string}
   */
  function displayName(member) {
    return member.contact?.name || member.contact?.email_address || member.firebase_uid;
  }

  /**
   * @param {string} firebase_uid
   */
  async function selectMember(firebase_uid) {
    value = firebase_uid;
    await wait(200);
    is_open = false;
  }
</script>

{#if scope_id && members.length > 0}
  <div>
    <label class="font-semibold" for="assignee">{t("choose_user")}</label>
    <div class="relative">
      <button
        type="button"
        id="assignee"
        class={[
          "text-left bg-card h-12 p-2 w-full border border-default rounded-lg appearance-none outline-none focus:ring ring-primary pr-6 truncate",
          !selected_member && "text-muted",
        ]}
        onclick={() => (is_open = true)}
      >
        {#if selected_member}
          <span>{displayName(selected_member)}</span>
        {:else}
          <span>{t("unassigned")}</span>
        {/if}
      </button>

      {#if selected_member}
        <ButtonClear onclick={() => (value = undefined)} class="absolute right-0 top-0 bottom-0" />
      {:else}
        <div
          class="aspect-square h-12 flex items-center justify-center absolute right-0 top-0 bottom-0 pointer-events-none"
        >
          <Icon name="chevron-down" class="pointer-events-none {is_open ? '-rotate-180' : ''}" />
        </div>
      {/if}
    </div>
  </div>

  <Modal bind:is_open class="*:space-y-4">
    <ModalHeader>{t("choose_user")}</ModalHeader>
    <div class="space-y-1">
      {#each members as member (member.id)}
        <OptionCategory
          is_selected={member.firebase_uid === value}
          label={displayName(member)}
          onclick={() => selectMember(member.firebase_uid)}
        />
      {/each}
    </div>
  </Modal>
{/if}
