<script>
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";
  import { selected_tasks } from "$display/selected.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { waitAtLeast } from "$lib";
  import View from "$display/view";
  import { onMount } from "svelte";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @property {() => void} onclose
   */

  /** @type {Props} */
  const { onclose } = $props();

  let is_open = $state(false);
  let is_adding = $state(false);
  /** @type {string | undefined} */
  let category_id = $state(undefined);
  /** @type {AL.CategoryListItem[]} */
  let categories = $state([]);

  onMount(View.categories.categoryList(categories));

  /**
   * Select a category
   * @param {string} id
   */
  async function selectCategory(id) {
    category_id = id;

    await waitAtLeast(() => Api.cats.assignTasks(id, [...selected_tasks]), 200);

    onclose();
    is_open = false;
  }
</script>

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
  <ModalHeader>{t("choose_category")}</ModalHeader>
  <div class="mb-4 space-y-0.5">
    {#each categories as category, i}
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
            <span>{category.name || t("DEFAULT_NAME")}</span>
          </div>
        </div>
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

<ModalCategory
  bind:open={is_adding}
  onsubmit={(id) => selectCategory(id)}
  onclose={() => {
    category_id = "";
    onclose();
  }}
/>
