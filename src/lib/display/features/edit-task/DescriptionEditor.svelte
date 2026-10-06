<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { backHandler, modalStack } from "$logic/navigation";
  import { fly } from "svelte/transition";

  /**
   * Full-screen notepad for a task's description. Looks like a page, but is an overlay so the draft task stays in place.
   *
   * @typedef {Object} Props
   * @property {string} [value]
   * @property {() => void} onclose
   */

  /** @type {Props} */
  let { value = $bindable(""), onclose } = $props();

  /** @type {{ top: number, height: number } | null} */
  let viewport = $state(null);

  // Follow the visual viewport so the notepad ends exactly at the top of the keyboard.
  $effect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => (viewport = { top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  });

  // Locks body scroll and makes the Android back button close the notepad.
  $effect(() => {
    const stack_token = modalStack.push();
    const back_token = backHandler.register(() => {
      if (!modalStack.isTop(stack_token)) return false;
      onclose();
      return true;
    }, 1000);

    return () => {
      backHandler.unregister(back_token);
      modalStack.remove(stack_token);
    };
  });

  /** @param {HTMLTextAreaElement} el */
  function focus(el) {
    setTimeout(() => el.focus(), 250);
  }
</script>

<div
  class="fixed inset-x-0 z-50 flex flex-col bg-page transition-none! **:transition-none!"
  class:inset-y-0={!viewport}
  style:top={viewport && `${viewport.top}px`}
  style:height={viewport && `${viewport.height}px`}
  style:padding-top="env(safe-area-inset-top)"
  transition:fly={{ x: "100%", duration: 200 }}
>
  <div class="flex items-center gap-2 p-2">
    <button
      type="button"
      aria-label="Go back button"
      class="flex justify-center text-alt bg-card items-center aspect-square rounded-full size-10 p-2"
      onclick={onclose}
    >
      <Icon name="arrow-left" size={28} />
    </button>
    <h1 class="font-semibold text-lg">{t("description")}</h1>
  </div>

  <textarea
    use:focus
    bind:value
    placeholder={t("add_description")}
    class="flex-1 w-full p-4 bg-transparent outline-none resize-none placeholder:text-muted"
  ></textarea>
</div>
