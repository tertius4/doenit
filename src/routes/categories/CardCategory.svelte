<script>
  import { user } from "$lib/base/user.svelte";
  import { DB } from "$lib/DB";
  import Edit from "$lib/icon/Edit.svelte";
  import Trash from "$lib/icon/Trash.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { SvelteSet } from "svelte/reactivity";
  import { fly, slide } from "svelte/transition";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import UserTag from "$lib/components/element/UserTag.svelte";
  import EditCategory from "$lib/components/EditCategory.svelte";

  /**
   * @typedef {Object} Props
   * @property {Category} category
   * @property {number} task_count
   * @property {string} [default_id]
   */

  /** @type {Props} */
  const { category, default_id, task_count } = $props();

  const usersContext = getUsersContext();

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
    }).catch(() => []);
    if (!online_category) return;

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
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg">
  <div class="grid grid-cols-[52px_1fr_48px] items-center justify-between">
    <button class="h-full w-full flex justify-center items-center" onclick={() => openEditModal()}>
      <div class="rounded-full p-2 w-fit flex justify-center items-center bg-card">
        <Edit />
      </div>
    </button>

    <div class="py-3 w-full text-lg font-semibold truncate flex gap-2">
      <span>{category.name}</span>
      <div class="h-fit bg-page rounded-full px-2 aspect-square flex items-center justify-center">
        <span class="text-muted font-light">{task_count}</span>
      </div>
    </div>

    <button class="h-full text-error flex items-center justify-center" onclick={() => deleteCategory()}>
      <Trash />
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

<EditCategory bind:is_editing {category} />
