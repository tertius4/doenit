import { LocalNotifications } from "@capacitor/local-notifications";
import { t } from "$lib/services/language.svelte";
import { Capacitor } from "@capacitor/core";
import { DB } from "$lib/DB";
import { sortTasksByDueDate, wait } from "$lib";
import { App } from "@capacitor/app";
import { user } from "$lib/base/user.svelte";
import { DateUtil } from "$lib/core/date_util";

class Notification {
  #initiated: boolean = false;
  #status: string | null = $state(null);

  get status() {
    return this.#status;
  }

  set status(status: string | null) {
    if (!["granted", "denied", "prompt", "prompt-with-rationale", null].includes(status)) {
      console.warn(
        `Invalid notification status value: ${status}. It should be 'granted', 'denied', 'prompt', or null.`
      );
      return;
    }

    this.#status = status;
  }

  async init() {
    const existing_permission = await LocalNotifications.checkPermissions();
    this.#status = existing_permission.display;
    App.addListener("appStateChange", async (state) => {
      if (!state.isActive) return;

      const status = await LocalNotifications.checkPermissions();
      this.#status = status.display;
    });

    this.#initiated = true;
  }

  /**
   * Requests permission for notifications.
   * @returns {string} - Returns the permission status, which can be "granted", "denied", or "prompt".
   */
  async requestPermission(): Promise<string> {
    try {
      const existing_permission = await LocalNotifications.checkPermissions();

      switch (existing_permission.display) {
        case "granted":
          return "granted";
        case "denied":
          if (Capacitor.isNativePlatform()) {
            // On some platforms, this might open system settings
            await LocalNotifications.changeExactNotificationSetting();
          }

          // Re-check permission after attempting to change settings
          const updated_permission = await LocalNotifications.checkPermissions();
          return updated_permission.display;
        case "prompt":
        case "prompt-with-rationale":
          const permission = await LocalNotifications.requestPermissions();
          return permission.display;

        default:
          console.warn(`Unknown permission status: ${existing_permission.display}`);
          return existing_permission.display;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  async resetNotifications() {
    await this.cancelAll();
  }

  async scheduleNotifications(all_tasks?: Task[]) {
    try {
      if (all_tasks == null) {
        all_tasks = await DB.Task.getAll({ selector: { archived: { $ne: true } } });
        all_tasks = sortTasksByDueDate(all_tasks);
      }

      if (!this.#initiated) {
        await this.init();
      }

      const notifications_config = user.notifications;
      if (!notifications_config || !notifications_config.enabled || !notifications_config.time) {
        console.warn("Kennisgewings is gedeaktiveer of tyd nie gestel nie.");
        return;
      }

      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(notifications_config.time)) {
        console.error(`Invalid time format: ${notifications_config.time}. Expected HH:mm format.`);
        return;
      }

      await this.cancelAll();

      // Schedule a notification for 30 days in advance.
      const notifications = [];

      // Today at the specified time or default to 8:00 AM.
      const date = new Date();
      const [hours = 8, minutes = 0] = notifications_config.time.split(":").map(Number) ?? [];

      // Validate parsed time values
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error(`Invalid time values: ${hours}:${minutes}. Hours must be 0-23, minutes 0-59.`);
        return;
      }

      date.setHours(hours, minutes, 0, 0);

      // ID generation constants to avoid collisions
      const DAILY_REMINDER_ID_BASE = 200000;
      const TIME_SPECIFIC_ID_BASE = 300000;

      // Add past task notifications
      const past_task_notifications = this.getPastTaskNotification(all_tasks, date, notifications_config.past_tasks);
      notifications.push(...past_task_notifications);

      for (let i = 0; i < 30; i++) {
        const tasks = getTasksOnDate(all_tasks, date);
        if (!!tasks.length) {
          // Create a beautiful body for the tasks
          let body = tasks
            .map(
              (task, idx) =>
                `${idx + 1}. ${task.name}${task.start_date?.includes(" ") ? ` (${task.start_date.split(" ")[1]})` : ""}`
            )
            .join("\n");

          if (date >= new Date()) {
            notifications.push({
              title:
                tasks.length === 1
                  ? t("daily_reminder_title_singular")
                  : t("daily_reminder_title", { task_count: tasks.length }),
              body: body,
              id: DAILY_REMINDER_ID_BASE + i,
              schedule: { at: new Date(+date) /* Need to copy date */ },
            });
          }

          // Schedule a notification for the tasks with time set in the due date.
          for (let j = 0; j < tasks.length; j++) {
            const task = tasks[j];
            const has_due_time = task.start_date?.includes(" ");
            if (!has_due_time) continue;

            // Validate YYYY-MM-DD HH:mm format
            const date_time_regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
            if (!date_time_regex.test(task.start_date!)) {
              console.warn(
                `Ongeldige datumformaat: ${task.start_date} vir: ${task.name}. Verwag YYYY-MM-DD HH:mm formaat.`
              );
              continue;
            }

            const task_date = new Date(task.start_date!);

            // Validate that the date is valid
            if (isNaN(task_date.getTime())) {
              console.warn(`Invalid task due date: ${task.start_date} for task: ${task.name}`);
              continue;
            }

            if (task_date < new Date()) {
              continue;
            }

            notifications.push({
              title: task.name,
              body: t("scheduled_for_now"),
              id: TIME_SPECIFIC_ID_BASE + i * 1000 + j,
              schedule: { at: task_date },
            });
          }
        }

        // Update to next day
        date.setDate(date.getDate() + 1);
      }

      if (!!notifications.length) {
        await LocalNotifications.schedule({ notifications });
        console.debug(`[😨 Doenit]: ${notifications.length} kennisgewings geskeduleer.`);
      } else {
        console.debug("[😨 Doenit]: Geen kennisgewings om te skeduleer");
      }
    } catch (error) {
      console.error("Error scheduling notifications:", error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  private getPastTaskNotification(all_tasks: Task[], start_date: Date, past_tasks_enabled?: boolean) {
    if (!past_tasks_enabled) return [];

    const PAST_TASKS_ID_BASE = 100000;
    const notifications = [];
    for (let i = 0; i < 30; i++) {
      let date = new Date(+start_date + i * 24 * 60 * 60 * 1000);

      const tasks = getTasksBeforeDate(all_tasks, date);
      if (!tasks.length) continue;

      let body = tasks
        .map((task, i) => {
          const has_time = task.start_date?.includes(" ");
          const time = has_time ? ` (${task.start_date!.split(" ")[1]})` : "";

          return `${i + 1}. ${task.name}${time}`;
        })
        .join("\n");

      if (date > new Date()) {
        notifications.push({
          title: tasks.length === 1 ? t("past_due_date_singular") : t("past_due_date", { task_count: tasks.length }),
          body: body,
          id: PAST_TASKS_ID_BASE + i,
          schedule: { at: new Date(+date) /* Need to copy date */ },
        });
      }
    }

    return notifications;
  }

  send(title: string, body: string) {
    LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now() % 1000000,
          schedule: { at: new Date(Date.now() + 1000) }, // Schedule for 1 second later
        },
      ],
    });
  }

