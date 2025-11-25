<script>
  import { t } from "$lib/services/language.svelte";
  import { user as current_user } from "$lib/base/user.svelte";

  /**
   * @typedef {Object} Props
   * @property {User} user
   * @property {boolean} [is_selected]
   * @property {() => *} onclick
   */

  /** @type {Props} */
  const { user, is_selected, onclick } = $props();

  const is_me = $derived(current_user.email_address === user.email_address);
</script>

<button
  aria-label="{user.name} se kaart"
  type="button"
  class={{
    "flex justify-start gap-4 w-full border rounded-lg p-4": true,
    "bg-surface border-default": !is_selected,
    "bg-primary/20 border-primary": is_selected,
  }}
  {onclick}
>
  {#if user.avatar}
    <img src={user.avatar} alt={t("profile")} class="w-13 h-13 my-auto rounded-full" referrerpolicy="no-referrer" />
  {/if}

  <div class="space-y-0.5">
    <h2 class="text-left text-2xl font-semibold">
      {user.name}{is_me ? ` (${t("you")})` : ""}
    </h2>
    <div class="flex flex-nowrap gap-2 items-center overflow-x-auto">
      {#if user.is_pending}
        <div class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium w-fit">
          <p>{t("pending").toUpperCase()}</p>
        </div>
      {/if}

      <div
        class={{
          "px-2 py-1 rounded-full font-medium text-sm w-fit": true,
          "bg-primary text-alt": is_selected,
          "text-muted bg-card": !is_selected,
        }}
      >
        {user.email_address}
      </div>
    </div>
  </div>
</button>
