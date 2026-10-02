import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import DB from "$domain/db";
import logger from "$display/logger";
import { Widget } from "$services/widget";
import * as task from "./task";
import { schedule } from "./notifications";

/**
 * Applies tasks completed from the widget while the app was closed. The widget already hid them and
 * cancelled their reminders; this persists the completion, which also rebuilds the reminder summaries.
 */
export async function applyPendingCompletions(): Promise<void> {
  try {
    const ids = await Widget.getPendingCompletions();
    if (!ids.length) return;

    for (const id of ids) {
      const found = await DB.task.findById(id);
      // complete() toggles, so an already archived task must be left alone.
      if (found.ok && found.value && !found.value.archived) await task.complete(id);
    }

    await Widget.clearPendingCompletions(ids);
    schedule();
  } catch (error) {
    logger.error("Applying widget completions failed", error);
  }
}

/** Applies now and every time the app returns to the foreground. Returns an unsubscribe function. */
export function watchPendingCompletions(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  applyPendingCompletions();
  const listener = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) applyPendingCompletions();
  });

  return () => {
    listener.then((l) => l.remove());
  };
}
