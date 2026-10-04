<script>
  import t from "$display/translate";
  import Accordion from "$display/comps/button/Accordion.svelte";
  import ButtonBackup from "./comps/ButtonBackup.svelte";
  import ButtonRestore from "./comps/ButtonRestore.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import toast from "$display/toast/toast.svelte";
  import { createBackup, restoreBackup } from "$services/backup";

  let is_backing_up = $state(false);
  let is_restoring = $state(false);

  /** @param {boolean} photos */
  async function handleBackup(photos) {
    is_backing_up = true;
    const result = await createBackup({ photos });
    is_backing_up = false;

    if (!result.ok) toast.error(t("backup_failed"), result.error);
  }

  /** @param {string} base64 */
  async function handleRestore(base64) {
    is_restoring = true;
    const result = await restoreBackup(base64);
    is_restoring = false;

    if (!result.ok) return toast.error(t("backup_restoration_failed"), result.error);

    const { added, updated, skipped } = result.value;

    toast.show({
      body: t("restore_summary", { added, updated, skipped }),
      title: t("restore_success"),
      duration: 2000,
      type: "success",
    });
  }
</script>

<Accordion label={t("backup_label")}>
  <div class="space-y-3">
    <ButtonBackup is_loading={is_backing_up} disabled={is_restoring} onclick={handleBackup} />
    <ButtonRestore is_loading={is_restoring} disabled={is_backing_up} onclick={handleRestore} />

    <div class="border rounded-lg px-2 py-1.5 flex flex-col gap-1 justify-center text-muted border-default bg-page">
      <div class="flex gap-1 items-center">
        <Icon name="info" class="text-lg" />
        <p class="leading-none font-semibold">{t("warning")}:</p>
      </div>
      <p class="leading-none">{t("backup_keep_safe")}</p>
    </div>
  </div>
</Accordion>
