<script>
  import t from "$display/translate";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import ButtonRestore from "./comps/ButtonRestore.svelte";
  import Backup from "$lib/services/backup.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import alert from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import GetDoenitPlus from "./comps/GetDoenitPlus.svelte";
  import { context } from "$logic/context.svelte";
  import ButtonBackup from "./comps/ButtonBackup.svelte";
  import Api from "$logic/api";

  const has_backup = $derived(Backup.last_backup_at !== t("never"));

  async function createBackup() {
    const result = await Backup.createBackup();
    if (!result.success) {
      alert.error(`${t("backup_failed")}: ${result.error_message}`);
      return;
    }

    alert.success(t("backup_success"));
  }

  /**
   *
   * @param {BackupManifest} manifest
   */
  async function restoreBackup(manifest) {
    const result = await Backup.restoreBackup(manifest);
    if (!result.success) {
      alert.error(`${t("backup_restoration_failed")}: ${result.error_message}`);
      return;
    }

    alert.success(t("restore_success"));
  }

  /**
   * Fetches the list of available backups.
   * @returns {Promise<BackupManifest | null>} - Queries and returns the last backup made.
   */
  async function handleBackup() {
    const result = await Backup.getBackup();
    if (!result.success) {
      alert.error(t("backup_problem") + " " + result.error_message);
      return null;
    }

    return result.data;
  }
</script>

<Accordion
  label={t("backup_label")}
  disabled={!context.permissions.backup_data}
  disabled_message={t("log_in_first")}
  loading={!context.user}
>
  {#if !!context.permissions.backup_data}
    <div>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="font-medium">{t("automatic_backup")}</p>
        </div>
        <InputSwitch value={context.settings.automatic_backup} onchange={(value) => Api.settings.update({ automatic_backup: value })}/>
      </div>

      <ButtonBackup is_loading={Backup.is_loading} onclick={() => createBackup()} class="mb-4" />
      {#if has_backup}
        <ButtonRestore is_loading={Backup.is_loading} onclick={restoreBackup} getBackup={handleBackup} />
      {/if}

      <div
        class={{
          "border rounded-lg px-2 flex flex-col gap-1 justify-center mt-2": true,
          "text-muted py-1.5 border border-default bg-page": true,
        }}
      >
        <div class="flex gap-1 items-center">
          <Icon name="info" class="text-lg" />
          <p class="leading-none font-semibold">{t("warning")}:</p>
        </div>
        <p class="leading-none">{t("backup_photos_warning")}</p>
      </div>
    </div>
  {:else}
    <GetDoenitPlus />
  {/if}
</Accordion>
