<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { t } from "$lib/services/language.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import Modal from "./modal/Modal.svelte";
  import { Selected } from "$lib/selected.svelte";
  import { user } from "$lib/base/user.svelte";
  import { waitAtLeast } from "$lib";
  import { DB } from "$lib/DB";
  import UserTag from "./element/UserTag.svelte";

  /**
   * @typedef {Object} Props
   * @property {() => void} onclose
   */

  /** @type {Props} */
  const { onclose } = $props();

  const categoriesContext = getCategoriesContext();
  const usersContext = getUsersContext();

  let is_open = $state(false);
  let is_adding = $state(false);
  /** @type {string | undefined} */
  let category_id = $state(undefined);
  /** @type {Category[]} */
  let categories = $state([]);

  $effect(() => {
    categories = [...categoriesContext.categories];
    if (categoriesContext.default_category) {
      categories.unshift(categoriesContext.default_category);
    }
  });

  /**
   * Select a category
   * @param {string} id
   */
  async function selectCategory(id) {
    category_id = id;

    await waitAtLeast(async () => {
      const task_ids = [...Selected.tasks];
      const tasks = await DB.Task.getAll({ selector: { id: { $in: task_ids } } });
      const promises = tasks.map(async (task) => {
        if (task.category_id === id) return Promise.resolve(task);
        task.category_id = id;
        await DB.Task.update(task.id, task);
        return task;
      });

      await Promise.all(promises);
    }, 200);

    onclose();
    is_open = false;
  }
</script>

<div>
  <button
    type="button"
    aria-label="Share Task"
    onclick={() => (is_open = true)}
    class="rounded-lg bg-card border border-default font-medium flex justify-between items-center p-4 w-full"
  >
    <span>{t("bulk_assign_category")}</span>
    <Icon name="categories" />
  </button>

  <Modal bind:is_open>
    <h1 class="font-bold mb-4 leading-[120%]">{t("choose_category")}</h1>
    <div class="mb-4 space-y-0.5">
      {#each categories as category, i}
        {@const is_shared = !!category?.users.length && user.is_friends_enabled}
        {@const is_selected = category.id === category_id}
        {@const prev_cat = i > 0 ? categories[i - 1] : null}
        {#if i > 0 && !!category.users.length && !prev_cat?.users.length}
          <h2 class="font-semibold">{t("shared_categories")}</h2>
        {/if}
        <button
          type="button"
          onclick={() => selectCategory(category.id)}
          class={[
            "text-left border rounded-lg border-primary w-full p-2 outline-none",
            is_selected && "bg-primary/20 text-alt",
            !is_selected && "border-default bg-card",
          ]}
        >
          <div class="flex">
            <div
              class={[
                "my-auto flex items-center justify-center w-4 h-4 aspect-square rounded-full border",
                is_selected ? "border-primary" : "",
              ]}
            >
              {#if is_selected}
                <div class="w-2 h-2 bg-primary rounded-full m-auto"></div>
              {/if}
            </div>

            <div class={["w-full p-1", !is_selected && "border-default"]}>
              <span>{category.name || t("DEFAULT_NAME")}</span>
            </div>
          </div>

          {#if is_shared}
            {@const users = category.users.map((email) => usersContext.getUserByEmail(email)).filter((u) => u)}
            {@const me = usersContext.getUserByEmail(user.email_address || "")}
            <div class="flex flex-nowrap gap-1 pb-2 overflow-x-auto">
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
        </button>
      {:else}
        <p class="text-muted italic">{t("no_categories_yet")}</p>
      {/each}
    </div>

    <div>
      <button
        type="button"
        class="w-full mt-1 h-12 bg-card border border-default rounded-md flex items-center justify-center gap-2"
        onclick={() => {
          is_adding = true;
          is_open = false;
        }}
      >
        <Icon name="plus" />
        <span class="block font-medium my-2">{t("add_category")}</span>
      </button>
    </div>
  </Modal>

  <ModalCreateCategory
    bind:open={is_adding}
    oncreate={(new_category_id) => {
      selectCategory(new_category_id);
    }}
    onclose={() => {
      category_id = "";
      onclose();
    }}
  />
</div>
