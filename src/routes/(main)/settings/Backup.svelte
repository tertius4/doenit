<script>
  import t from "$display/translate";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import ButtonRestore from "./comps/ButtonRestore.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import { context } from "$logic/context.svelte";
  import ButtonBackup from "./comps/ButtonBackup.svelte";
  import Api from "$logic/api";
  import toast from "$display/toast/toast.svelte";
  import { ExportService } from "$services/backup/ExportService";

  const has_backup = $derived(false);

  let is_loading = $state(false);

  async function createBackup() {
    is_loading = true;
    const result = await ExportService.export();
    if (!result.ok) {
      toast.error(result.error);
      is_loading = false;
      return;
    }
    
    is_loading = false;
  }

  async function restoreBackup() {
    toast.success("Kom binnekort");
  }

  async function handleBackup() {
    toast.success("Kom binnekort");
  }
</script>

<Accordion label={t("backup_label")} disabled_message={t("log_in_first")} loading={!context.user}>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="font-medium">{t("automatic_backup")}</p>
      </div>
      <InputSwitch
        value={context.settings.automatic_backup}
        onchange={(value) => Api.settings.update({ automatic_backup: value })}
      />
    </div>

    <ButtonBackup is_loading={is_loading} onclick={() => createBackup()} class="mb-4" />
    {#if has_backup}
      <ButtonRestore is_loading={is_loading} onclick={restoreBackup} getBackup={handleBackup} />
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
</Accordion>
