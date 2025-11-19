<script>
  import CardFriend from "./CardFriend.svelte";
  import InputText from "$lib/components/element/input/InputText.svelte";
  import Modal from "$lib/components/modal/Modal.svelte";
  import user from "$lib/core/user.svelte";
  import { DB } from "$lib/DB";
  import { Check } from "$lib/icon";
  import Edit from "$lib/icon/Edit.svelte";
  import Trash from "$lib/icon/Trash.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { t } from "$lib/services/language.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { fly, slide } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @property {Category} category
   * @property {string?} default_id
   * @property {import('svelte/reactivity').SvelteMap<string, User>} users_map
   */

  /** @type {Props} */
  const { category, default_id, users_map } = $props();

  const users = category.users.filter((email) => !!email && email !== user.value?.email);
  /** @type {SvelteSet<User>} */
  let edit_users = new SvelteSet();

  let error_message = $state("");
  let is_editing = $state(false);

  async function deleteCategory() {
    if (category.id === default_id) return;

    await DB.Category.delete(category.id);
    if (!user.value?.is_friends_enabled) return;

    const users = (category.users || []).filter((email) => email !== user.value?.email);
    await OnlineDB.Category.update(category.id, {
      category_id: category.id,
      users,
    });
  }

  function openEditModal() {
    is_editing = true;

    error_message = "";

    edit_users.clear();
    for (const email_address of category.users) {
      const user = users_map.get(email_address);
      if (!user) continue;

      edit_users.add(user);
    }
  }

  async function editCategory() {
    if (!category?.id) return;
    if (category.id === default_id) return;

    const name = category.name.trim();
    if (!name) {
      error_message = t("enter_category_name");
      return;
    }

    const email_addresses = [...edit_users].map((u) => u.email_address);
    if (email_addresses.length && user.value?.email) {
      email_addresses.push(user.value?.email);
    }
    await DB.Category.update(category.id, {
      name: name,
      users: email_addresses,
    });

    if (!user.value?.is_friends_enabled) return;

    const [online_category] = await OnlineDB.Category.getAll({
      filters: [{ field: "category_id", operator: "==", value: category.id }],
    });

    if (!!email_addresses.length) {
      if (!!category.users?.length && !!online_category) {
        await OnlineDB.Category.update(online_category.id, {
          name: name,
          category_id: category.id,
          users: email_addresses,
        });
      } else {
        await OnlineDB.Category.create({
          name: name,
          category_id: category.id,
          users: email_addresses,
        });
      }
    } else if (!!online_category) {
      await OnlineDB.Category.delete(online_category.id);
    }

    is_editing = false;
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
  <div class="flex flex-nowrap gap-2 px-2 pb-2 overflow-x-auto">
    {#each users as email_address}
      {@const user = users_map.get(email_address)}
      {#if user}
        <p class="px-1.5 rounded-full bg-card text-normal w-fit border border-default flex gap-0.5 items-center">
          <img class="w-3.5 h-3.5 rounded-full" src={user.avatar} alt={user.name} referrerpolicy="no-referrer" />
          {user.name}
        </p>
      {/if}
    {:else}
      <p class="text-muted w-fit italic">Hierdie kategorie is privaat</p>
    {/each}
  </div>
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

  {#if !!user.value?.is_friends_enabled}
    {@const users = [...users_map.values()]}
    {#if !!users.length}
      <div class="flex flex-col gap-1 overflow-y-auto h-fit">
        <span class="font-semibold">Wie kan hierdie kategorie en sy take sien?</span>
        {#each users as user}
          {@const is_selected = !!category.id && edit_users.has(user)}

          <CardFriend
            {user}
            {is_selected}
            onclick={() => {
              if (is_selected) {
                edit_users.delete(user);
              } else {
                edit_users.add(user);
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
