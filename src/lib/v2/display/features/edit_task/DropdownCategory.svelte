<script>
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import Modal from "$display/comps/modal/Modal.svelte";
  import { wait } from "$lib";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte"
  import { onMount } from "svelte";
  import View from "$display/view";
  import Api from "$logic/api";
  import ModalHeader from "$display/comps/modal/ModalHeader.svelte";
  import OptionCategory from "./OptionCategory.svelte";
  import ModalCategory from "$display/comps/modal/ModalCategory.svelte";

  let { category_id = $bindable() } = $props();

  /** @type {Logic.CategoryAssignTask[]} */
  let categories = $state([]);

  onMount(View.categories.listAssignTask(categories));

  let is_open = $state(false);
  let is_adding = $state(false);

  const category = $derived(await Api.cats.getCategoryById(category_id));

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
    <div
      class="aspect-square h-11 flex items-center justify-center absolute right-0 top-0 bottom-0 pointer-events-none"
    >
      <Icon name="chevron-down" class="text-muted pointer-events-none {is_open ? '-rotate-180' : ''}" />
    </div>
  {/if}
</div>

<Modal bind:is_open class="space-y-4">
  <ModalHeader>{t("choose_category")}</ModalHeader>

  <div class="space-y-1">
    {#each categories as category (category.id)}
      {#if category.show_shared_title}
        <h2 class="font-semibold my-1">{t("shared_categories")}</h2>
      {/if}

      <OptionCategory
        is_selected={category.id === category_id}
        label={category.name || t("DEFAULT_NAME")}
        onclick={() => selectCategory(category.id)}
      />
    {:else}
      <p class="text-muted italic">{t("no_categories_yet")}</p>
    {/each}
  </div>

  <button
    type="button"
    class="w-full mt-1 h-12 bg-card border border-default rounded-md flex items-center justify-center gap-2"
    onclick={() => {
      is_adding = true;
      is_open = false;
    }}
  >
    <Icon name="plus" size={20} />
    <span class="block font-medium my-2">{t("add_category")}</span>
  </button>
</Modal>

<ModalCategory bind:open={is_adding} oncreate={(id) => (category_id = id)} onclose={() => (category_id = "")} />
