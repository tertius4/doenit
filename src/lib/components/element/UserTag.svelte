<script>
  import { t } from "$lib/services/language.svelte";
  import { user as logged_in_user } from "$lib/base/user.svelte";

  /**
   * @typedef {Object} Props
   * @property {User} user
   * @property {boolean} [is_selected]
   */

  /** @type {Props} */
  const { user, is_selected = false } = $props();

  const { email_address } = $derived(logged_in_user);
  const is_me = $derived(user.email_address === email_address);
</script>

<div
  class={{
    "px-1.5 rounded-full w-fit border flex gap-0.5 items-center": true,
    "border-primary bg-primary/40 text-alt": is_selected,
    "border-default bg-card text-normal": !is_selected,
  }}
>
  {#if user.avatar}
    <img class="w-3.5 h-3.5 rounded-full" src={user.avatar} alt={user.name} referrerpolicy="no-referrer" />
  {:else}
    <div class="w-3.5 h-3.5 rounded-full bg-page flex items-center justify-center text-xs font-medium text-alt">
      {user.name.charAt(0).toUpperCase() ?? "?"}
    </div>
  {/if}
  <span>{is_me ? t("you") : user.name}</span>
</div>
