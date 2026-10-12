import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import DB from "$domain/db";
import logger from "$display/logger";
import { Widget } from "$services/widget";
import * as task from "./task";
import * as settings from "./settings";
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

/** Creates tasks typed into the quick add widget while the app was closed. */
export async function applyPendingTasks(): Promise<void> {
  try {
    const pending = await Widget.getPendingTasks();
    if (!pending.length) return;

    const created: string[] = [];
    for (const { id, name } of pending) {
      const result = await task.createTask(task.getNewTask({ name }));
      if (result.ok) created.push(id);
    }

    await Widget.clearPendingTasks(created);
    if (created.length) {
      // Tasks without dates are not "Do Now" tasks, so show all tasks to keep the new ones visible.
      await settings.setHomeMode("all");
      schedule();
    }
  } catch (error) {
    logger.error("Applying widget tasks failed", error);
  }
}

/** Applies now and every time the app returns to the foreground. Returns an unsubscribe function. */
export function watchPendingCompletions(): () => void {
  if (Capacitor.getPlatform() !== "android") return () => {};

  const applyAll = async () => {
    await applyPendingCompletions();
    await applyPendingTasks();
  };

  applyAll();
  const listener = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) applyAll();
  });

  return () => {
    listener.then((l) => l.remove());
  };
}
