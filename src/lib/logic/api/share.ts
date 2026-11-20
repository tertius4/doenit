import { apiLogger } from "$lib";
import { Share } from "@capacitor/share";
import t from "$display/translate";
import { Clipboard } from "@capacitor/clipboard";
import { Toast } from "@capacitor/toast";

/** Where people download Doenit. */
export const APP_URL = "https://tertius4.github.io/doenit";

export const text = apiLogger(shareTextHandler);
export const copy = apiLogger(copyHandler);

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

/** Copies text to the clipboard and confirms with a native toast. Callers show their own error. */
async function copyHandler(text: string, message: string = t("copied")): AsyncResult {
  try {
    await Clipboard.write({ string: text });
    await Toast.show({ text: message, duration: "short" });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}
