import { apiLogger } from "$lib";
import { Share } from "@capacitor/share";
import t from "$display/translate";
import { copy } from "./clipboard";

/** Where people download Doenit. */
export const APP_URL = "https://tertius4.github.io/doenit";

export const text = apiLogger(shareTextHandler);

/** Opens the share sheet, or copies to the clipboard where sharing is not supported. Dismissing the sheet is not an error. */
async function shareTextHandler(message: string, url: string = APP_URL): AsyncResult {
  try {
    const can_share = await Share.canShare();
    if (!can_share.value) return copy(`${message} ${url}`, t("link_copied"));

    await Share.share({ title: "Doenit", text: message, url, dialogTitle: t("share_app") });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancel/i.test(message)) return { ok: true };
    return { ok: false, error: "sharing_not_supported" };
  }
}
