<script>
  import { fly, slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string | null} name
   * @property {string | null} email_address
   * @property {string | null} [avatar_url]
   * @property {() => void} [onclick]
   */

  /** @type {Props} */
  const { name, email_address, avatar_url, onclick } = $props();

  /**
   * Handles image loading errors by hiding the image element.
   * @param {Event} event
   */
  function handleError(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    event.target.style.display = "none";
  }
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg pl-2">
  <button type="button" {onclick} class="grid grid-cols-[40px_1fr_auto] items-center w-full text-left">
    <div class="relative bg-card h-8 mr-2 aspect-square rounded-full overflow-hidden">
      {#if avatar_url}
        <img
          src={avatar_url}
          alt={t("user_avatar")}
          class="absolute inset-0 rounded-full h-8 z-1 aspect-square object-cover"
          loading="lazy"
          decoding="async"
          onerror={handleError}
        />
      {/if}
      <div
        class="absolute inset-0 pointer-events-none h-full z-0 aspect-square p-1 flex justify-center items-center bg-card"
      >
        {#if name}
          <span class="text-sm font-semibold text-muted uppercase">
            {name.trim().charAt(0)}
          </span>
        {:else}
          <Icon name="user" size={24} />
        {/if}
      </div>
    </div>

    <div class="py-3 w-full truncate">
      <p class="text-lg font-semibold truncate">{name ?? email_address ?? ""}</p>
      {#if name && email_address}
        <p class="text-sm text-muted truncate">{email_address}</p>
      {:else if !name}
        <p class="text-sm text-muted truncate">{t("tap_to_add_name")}</p>
      {/if}
    </div>
    <div class="rounded-full p-2 mr-2 bg-card flex justify-center items-center">
      <Icon name="edit" class="w-4 h-4" />
    </div>
  </button>
</div>
