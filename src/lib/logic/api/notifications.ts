import { apiLogger } from "$lib";
import { NotificationService } from "$logic/notifications/NotificationService";
import { PushService } from "$logic/notifications/PushService";
import { NotificationRouter } from "$logic/notifications/NotificationRouter";
import { buildSchedule, DEFAULT_REMINDER_TIME } from "$logic/notifications/schedule-builder";
import { NotificationAdapter } from "$services/notifications/NotificationAdapter";
import { Widget } from "$services/widget";
import { context } from "$logic/context.svelte";
import DB from "$domain/db";
import t from "$display/translate";

export const pull = () => NotificationService.pull();
export const markAsRead = apiLogger(markAsReadHandler);
export const open = (notification: DB.Notification) => NotificationRouter.open(notification);
export const requestPermission = apiLogger(requestPermissionHandler);
export const syncPush = () => PushService.sync();
export const registerPush = (options?: { prompt?: boolean }) => PushService.register(options);
export const unregisterPush = () => PushService.unregister();
export const listenForPush = () => PushService.listen();

async function markAsReadHandler(notification: DB.Notification): AsyncResult<DB.Notification> {
  return NotificationService.markAsRead(notification);
}

/** Shows the OS prompt (if still undecided). Call when the user turns a reminder on. */
async function requestPermissionHandler(): AsyncResult<boolean> {
  const granted = await NotificationAdapter.requestPermission();
  if (granted) schedule();
  return { ok: true, value: granted };
}

/** Opens the right screen when the user taps a local reminder. Returns an unsubscribe function. */
export function listenForTaps(): Promise<() => void> {
  return NotificationAdapter.onTap((extra) => NotificationRouter.openReminder(extra));
}

/**
 * Re-plans all local reminders from the current tasks and settings.
 * Calls are debounced and never overlap: a request that arrives while a rebuild is running
 * triggers exactly one more rebuild afterwards.
 */
const DEBOUNCE_MS = 500;
const REBUILD_TIMEOUT_MS = 15000;
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let dirty = false;
let waiting: (() => void)[] = [];

export function schedule(): Promise<void> {
  return new Promise((resolve) => {
    waiting.push(resolve);
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });
}

async function flush() {
  if (running) {
    dirty = true;
    return;
  }

  running = true;
  try {
    do {
      dirty = false;
      const callers = waiting;
      waiting = [];

      try {
        // A hung native call must not block every later rebuild.
        await Promise.race([
          rebuildSchedule(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("rebuild timed out")), REBUILD_TIMEOUT_MS)),
        ]);
      } catch (error) {
        console.warn("[notifications] failed to rebuild schedule:", error);
      }

      callers.forEach((resolve) => resolve());
    } while (dirty);
  } finally {
    running = false;
  }
}

async function rebuildSchedule() {
  const settings = context._settings;
  if (!settings) return;

  // Never prompts here - the prompt is requested when the user enables a reminder.
  const has_permission = await NotificationAdapter.hasPermission();
  if (!has_permission) {
    await NotificationAdapter.cancelAll();
    return;
  }

  const enabled = settings.notifications_enabled;
  const present_time =
    enabled && settings.present_task_reminder_enabled ? reminderTime(settings.present_task_reminder_time) : null;
  const past_time =
    enabled && settings.past_task_reminder_enabled ? reminderTime(settings.past_task_reminder_time) : null;

  let notifications: AL.Notification[] = [];
  if (present_time || past_time) {
    const tasks = await DB.task.findMany({
      selector: {
        assigned_firebase_uid: { $in: [context.user?.firebase_uid ?? null, null] },
        soft_deleted: { $ne: true },
        archived: { $ne: true },
        $or: [{ completed: { $eq: 0 } }, { repeat_interval: { $exists: true } }],
      },
    });

    if (!tasks.ok) {
      console.warn("[notifications] failed to load tasks:", tasks.error);
      return;
    }

    // Tasks completed in the widget are only written to the DB when the app next opens; never re-schedule them.
    const completed_in_widget = await Widget.getPendingCompletions().catch(() => [] as string[]);
    const open_tasks = tasks.value.filter((task) => !completed_in_widget.includes(task.id));

    notifications = buildSchedule({ tasks: open_tasks, present_time, past_time, now: new Date(), t });
  }

  await NotificationAdapter.cancelAll();
  await NotificationAdapter.schedule(notifications);
}

function reminderTime(time: string | null | undefined): string {
  return time || DEFAULT_REMINDER_TIME;
}
