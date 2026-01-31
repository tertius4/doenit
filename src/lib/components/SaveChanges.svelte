<script>
  import { t } from "$lib/services/language.svelte";
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { onMount } from "svelte";
  import Modal from "./modal/Modal.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { Logger } from "$lib/core/logger";

  /**
   * @template T
   * @typedef {Object} Props
   * @property {(task: T) => Promise<Result<string>>} onsave
   * @property {T} original - The original object before changes.
   * @property {T} changed - The changed object to compare against the original.
   */

  /** @type {Props<Task | Omit<Task, "id" | "created_at" | "updated_at">>} */
  const { original, changed, onsave } = $props();

  let is_open = $state(false);

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      const has_changes = Object.keys(original).some((key) => {
        const original_value = original[key];
        const current_value = changed[key];

        // Handle primitive values.
        if (typeof original_value !== "object" || original_value === null) {
          const has_changes = original_value !== current_value;
          if (has_changes) {
            Logger.debug(`Change detected - Key: ${key}, Original: ${original_value}, Current: ${current_value}`);
          }
          return has_changes;
        }

        // For objects/arrays, do a shallow comparison or use JSON for deep comparison.
        return JSON.stringify(original_value) !== JSON.stringify(current_value);
      });

      if (has_changes) {
        is_open = true;
        return;
      }

      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });
</script>

<Modal bind:is_open>
  <h2 class="font-semibold">{t("save_changes")}</h2>

  <footer class="flex w-full items-center justify-between mt-4">
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-card border border-default text-alt rounded-lg"
      onclick={async () => {
        is_open = false;
        await goto(`/`);
      }}
    >
      <Icon name="trash" />
      <span>{t("discard")}</span>
    </button>
    <button
      type="button"
      class="flex gap-1 items-center h-12 px-4 py-2 bg-primary text-alt rounded-lg ml-auto"
      onclick={async () => {
        is_open = false;
        await onsave(changed);
      }}
    >
      <Icon name="save" />
      <span>{t("save")}</span>
    </button>
  </footer>
</Modal>
