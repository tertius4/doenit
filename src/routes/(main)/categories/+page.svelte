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
  import { fade } from "svelte/transition";

  let error_message = $state("");
  let is_editing = $state(false);

  /** @type {Logic.CategoryListItem[]} */
  let categories = $state([]);
  let new_name = $state("");

  const tasks_count_map = $derived(await Api.cats.mapTasksCountToCategories());

  onMount(View.categories.categoryList(categories));
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

    {#if !!new_name}
      <button
        transition:fade
        type="submit"
        class="absolute right-2 bg-surface border-r-3 border-b-3 border-muted rounded p-2 flex items-center justify-center h-8 aspect-square"
      >
        <p class="font-semibold font-mono text-sm">ENTER</p>
      </button>
    {/if}
  </form>

  <div class="flex flex-col space-y-2">
    <CardCategory id="default" name={t("DEFAULT_NAME")} disabled task_count={tasks_count_map.get("default") || 0} />

    {#each categories as { id, name, task_count } (id)}
      <CardCategory {id} {name} {task_count} />
    {/each}
  </div>
</div>
