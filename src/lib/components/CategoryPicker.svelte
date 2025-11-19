<script>
  import ModalCreateCategory from "$lib/components/modal/ModalCreateCategory.svelte";
  import { t } from "$lib/services/language.svelte";
  import { DownChevron, Plus, Times } from "$lib/icon";
  import { onMount, tick } from "svelte";
  import { DB } from "$lib/DB";
  import Modal from "./modal/Modal.svelte";
  import { wait } from "$lib";
  import ButtonClear from "./element/button/ButtonClear.svelte";
  import user from "$lib/core/user.svelte";

  let { category_id = $bindable() } = $props();

  /** @type {Category[]} */
  let categories = $state([]);
  let is_open = $state(false);
  let is_adding = $state(false);

  const category = $derived(categories.find((c) => c.id === category_id));

  $effect(() => {
    if (category_id === null) {
      is_adding = true;
    }
  });

  onMount(() => {
    const sub = DB.Category.subscribe(assignCategories, {
      selector: { archived: { $ne: true }, is_default: { $ne: true } },
      sort: [{ name: "asc" }],
    });

    return () => sub.unsubscribe();
  });

  /**
   * @param {Category[]} new_categories
   */
  function assignCategories(new_categories) {
    const is_mounted = !categories.length;
    categories = new_categories;

    if (is_mounted) return;
    const category_exists = categories.some((c) => c.id === category_id);
    if (!category_exists) category_id = "";
  }

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
    {#each categories as category}
      {@const is_selected = category.id === category_id}
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

        {#if user.value?.is_friends_enabled}
          <div class="flex flex-nowrap gap-1 overflow-x-auto">
            {#each category.users as email_address}
              <!-- {@const user = users_map.get(email_address)} -->
              <!-- {#if user} -->
              <p
                class={{
                  "px-1.5 rounded-full  text-normal w-fit border flex gap-0.5 items-center": true,
                  "border-primary bg-primary/40 text-alt": is_selected,
                  "border-default bg-card": !is_selected,
                }}
              >
                <!-- <img class="w-3.5 h-3.5 rounded-full" src={user.avatar} alt={user.name} referrerpolicy="no-referrer" /> -->
                <span>{email_address}</span>
              </p>
              <!-- {/if} -->
            {:else}
              <p
                class={{
                  "text-muted w-fit italic": !is_selected,
                  "text-alt opacity-50 w-fit italic": is_selected,
                }}
              >
                Hierdie kategorie is privaat
              </p>
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
      <span>{t("add_category")}</span>
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
