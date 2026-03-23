<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte"
  import Modal from "$display/comps/modal/Modal.svelte";
  import CardFriend from "$lib/components/CardFriend.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { wait } from "$lib";

  /**
   * @typedef {Object} Props
   * @property {User | undefined} user
   * @property {User[]} users
   * @property {string} category_id
   */

  /** @type {Props} */
  let { user = $bindable(), ...props } = $props();
  const { users } = props;

  let is_open = $state(false);

  /**
   * @param {User} selected_user
   */
  async function onselectUser(selected_user) {
    user = selected_user;

    await wait(200); // wait for modal close animation
    is_open = false;
  }
</script>

<div hidden={!users?.length}>
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

<Modal bind:is_open>
  <h1 class="font-bold mb-4 leading-[120%]">{t("choose_user")}</h1>
  <div class="mb-4 space-y-0.5">
    {#each users as user}
      <CardFriend {user} is_selected={user?.email_address === user.email_address} onclick={onselectUser} />
    {:else}
      <p class="text-muted italic">{t("no_users_yet")}</p>
    {/each}
  </div>
</Modal>
