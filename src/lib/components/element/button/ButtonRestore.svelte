<script>
  import Modal from "$lib/components/modal/Modal.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { t } from "$lib/services/language.svelte";
  import { DateUtil } from "$lib/core/date_util";
  import { slide } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @property {boolean} [is_loading=false] - Indicates if the button is in a loading state.
   * @property {(manifest: BackupManifest) => Promise<void>} [onclick] - Function to call when the button is clicked.
   * @property {() => Promise<BackupManifest | null>} getBackup - Function to call to get the list of backups.
   */

  /** @type {Props & Record<string, any>} */
  let { is_loading = $bindable(false), onclick, getBackup, ...rest } = $props();

  let is_open = $state(false);
  /** @type {BackupManifest?} */
  let selected_backup = $state(null);

  let is_restoring = $state(false);

  async function handleClick() {
    if (!selected_backup) return;

    is_open = false;

    is_restoring = true;
    if (onclick) await onclick(selected_backup);
    is_restoring = false;
  }

  async function handleOpen() {
    if (!getBackup) throw Error("getBackup function is required");
    if (is_loading) return;

    selected_backup = await getBackup();
    is_open = true;
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
  onclick={() => handleOpen()}
>
  {#if is_restoring}
    <Icon name="loading" class="animate-spin text-3xl mx-1 my-auto" />
  {:else}
    <Icon name="restore" class="text-3xl mx-1 my-auto" />
  {/if}

  <p class="font-medium">
    {is_restoring ? t("restore_in_progress") : t("restore_from_backup")}
  </p>
</button>

<Modal bind:is_open onclose={() => (is_open = false)}>
  {#if selected_backup}
    <!-- TODO: Translation -->
    <div class="mb-4">
      <h2 class="text-lg font-semibold">{t("restore_data")}</h2>
      <p class="text-muted">
        {t("latest_backup_made_on", {
          timestamp: DateUtil.format(new Date(selected_backup.timestamp), "DD MMM YYYY, HH:mm"),
        })}
      </p>
    </div>

    <div transition:slide class="text-sm bg-error/10 border border-error rounded-lg p-3 space-y-2 mt-4">
      <span class="text-sm flex flex-col gap-1">
        <span class="flex items-center gap-2">
          <Icon name="trash" class="text-error text-xl" />
          <p class="font-semibold text-lg text-error">{t("warning")}</p>
        </span>

        <p class="font-medium">{t("existing_data_will_be_replaced")}</p>
      </span>
    </div>

    <button
      disabled={is_loading}
      class="w-full mt-4 h-12 p-2 bg-primary text-alt rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      transition:slide
      onclick={handleClick}
    >
      <Icon name="restore" class="text-xl" />
      {t("confirm_restore")}
    </button>
  {/if}
</Modal>
