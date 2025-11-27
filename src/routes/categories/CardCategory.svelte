<script>
  import CardFriend from "./CardFriend.svelte";
  import InputText from "$lib/components/element/input/InputText.svelte";
  import Modal from "$lib/components/modal/Modal.svelte";
  import { user } from "$lib/base/user.svelte";
  import { DB } from "$lib/DB";
  import { Check } from "$lib/icon";
  import Edit from "$lib/icon/Edit.svelte";
  import Trash from "$lib/icon/Trash.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { t } from "$lib/services/language.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { fly, slide } from "svelte/transition";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import UserTag from "$lib/components/element/UserTag.svelte";

  /**
   * @typedef {Object} Props
   * @property {Category} category
   * @property {string} [default_id]
   */

  /** @type {Props} */
  const { category, default_id } = $props();

  const usersContext = getUsersContext();

  const original_users = new SvelteSet(category.users || []);

  /** @type {SvelteSet<string>} */
  let edit_users = new SvelteSet();

  let error_message = $state("");
  let is_editing = $state(false);

  const is_shared = $derived(!!category.users.length && user.is_friends_enabled);
  const users = $derived(category.users.map((email) => usersContext.getUserByEmail(email)) || []);

  async function deleteCategory() {
    if (category.id === default_id) return;

    await DB.Category.delete(category.id);

    if (!user.is_friends_enabled) return;
    const [online_category] = await OnlineDB.Category.getAll({
      filters: [{ field: "category_id", operator: "==", value: category.id }],
    });
    const users = (category.users || []).filter((email) => email !== user.email_address);
    await OnlineDB.Category.updateById(online_category.id, {
      category_id: category.id,
      users,
    });
  }

  function openEditModal() {
    is_editing = true;

    error_message = "";

    edit_users.clear();
    for (const email_address of category.users) {
      const user = usersContext.map.get(email_address);
      if (!user) continue;

      edit_users.add(user.email_address);
    }
  }

  async function editCategory() {
    try {
      if (!category?.id) return;
      if (category.id === default_id) return;

      const name = category.name.trim();
      if (!name) {
        error_message = t("enter_category_name");
        return;
      }

      const email_addresses = [...edit_users];

      await DB.Category.update(category.id, {
        name: name,
        users: email_addresses,
      });

      is_editing = false;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert("Error in editCategory: " + error_message);
    }
  }
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg">
  <div class="grid grid-cols-[52px_1fr_48px] items-center justify-between">
    <button class="h-full w-full flex justify-center items-center" onclick={() => openEditModal()}>
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Edit />
      </div>
    </button>

    <div class="py-3 w-full text-lg font-semibold truncate">
      <span>{category.name}</span>
    </div>

    <button class="h-full text-error flex items-center justify-center" onclick={() => deleteCategory()}>
      <Trash />
    </button>
  </div>

  {#if is_shared}
    <div class="flex flex-nowrap gap-1 pb-2 overflow-x-auto">
      {#each users as user (user?.email_address)}
        {#if user}
          <UserTag {user} />
        {/if}
      {/each}
    </div>
  {/if}
</div>

<Modal
  bind:is_open={is_editing}
  onsubmit={editCategory}
  onclose={() => {
    error_message = "";
  }}
  class="space-y-4"
>
  <h2 class="text-lg font-semibold">{t("edit_category_name")}</h2>
  <InputText
    bind:value={category.name}
    maxlength="50"
    focus_on_mount
    placeholder={t("enter_category_name")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
    oninput={() => (error_message = "")}
  />

  {#if !!user.is_friends_enabled}
    {#if !!usersContext.map.size}
      <div class="flex flex-col gap-1 overflow-y-auto h-fit">
        <span class="font-semibold">{t("share_category")}</span>
        {#each usersContext.users as category_user}
          {@const is_me = category_user.email_address === user.email_address}
          {@const is_selected = !!category.id && edit_users.has(category_user.email_address)}

          <CardFriend
            is_selectable={!is_me && !original_users.has(category_user.email_address)}
            user={category_user}
            {is_selected}
            onclick={() => {
              if (is_selected) {
                edit_users.delete(category_user.email_address);
              } else {
                edit_users.add(category_user.email_address);
              }
            }}
          />
        {/each}
      </div>
    {/if}
  {/if}

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-lg ml-auto" type="submit">
    <Check class="h-full" size={18} />
    <span>{t("save")}</span>
  </button>
</Modal>
