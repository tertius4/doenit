<script>
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { Check } from "$lib/icon";
  import { SvelteSet } from "svelte/reactivity";
  import CardFriend from "../../routes/categories/CardFriend.svelte";
  import Modal from "./modal/Modal.svelte";
  import { DB } from "$lib/DB";
  import { t } from "$lib/services/language.svelte";
  import InputText from "./element/input/InputText.svelte";
  import { user } from "$lib/base/user.svelte";

  /**
   * @typedef {Object} Props
   * @property {Category} category
   * @property {boolean} is_editing
   */

  /** @type {Props} */
  let { category, is_editing = $bindable() } = $props();
  /** @type {SvelteSet<string>} */
  let edit_users = new SvelteSet();

  let error_message = $state("");

  const usersContext = getUsersContext();

  const original_users = new SvelteSet(category.users || []);

  async function editCategory() {
    try {
      if (!category?.id) return;

      const name = category.name.trim();
      if (!name) {
        error_message = t("enter_category_name");
        return;
      }

      const email_addresses = [...edit_users];

      await DB.Category.update(category.id, {
        name: name,
        users: email_addresses,
      });

      is_editing = false;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert("Error in editCategory: " + error_message);
    }
  }
</script>

<Modal
  bind:is_open={is_editing}
  onsubmit={editCategory}
  onclose={() => {
    error_message = "";
  }}
  class="space-y-4"
>
  <h2 class="text-lg font-semibold">{t("edit_category_name")}</h2>
  <InputText
    bind:value={category.name}
    maxlength="50"
    focus_on_mount
    placeholder={t("enter_category_name")}
    class={{
      "placeholder:text-error! border-error! bg-error/20!": !!error_message,
    }}
    oninput={() => (error_message = "")}
  />

  {#if !!user.is_friends_enabled}
    {#if !!usersContext.map.size}
      <div class="flex flex-col gap-1 overflow-y-auto h-fit">
        <span class="font-semibold">{t("share_category")}</span>
        {#each usersContext.users as category_user}
          {@const is_me = category_user.email_address === user.email_address}
          {@const is_selected = !!category.id && edit_users.has(category_user.email_address)}

          <CardFriend
            is_selectable={!is_me && !original_users.has(category_user.email_address)}
            user={category_user}
            {is_selected}
            onclick={() => {
              if (is_selected) {
                edit_users.delete(category_user.email_address);
              } else {
                edit_users.add(category_user.email_address);
              }
            }}
          />
        {/each}
      </div>
    {/if}
  {/if}

  <button class="bg-primary flex gap-1 items-center text-alt px-4 py-2 rounded-lg ml-auto" type="submit">
    <Check class="h-full" size={18} />
    <span>{t("save")}</span>
  </button>
</Modal>
