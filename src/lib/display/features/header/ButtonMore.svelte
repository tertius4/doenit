<script>
  import Icon from "$display/comps/Icon.svelte";
  import { context } from "$logic/context.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import NotificationBadge from "$display/notifications/NotificationBadge.svelte";

  let show = $state(false);

  const avatar = $derived(context.user?.avatar);

  function toggle() {
    show = !show;
  }

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

<button
  id="meer-opsies"
  aria-label="More options"
  type="button"
  onclick={toggle}
  class="relative bg-card h-10 mr-2 aspect-square rounded-full"
>
  {#if avatar}
    <img
      src={avatar}
      loading="lazy"
      alt="User avatar"
      class="absolute inset-0 rounded-full h-10 z-1 aspect-square object-cover"
      onerror={handleError}
    />
  {/if}
  <div class="absolute inset-0 pointer-events-none h-full z-0 aspect-square p-1 flex justify-center items-center">
    <Icon name="vertical-ellipsis" size={28} class="m-auto h-fit" />
  </div>
  <NotificationBadge class="absolute z-1 -right-1 -top-1" />
</button>

{#if show}
  <ContextMenu bind:show />
{/if}
