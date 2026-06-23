import { apiLogger } from "$lib";
import { NotificationService } from "$domain/notifications/NotificationService";
import { NotificationAdapter } from "$services/notifications/NotificationAdapter";
import { context } from "$logic/context.svelte";
import DateUtil from "$display/date-util";
import DB from "$domain/db";
import t from "$display/translate";

export const pull = () => NotificationService.pull();
export const markAsRead = apiLogger(markAsReadHandler);
export const schedule = apiLogger(rebuildSchedule);

async function markAsReadHandler(notification: DB.Notification): AsyncResult<DB.Notification> {
  return NotificationService.markAsRead(notification);
}

async function rebuildSchedule() {
  console.trace("[rebuildSchedule] Rebuilding notification schedule...");
  await NotificationAdapter.requestPermissions();
  await NotificationAdapter.cancelAll();

  const settings = context.settings;
  const present_time = settings.present_task_reminder_enabled && settings.present_task_reminder_time;
  const past_time = settings.past_task_reminder_enabled && settings.past_task_reminder_time;
  if (!present_time && !past_time) return;

  const notifications: AL.Notification[] = [];

  const now = new Date();
  const start_period = DateUtil.startOfDay(now);
  const end_period = DateUtil.add(DateUtil.endOfDay(now), { days: 30 });

  /**
   * ============================================================================
   * DAILY SUMMARIES + TASK NOTIFICATIONS
   * ============================================================================
   */

  if (!!present_time) {
    const tasks_result = await DB.task.findMany({
      selector: {
        assigned_firebase_uid: {
          $in: [context.user?.firebase_uid, null],
        },
        soft_deleted: { $ne: true },
        archived: { $ne: true },
        $and: [
          {
            $or: [{ completed: { $eq: 0 } }, { repeat_interval: { $exists: true } }],
          },
          { start_date: { $exists: true } },
          {
            $or: [
              {
                start_date: {
                  $gte: start_period?.toISOString().slice(0, 10),
                  $lte: end_period?.toISOString().slice(0, 10),
                },
              },
              {
                $and: [
                  { due_date: { $exists: true } },
                  { start_date: { $lte: start_period?.toISOString().slice(0, 10) } },
                  { due_date: { $gte: start_period?.toISOString().slice(0, 10) } },
                ],
              },
            ],
          },
        ],
      },
    });

    if (tasks_result.ok) {
      const tasks = tasks_result.value;

      const tasks_by_day = new Map<string, typeof tasks>();

      for (const task of tasks) {
        /**
         * Individual task notification
         */
        const start_date = DateUtil.toDate(task.start_date);
        if (start_date && start_date > now && hasStartTime(task)) {
          notifications.push({ id: hash(task.id), title: t("scheduled_for_now"), body: task.name, at: start_date });
        }

        /**
         * Daily summary grouping
         */
        const day_key = DateUtil.startOfDay(task.start_date)?.toISOString();
        if (!day_key) continue;

        if (!tasks_by_day.has(day_key)) {
          tasks_by_day.set(day_key, []);
        }

        tasks_by_day.get(day_key)!.push(task);
      }

      const reminder_time = settings.present_task_reminder_time ?? "08:00";
      const [hour, minute] = reminder_time.split(":").map(Number);

      for (const [day_key, day_tasks] of tasks_by_day) {
        const schedule_at = new Date(day_key);

        schedule_at.setHours(hour, minute, 0, 0);
        if (schedule_at <= now) continue;

        notifications.push({
          id: hash(day_key),

          title:
            day_tasks.length === 1
              ? t("daily_reminder_title_singular")
              : t("daily_reminder_title", { task_count: day_tasks.length }),

          body: day_tasks
            .slice(0, 10)
            .map((task) => `• ${task.name}`)
            .join("\n"),

          at: new Date(schedule_at),
        });
      }
    }
  }

  /**
   * ============================================================================
   * OVERDUE SUMMARIES
   * ============================================================================
   */

  console.log("past_time", past_time, end_period?.toISOString().slice(0, 10));
  if (past_time) {
    const overdue_result = await DB.task.findMany({
      selector: {
        assigned_firebase_uid: {
          $in: [context.user?.firebase_uid, null],
        },
        soft_deleted: { $ne: true },
        archived: { $ne: true },
        $and: [
          {
            $or: [{ completed: { $eq: 0 } }, { repeat_interval: { $exists: true } }],
          },
          {
            $or: [
              {
                due_date: {
                  $exists: true,
                  $lt: end_period?.toISOString().slice(0, 10),
                },
              },
              {
                $and: [
                  { $or: [{ due_date: { $exists: false } }, { due_date: "" }, { due_date: null }] },
                  { start_date: { $exists: true, $lt: end_period?.toISOString().slice(0, 10) } },
                ],
              },
            ],
          },
        ],
      },
    });

    console.log("overdue_result", overdue_result);

    if (overdue_result.ok) {
      const overdue_tasks = overdue_result.value;

      if (overdue_tasks.length > 0) {
        const reminder_time = settings.present_task_reminder_time ?? "08:00";
        const [hour, minute] = reminder_time.split(":").map(Number);

        for (let day = 0; day < 30; day++) {
          const schedule_at = DateUtil.add(start_period, { days: day });
          if (!schedule_at) continue;

          schedule_at.setHours(hour, minute, 0, 0);
          if (schedule_at <= now) continue;

          notifications.push({
            id: hash(`overdue_${day}`),

            title:
              overdue_tasks.length === 1
                ? t("past_due_date_singular")
                : t("past_due_date", { task_count: overdue_tasks.length }),

            body: overdue_tasks
              .slice(0, 10)
              .map((task) => `• ${task.name}`)
              .join("\n"),

            at: new Date(schedule_at),
          });
        }
      }
    }
  }

  console.log("Notification Count:", notifications);
  await NotificationAdapter.schedule(notifications);
}

function hash(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash);
}

function hasStartTime(task: DB.Task): boolean {
  if (!task.start_date) return false;

  const start_date = new Date(task.start_date);

  return start_date.getUTCHours() !== 0 || start_date.getUTCMinutes() !== 0;
}
