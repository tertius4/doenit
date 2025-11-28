<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { t } from "$lib/services/language.svelte";
  import { DownChevron, Plus } from "$lib/icon";
  import Modal from "./modal/Modal.svelte";
  import { wait } from "$lib";
  import ButtonClear from "./element/button/ButtonClear.svelte";
  import { user } from "$lib/base/user.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import UserTag from "./element/UserTag.svelte";

  let { category_id = $bindable() } = $props();

  const categoriesContext = getCategoriesContext();
  const usersContext = getUsersContext();

  let is_open = $state(false);
  let is_adding = $state(false);

  const category = $derived(categoriesContext.getCategoryById(category_id));

  $effect(() => {
    if (category_id === null) {
      is_adding = true;
    }
  });

  /**
   * Select a category
   * @param {string} id
   */
  async function selectCategory(id) {
    category_id = id;

    await wait(200);
    is_open = false;
  }
</script>

<div class="relative">
  <button
    type="button"
    class={[
      "text-left bg-card p-2 w-full border border-default rounded-lg appearance-none outline-none focus:ring ring-primary pr-6 truncate",
      !category && "text-muted",
    ]}
    onclick={() => (is_open = true)}
  >
    {#if category}
      <span>{category.name}</span>
    {:else}
      <span>{t("choose_category")}</span>
    {/if}
  </button>

  {#if category}
    <ButtonClear onclick={() => (category_id = "")} class="absolute right-0 top-0 bottom-0" />
  {:else}
    <div class="aspect-square h-11 flex items-center justify-center absolute right-0 top-0 bottom-0">
      <DownChevron class=" text-muted pointer-events-none" />
    </div>
  {/if}
</div>

<Modal bind:is_open>
  <h1 class="font-bold mb-4 leading-[120%]">{t("choose_category")}</h1>
  <div class="mb-4 space-y-0.5">
    {#each categoriesContext.categories as category, i}
      {@const is_selected = category.id === category_id}
      {@const prev_cat = i > 0 ? categoriesContext.categories[i - 1] : null}
      {#if i > 0 && !!category.users.length && !prev_cat?.users.length}
        <h2 class="font-semibold my-1">{t("shared_categories")}</h2>
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
            <span>{category.name}</span>
          </div>
        </div>

        {#if user.is_friends_enabled && !!category.users.length}
          {@const me = usersContext.getUserByEmail(user.email_address || "")}
          <div class="flex flex-nowrap gap-1 overflow-x-auto">
            {#if me}
              <UserTag user={me} {is_selected} />
            {/if}
            {#each category.users as email_address (email_address)}
              {@const user = usersContext.getUserByEmail(email_address)}
              {@const is_me = !!me && user?.email_address === me?.email_address}
              {#if user && !is_me}
                <UserTag {user} {is_selected} />
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
      <Plus />
      <span class="block font-medium my-2">{t("add_category")}</span>
    </button>
  </div>
</Modal>

<ModalCreateCategory
  bind:open={is_adding}
  oncreate={(new_category_id) => {
    category_id = new_category_id;
  }}
  onclose={() => {
    category_id = "";
  }}
/>
