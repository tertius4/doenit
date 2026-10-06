import { apiLogger } from "$lib";
import { Clipboard } from "@capacitor/clipboard";
import { Toast } from "@capacitor/toast";
import t from "$display/translate";

export const copy = apiLogger(copyHandler);

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
