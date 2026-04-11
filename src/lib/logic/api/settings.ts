import { PUBLIC_GOOGLE_PLAY_STORE_URL } from "$env/static/public";
import { context } from "$logic/context.svelte";
import { Device } from "@capacitor/device";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { apiLogger } from "$lib";
import DB from "$lib/domain/db";

export const update = apiLogger(updateSettingsHandler);
export const openStorePage = apiLogger(openStorePageHandler);
export const email = apiLogger(sendSupportEmailHandler);

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

async function openStorePageHandler(): AsyncResult {
  try {
    if (Capacitor.isNativePlatform()) {
      Browser.open({ url: PUBLIC_GOOGLE_PLAY_STORE_URL });
    } else {
      window.open(PUBLIC_GOOGLE_PLAY_STORE_URL, "_blank");
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}

async function sendSupportEmailHandler(): AsyncResult<string> {
  const SUPPORT_EMAIL = "doenitapp@gmail.com";
  const deviceInfo = await Device.getInfo();
  const device = `${deviceInfo.manufacturer} ${deviceInfo.model} - ${deviceInfo.operatingSystem} ${deviceInfo.osVersion}`;
  const subject = encodeURIComponent(`Fout in Doenit ${context.app_state.app_version} - ${device}`);
  return { ok: true, value: `mailto:${SUPPORT_EMAIL}?subject=${subject}` };
}
