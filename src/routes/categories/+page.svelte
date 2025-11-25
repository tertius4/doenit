<script>
  import InputText from "$lib/components/element/input/InputText.svelte";
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { t } from "$lib/services/language.svelte";
  import CardCategory from "./CardCategory.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { goto } from "$app/navigation";
  import { Plus } from "$lib/icon";
  import { onMount } from "svelte";
  import { DB } from "$lib/DB";

  const categoriesContext = getCategoriesContext();

  let new_category_name = $state("");

  let error_message = $state("");
  let is_editing = $state(false);

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  /**
   * @param {Event} e
   */
  async function createCategory(e) {
    e.preventDefault();

    if (!new_category_name?.trim()) {
      error_message = t("enter_category_name");
      return;
    }

    await DB.Category.create({
      name: new_category_name.trim(),
      is_default: false,
      users: [],
    });

    new_category_name = "";
  }
</script>

<div class="flex flex-col space-y-4 pt-2">
  <div>
    <form onsubmit={createCategory} class="flex gap-2 items-center h-12">
      <InputText
        bind:value={new_category_name}
        maxlength="50"
        placeholder={t("enter_new_category_name")}
        class={{
          "placeholder:text-error! border-error! bg-error/20!": !!error_message && !is_editing,
        }}
        oninput={() => (error_message = "")}
      />

      <button class="h-full rounded-lg bg-card border border-default px-4 py-2 font-medium focus:outline-none">
        <Plus />
      </button>
    </form>
  </div>

  <div class="flex flex-col space-y-2">
    <div class="flex items-center justify-between px-4 py-2 bg-surface rounded-md">
      <div class="text-lg font-semibold">{t("DEFAULT_NAME")}</div>
    </div>

    {#each categoriesContext.categories as category, i (category.id)}
      {@const prev_cat = i > 0 ? categoriesContext.categories[i - 1] : null}
      {#if i > 0 && !!category.users.length && !prev_cat?.users.length}
        <h2 class="font-semibold">{t("shared_categories")}</h2>
      {/if}
      <CardCategory {category} default_id={categoriesContext.default_category?.id} />
    {/each}
  </div>
</div>