  async scheduleDailySummary() {
    const daily_summary_config = user.daily_summary;
    if (!daily_summary_config || !daily_summary_config.enabled || !daily_summary_config.time) {
      console.warn("Daily summary is disabled or time not set.");
      return;
    }

    // Kyk of daar take wat bedoel wat vir vandag geskeduleer is.
    const all_tasks = await DB.Task.getAll({});
    let has_task_for_today = false;
    for (let task of all_tasks) {
      const start_date = task.start_date ? new Date(task.start_date) : null;
      const due_date = task.due_date ? new Date(task.due_date) : null;
      const now = new Date();

      // Check if task was completed today
      if (!!task.completed_at) {
        const completed_date = new Date(task.completed_at);
        if (DateUtil.isSameDay(completed_date, now)) {
          has_task_for_today = true;
          break;
        }
      }

      if (!start_date) continue;
      if (!due_date) {
        if (DateUtil.isSameDay(start_date, now)) {
          has_task_for_today = true;
          break;
        }
      } else if (now > start_date && now < due_date) {
        has_task_for_today = true;
        break;
      }
    }

    if (!has_task_for_today) return;

    // Cancel existing daily summary notification
    const DAILY_SUMMARY_ID = 999999;
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_SUMMARY_ID }] });

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(daily_summary_config.time)) {
      console.error(`Invalid time format: ${daily_summary_config.time}. Expected HH:mm format.`);
      return;
    }

    const [hours, minutes] = daily_summary_config.time.split(":").map(Number);
    const now = new Date();
    const notification_date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // If time has passed today, schedule for tomorrow
    if (notification_date <= now) {
      notification_date.setDate(notification_date.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_SUMMARY_ID,
          title: t("daily_summary_notification_title"),
          body: t("daily_summary_notification_body"),
          schedule: {
            at: notification_date,
            allowWhileIdle: true,
          },
          sound: "notification.wav",
          smallIcon: "ic_stat_logo",
          channelId: "default",
          extra: {
            type: "daily_summary",
          },
        },
      ],
    });
  }

  async cancelAll() {
    // Cancel all scheduled notifications
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications.map((n) => ({ id: n.id }));
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids });
    }
  }
}

export const notifications = new Notification();

function getTasksOnDate(tasks: Task[], date: Date): Task[] {
  if (!date || !tasks?.length) return [];

  const target_date = new Date(date);
  target_date.setHours(0, 0, 0, 0);

  return tasks.filter((task) => {
    if (!task.start_date) return false;

    const task_date = new Date(task.start_date);
    task_date.setHours(0, 0, 0, 0);

    return task_date.toLocaleDateString("en-CA") === target_date.toLocaleDateString("en-CA");
  });
}

function getTasksBeforeDate(tasks: Task[], date: Date): Task[] {
  if (!date || !tasks?.length) return [];

  const target_date = new Date(date);
  target_date.setHours(0, 0, 0, 0);

  return tasks.filter((task) => {
    if (!task.start_date) return false;

    const task_date = new Date(task.due_date || task.start_date);
    task_date.setHours(0, 0, 0, 0);

    return task_date < target_date;
  });
}
