<script>
  import { t } from "$lib/services/language.svelte";
  import Accordion from "$lib/components/element/Accordion.svelte";
  import ButtonBackup from "$lib/components/element/button/ButtonBackup.svelte";
  import ButtonRestore from "$lib/components/element/button/ButtonRestore.svelte";
  import Backup from "$lib/services/backup.svelte";
  import InputSwitch from "$lib/components/element/input/InputSwitch.svelte";
  import { user } from "$lib/base/user.svelte";
  import { Alert } from "$lib/core/alert";
  import { Info } from "$lib/icon";
  import GetDoenitPlus from "$lib/components/GetDoenitPlus.svelte";

  const has_backup = $derived(Backup.last_backup_at !== t("never"));

  async function createBackup() {
    const result = await Backup.createBackup();
    if (!result.success) {
      Alert.error(`${t("backup_failed")}: ${result.error_message}`);
      return;
    }

    alert(t("backup_success"));
  }

  /**
   *
   * @param {BackupManifest} manifest
   */
  async function restoreBackup(manifest) {
    const result = await Backup.restoreBackup(manifest);
    if (!result.success) {
      Alert.error(`${t("backup_restoration_failed")}: ${result.error_message}`);
      return;
    }

    alert(t("restore_success"));
  }

  /**
   * Fetches the list of available backups.
   * @returns {Promise<BackupManifest | null>} - Queries and returns the last backup made.
   */
  async function handleBackup() {
    const result = await Backup.getBackup();
    if (!result.success) {
      alert(t("backup_problem") + " " + result.error_message);
      return null;
    }

    return result.data;
  }
</script>

<Accordion
  label={t("backup_label")}
  disabled={!user.is_logged_in}
  disabled_message={t("log_in_first")}
  loading={user.is_loading}
>
  {#if !!user.is_backup_enabled}
    <div>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="font-medium">{t("automatic_backup")}</p>
        </div>
        <InputSwitch bind:value={Backup.automatic_backup} />
      </div>

      <ButtonBackup is_loading={Backup.is_loading} onclick={createBackup} class="mb-4" />
      {#if has_backup}
        <ButtonRestore is_loading={Backup.is_loading} onclick={restoreBackup} getBackup={handleBackup} />
      {/if}

      <div
        class={{
          "border rounded-lg px-2 flex flex-col gap-1 justify-center mt-2": true,
          "text-error py-1.5 border border-error bg-error/20": true,
        }}
      >
        <div class="flex gap-1 items-center">
          <Info class="text-lg" />
          <p class="leading-none font-semibold">{t("warning")}:</p>
        </div>
        <p class="leading-none">{t("backup_photos_warning")}</p>
      </div>
    </div>
  {:else}
    <GetDoenitPlus />
  {/if}
</Accordion>
