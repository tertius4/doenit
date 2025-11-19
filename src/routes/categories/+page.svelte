<script>
  import InputText from "$lib/components/element/input/InputText.svelte";
  import Modal from "$lib/components/modal/Modal.svelte";
  import { Trash, Plus, Edit, Check } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";
  import { fly, slide } from "svelte/transition";
  import { onMount } from "svelte";
  import { DB } from "$lib/DB";
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";
  import user from "$lib/core/user.svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { OnlineDB } from "$lib/OnlineDB";
  import CardCategory from "./CardCategory.svelte";

  let new_category_name = $state("");
  /** @type {string?} */
  let default_id;
  /** @type {SvelteMap<string, User>} */
  let users_map = new SvelteMap();
  /** @type {Subscription?} */
  let unsubscribeUsers = null;

  let error_message = $state("");
  let is_editing = $state(false);
  /** @type {Category[]} */
  let categories = $state([]);

  $effect(() => {
    if (unsubscribeUsers) unsubscribeUsers.unsubscribe();
    if (!user.value?.is_friends_enabled) return;

    unsubscribeUsers = DB.User.subscribe((u) => {
      users_map.clear();
      for (const user of u) {
        users_map.set(user.email_address, user);
      }
    });

    return () => {
      if (unsubscribeUsers) unsubscribeUsers.unsubscribe();
    };
  });

  onMount(() => {
    const sub = DB.Category.subscribe((result) => (categories = result), {
      selector: { archived: { $ne: true }, is_default: { $ne: true } },
      sort: [{ name: "asc" }],
    });

    return () => sub.unsubscribe();
  });

  onMount(async () => {
    const category = await DB.Category.getDefault();
    default_id = category.id;
  });

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

    {#each categories as category (category.id)}
      <CardCategory {category} {default_id} {users_map} />
    {/each}
  </div>
</div>
