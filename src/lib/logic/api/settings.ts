import DB from "$lib/domain/db";
import { apiLogger } from "$lib";
import { context } from "$logic/context.svelte";

export const update = apiLogger(updateSettingsHandler);

async function updateSettingsHandler(settings: Partial<Domain.Settings>): AsyncResult {
  if (!!settings.language) {
    if (!["af", "en"].includes(settings.language)) {
      return { ok: false, error: "Invalid language" };
    }
  }

  if (!!settings.theme) {
    if (!["light", "dark", "system"].includes(settings.theme)) {
      return { ok: false, error: "Invalid theme" };
    }
  }

  if (!!settings.text_size) {
    if (!["sm", "md", "lg"].includes(settings.text_size)) {
      return { ok: false, error: "Invalid text size" };
    }
  }

  const result = await DB.settings.update(context.settings.id, settings);
  if (!result.ok) {
    console.error("Failed to update settings:", result.error);

    return result;
  }

  return { ok: true };
}
