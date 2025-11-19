<script>
  import ButtonClear from "./element/button/ButtonClear.svelte";
  import { t } from "$lib/services/language.svelte";
  import { DownChevron, Plus } from "$lib/icon";
  import { onDestroy, onMount } from "svelte";
  import Modal from "./modal/Modal.svelte";
  import { DB } from "$lib/DB";
  import { wait } from "$lib";
  import user from "$lib/core/user.svelte";

  let { user_id = $bindable(), category_id } = $props();

  /** @type {User[]} */
  let users = $state([]);
  let is_open = $state(false);
  let is_adding = $state(false);

  /** @type {Subscription?} */
  let userSubscription = null;

  const selected_user = $derived(users.find((c) => c.id === user_id));

  $effect(() => {
    if (user_id === null) {
      is_adding = true;
    }
  });

  onMount(async () => {
    const category = await DB.Category.get(category_id);
    if (!category) return;

    if (!category.users.length) return;

    userSubscription = DB.User.subscribe(assignUsers, {
      selector: { email_address: { $in: category.users } },
      sort: [{ name: "asc" }],
    });
  });

  onDestroy(() => {
    if (userSubscription) userSubscription.unsubscribe();
  });

  /**
   * @param {User[]} new_users
   */
  function assignUsers(new_users) {
    const is_mounted = !users.length;
    users = new_users;
    users.unshift({ id: "", is_pending: false, name: "Ek", email_address: user?.value?.email || "" });

    if (is_mounted) return;
    const user_exists = users.some((c) => c.id === user_id);
    if (!user_exists) user_id = "";
  }

  /**
   * Select a user
   * @param {string} id
   */
  async function selectCategory(id) {
    user_id = id;

    await wait(200);
    is_open = false;
  }
</script>

{#if !!users.length}
  <div>
    <span class="font-semibold">{t("choose_user")}</span>
    <div class="relative">
      <button
        type="button"
        class={[
          "text-left bg-card p-2 w-full border border-default rounded-full appearance-none outline-none focus:ring ring-primary pr-6 truncate",
        ]}
        onclick={() => (is_open = true)}
      >
        {#if selected_user}
          <span>{selected_user.name}</span>
        {:else}
          <span class="text-muted">{t("anyone")}</span>
        {/if}
      </button>

      {#if selected_user}
        <ButtonClear onclick={() => (user_id = "")} class="absolute right-0 top-0 bottom-0" />
      {:else}
        <div class="aspect-square h-11 flex items-center justify-center absolute right-0 top-0 bottom-0">
          <DownChevron class="text-muted pointer-events-none" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<Modal bind:is_open>
  <h1 class="font-bold mb-4 leading-[120%]">{t("choose_user")}</h1>
  <div class="mb-4">
    {#each users as user}
      {@const is_selected = user.id === user_id}
      <button
        type="button"
        onclick={() => selectCategory(user.id)}
        class={[
          "text-left flex border rounded-lg border-primary w-full py-2 outline-none",
          is_selected && "bg-primary/20",
          !is_selected && "border-transparent",
        ]}
      >
        <div
          class={[
            "my-auto mx-2 flex items-center justify-center w-4 h-4 aspect-square rounded-full border",
            is_selected ? "border-primary" : "",
          ]}
        >
          {#if is_selected}
            <div class="w-2 h-2 bg-primary rounded-full m-auto"></div>
          {/if}
        </div>

        <div class={["w-full p-1", !is_selected && "border-default"]}>
          <span>{user.name}</span>
        </div>
      </button>
    {:else}
      <p class="text-muted italic">{t("no_users_yet")}</p>
    {/each}
  </div>
</Modal>
