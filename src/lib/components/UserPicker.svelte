<script>
  import { getCategoriesContext } from "$lib/contexts/categories.svelte";
  import ButtonClear from "./element/button/ButtonClear.svelte";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { t } from "$lib/services/language.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import Modal from "./modal/Modal.svelte";
  import { wait } from "$lib";
  import CardFriend from "../../routes/categories/CardFriend.svelte";

  /**
   * @typedef {Object} Props
   * @property {User | undefined} user
   * @property {string} category_id
   */

  /** @type {Props & Record<string, any>} */
  let { user = $bindable(), category_id } = $props();

  const usersContext = getUsersContext();
  const categoriesContext = getCategoriesContext();

  let is_open = $state(false);

  const category = $derived(categoriesContext.getCategoryById(category_id));
  const users = $derived(category?.users.map((address) => usersContext.getUserByEmail(address)));
</script>

{#if !!users?.length}
  <div>
    <span class="font-semibold">{t("choose_user")}</span>
    <div class="relative">
      <button
        type="button"
        class={[
          "text-left bg-card p-2 w-full border border-default rounded-lg appearance-none outline-none focus:ring ring-primary pr-6 truncate",
        ]}
        onclick={() => (is_open = true)}
      >
        {#if user}
          <div class="flex items-center gap-1">
            <img
              src={user.avatar}
              alt={t("profile")}
              class="inline-block w-5 h-5 rounded-full mr-2 align-middle"
              referrerpolicy="no-referrer"
            />
            <div>{user.name}</div>
          </div>
        {:else}
          <span class="text-muted">{t("anyone")}</span>
        {/if}
      </button>

      {#if user}
        <ButtonClear onclick={() => (user = undefined)} class="absolute right-0 top-0 bottom-0" />
      {:else}
        <div class="aspect-square h-11 flex items-center justify-center absolute right-0 top-0 bottom-0">
          <Icon name="down-chevron" class="text-muted pointer-events-none" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<Modal bind:is_open>
  <h1 class="font-bold mb-4 leading-[120%]">{t("choose_user")}</h1>
  <div class="mb-4 space-y-0.5">
    {#each users as _user}
      {#if _user}
        <CardFriend
          user={_user}
          is_selected={user?.email_address === _user.email_address}
          onclick={async () => {
            user = _user;

            await wait(200); // wait for modal close animation
            is_open = false;
          }}
        />
      {/if}
    {:else}
      <p class="text-muted italic">{t("no_users_yet")}</p>
    {/each}
  </div>
</Modal>
