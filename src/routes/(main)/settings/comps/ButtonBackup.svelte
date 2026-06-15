<script>
  import Modal, { ModalHeader } from "$display/comps/modal";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [is_loading=false] - Indicates if the button is in a loading state.
   * @prop {() => Promise<void>} [onclick] - Function to be called when the button is clicked.
   */

  /** @type {Props & Record<string, any>} */
  let { is_loading = false, onclick, ...rest } = $props();

  let is_open = $state(false);
  let is_backing_up = $state(false);
  let is_photos_included = $state(false);

  async function handleClick() {
    is_open = false;

    is_backing_up = true;
    if (onclick) await onclick();
    is_backing_up = false;
  }
</script>

<button
  {...rest}
  class={[
    "p-2 rounded-lg text-alt grid grid-cols-[min-content_auto] gap-2 items-center min-h-12 w-full text-start",
    is_loading && "bg-secondary-700",
    !is_loading && "bg-secondary-500 hover:bg-secondary-600",
    rest.class || "",
  ]}
  type="button"
  disabled={is_loading}
  onclick={() => (is_open = true)}
>
  {#if is_backing_up}
    <Icon name="loading" class="text-3xl mx-1 my-auto" />
  {:else}
    <Icon name="download-cloud" class="text-3xl mx-1 my-auto" />
  {/if}
</button>

<Modal class="p-6" bind:is_open onclose={() => (is_open = false)}>
  <ModalHeader>{t("backup_question")}</ModalHeader>
  
  <div class="flex items-center my-4 gap-2">
    <!-- TODO Translate -->
    <InputSwitch value={is_photos_included} onchange={(value) => (is_photos_included = value)} />
    <p class="font-medium">Sluit foto's in?</p>
  </div>

  <footer class="flex justify-end space-x-4">
    <button
      aria-label={t("backup_aria")}
      class="text-md items-center justify-center text-alt px-4 py-2 flex gap-1 bg-primary rounded-lg"
      onclick={handleClick}
    >
      <Icon name="check" />
      <span>{t("backup")}</span>
    </button>
  </footer>
</Modal>
