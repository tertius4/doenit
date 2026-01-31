<script>
  import Modal from "$lib/components/modal/Modal.svelte";
  import { t } from "$lib/services/language.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import Backup from "$lib/services/backup.svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} [is_loading=false] - Indicates if the button is in a loading state.
   * @property {() => Promise<void>} [onclick] - Function to be called when the button is clicked.
   */

  /** @type {Props & Record<string, any>} */
  let { is_loading = false, onclick, ...rest } = $props();

  let is_open = $state(false);
  let is_backing_up = $state(false);

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
    is_loading && "bg-primary/80",
    !is_loading && "bg-primary text-alt",
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
  <div>
    <p class="font-medium">{is_backing_up ? t("backup_in_progress") : t("backup_now")}</p>
    <p class="text-sm">{t("last_backup")}: {Backup.last_backup_at}</p>
  </div>
</button>

<Modal class="p-6" bind:is_open onclose={() => (is_open = false)}>
  <h2 class="text-lg font-semibold mb-4">{t("backup_question")}</h2>
  {#if Backup.last_backup_at}
    <p class="text-sm mb-4">
      {t("last_backup")}: {Backup.last_backup_at}
    </p>
  {/if}
  <div class="flex justify-end space-x-4">
    <button
      aria-label={t("backup_aria")}
      class="text-md items-center justify-center text-alt px-4 py-2 flex gap-1 bg-primary rounded-lg"
      onclick={handleClick}
    >
      <Icon name="check" />
      <span>{t("backup")}</span>
    </button>
  </div>
</Modal>
