<script>
  import CardCategory from "$display/features/categories/CardCategory.svelte";
  import InputText from "$lib/components/element/input/InputText.svelte";
  import { backHandler } from "$logic/navigation";
  import { t } from "$lib/services/language.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import View from "$display/view";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Api from "$logic/api";
  import { alert } from "$lib/core/alert";

  let error_message = $state("");
  let is_editing = $state(false);

  /** @type {Logic.CategoryListItem[]} */
  let category_list = $state([]);
  let new_name = $state("");

  const tasks_count_map = $derived(await Api.cats.mapTasksCountToCategories());
  const default_category = $derived(await Api.cats.getDefault());

  onMount(View.categories.categoryList(category_list));
  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });

  /** @param {Event} e */
  async function createCategory(e) {
    e.preventDefault();

    const result = await Api.cats.save({ name: new_name });
    if (!result.ok) alert.error(result.error);

    new_name = "";
  }
</script>

<div class="flex flex-col space-y-4 pt-2">
  <form onsubmit={createCategory} class="flex gap-2 items-center h-12 relative">
    <InputText
      bind:value={new_name}
      maxlength="50"
      placeholder={t("enter_new_category_name")}
      oninput={() => (error_message = "")}
      class={{
        "placeholder:text-error! border-error! bg-error/20!": !!error_message && !is_editing,
      }}
    />

    <button
      class:hidden={!new_name}
      class="absolute right-2 bg-surface border-r-3 border-b-3 border-muted rounded p-2 flex items-center justify-center h-8 aspect-square"
    >
      <p class="font-semibold font-mono text-sm">ENTER</p>
    </button>
  </form>

  <div class="flex flex-col space-y-2">
    <CardCategory
      category={{ id: default_category.id, name: t("DEFAULT_NAME"), users: [] }}
      disabled
      task_count={tasks_count_map.get(default_category.id) || 0}
    />

    {#each category_list as category (category.id)}
      {#if category.has_title}
        <h2 class="font-semibold">{t("shared_categories")}</h2>
      {/if}

      <CardCategory {category} task_count={category.task_count} />
    {/each}
  </div>
</div>
