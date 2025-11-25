<script>
  import { t } from "$lib/services/language.svelte";

  /**
   * @typedef {Object} Props
   * @property {User} user
   * @property {boolean} [is_selected]
   * @property {boolean} [disabled]
   * @property {() => *} onclick
   */

  /** @type {Props} */
  const { user, is_selected, disabled, onclick } = $props();
</script>

<button
  aria-label="{user.name} se kaart"
  type="button"
  class={{
    "flex justify-start w-full border rounded-lg p-2": true,
    "bg-card border-default": !is_selected || disabled,
    "bg-primary/20 border-primary": is_selected && !disabled,
  }}
  {onclick}
>
  {#if !disabled}
    <div
      class={{
        "rounded-full w-5 h-5 my-auto flex items-center justify-center border": true,
        "border-primary bg-card": is_selected,
        "border-default bg-surface": !is_selected,
      }}
    >
      {#if is_selected}
        <div class="rounded-full w-2.5 h-2.5 bg-primary"></div>
      {/if}
    </div>
  {/if}

  {#if user.avatar}
    <img src={user.avatar} alt={t("profile")} class="ml-2 w-8 h-8 my-auto rounded-full" referrerpolicy="no-referrer" />
  {/if}

  <h2 class="ml-1 text-left text-lg font-medium my-auto">
    {user.name}
  </h2>
</button>
