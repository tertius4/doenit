<script>
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import UserTag from "$lib/components/element/UserTag.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { fly, slide } from "svelte/transition";
  import { SvelteSet } from "svelte/reactivity";
  import { user } from "$lib/core/user.svelte";
  import Api from "$logic/api";
  import { alert } from "$lib/core/alert";
  import Modal from "../../comps/modal";
  import ModalHeader from "../../comps/modal/ModalHeader.svelte";
  import { t } from "$lib/services/language.svelte";
  import InputText from "$lib/components/element/input/InputText.svelte";

  /**
   * @typedef {Object} Props
   * @property {Object} category
   * @property {string} category.id
   * @property {string} category.name
   * @property {string[]} category.users
   * @property {boolean} [disabled]
   * @property {number} task_count
   */

  /** @type {Props} */
  const { category, task_count, disabled = false } = $props();

  const usersContext = getUsersContext();

  let error_message = $state("");
  let is_editing = $state(false);
  let category_name = $state();

  /** @type {SvelteSet<string>} */
  let edit_users = new SvelteSet();

  const is_shared = $derived(!!category.users.length && user.is_friends_enabled);
  const users = $derived(category.users.map((email) => usersContext.getUserByEmail(email)) || []);

  async function deleteCategory() {
    error_message = "";

    const result = await Api.cats.delete(category.id);
    if (result.ok) return;

    alert.error("Failed to delete category", result.error);
  }

  function openEditModal() {
    is_editing = true;
    error_message = "";
    category_name = category.name;

    edit_users.clear();
    for (const email_address of category.users) {
      const user = usersContext.map.get(email_address);
      if (!user) continue;

      edit_users.add(user.email_address);
    }
  }

  /**
   * @param {Event | undefined} e
   */
  async function saveCategory(e) {
    try {
      e?.preventDefault();

      const result = await Api.cats.update(category.id, {
        name: category_name,
        users: [...edit_users],
      });
      if (!result.ok) throw Error(result.error);

      is_editing = false;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert.error("Error", error_message);
    }
  }

  function closeModal() {
    is_editing = false;
  }
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg">
  <div class="grid {disabled ? 'grid-cols-1 px-4' : 'grid-cols-[48px_1fr_48px]'} items-center justify-between">
    <button class="h-full w-full flex justify-center items-center" onclick={openEditModal} hidden={disabled}>
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Icon name="edit" class="w-5 h-5" />
      </div>
    </button>

    <div class="py-3 w-full text-lg font-semibold truncate flex gap-2">
      <span>{category.name}</span>
      <div class="h-fit bg-page rounded-full px-2 aspect-square flex items-center justify-center">
        <span class="text-muted font-light font-mono text-sm">{task_count}</span>
      </div>
    </div>

    <button class="h-full text-error flex items-center justify-center" onclick={deleteCategory} hidden={disabled}>
      <Icon name="trash" class="w-5 h-5" />
    </button>
  </div>

  {#if is_shared}
    {@const me = usersContext.getUserByEmail(user.email_address || "")}
    <div class="flex flex-nowrap gap-1 pb-2 px-2 overflow-x-auto">
      {#if me}
        <UserTag user={me} />
      {/if}

      {#each users as user (user?.email_address)}
        {@const is_me = !!me && user?.email_address === me?.email_address}
        {#if user && !is_me}
          <UserTag {user} />
        {/if}
      {/each}
    </div>
  {/if}
</div>

<Modal bind:is_open={is_editing} onclose={closeModal} onsubmit={saveCategory} class="space-y-4">
  <ModalHeader>{t("edit_category_name")}</ModalHeader>
  <InputText
    bind:value={category_name}
    maxlength="50"
    focus_on_mount
    placeholder={t("enter_category_name")}
    oninput={() => (error_message = "")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
  />
  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-lg ml-auto" type="submit">
    <Icon name="check" size={20} />
    <span>{t("save")}</span>
  </button>
</Modal>
