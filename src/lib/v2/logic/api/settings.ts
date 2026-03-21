import DB from "$domain/db";
import { apiLogger } from "$lib";
import { context } from "$logic/context.svelte";

export const update = apiLogger(updateSettingsHandler);

async function updateSettingsHandler(settings: Partial<Domain.Settings>): AsyncResult {
  const result = await DB.settings.update(context.settings.id, settings);
  if (!result.ok) {
    console.error("Failed to update settings:", result.error);

    return result;
  }

  return { ok: true };
}
