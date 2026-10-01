/**
 * Pure builder for the local reminder schedule. No DB, SDK or UI access, so it can be tested in isolation.
 * Task dates are local strings ("YYYY-MM-DD" or "YYYY-MM-DD HH:mm") and are always interpreted in local time.
 */

export const DEFAULT_REMINDER_TIME = "09:00";
export const WINDOW_DAYS = 30;
/** iOS keeps only the 64 soonest pending local notifications. */
export const MAX_NOTIFICATIONS = 60;
const MAX_ID = 2147483646;
const MAX_LISTED_TASKS = 10;

export type ScheduleTask = Pick<DB.Task, "id" | "name" | "start_date" | "due_date">;

export type ScheduleInput = {
  tasks: ScheduleTask[];
  /** Falsy = reminder disabled. */
  present_time: string | null | undefined;
  past_time: string | null | undefined;
  now: Date;
  t: (key: string, params?: Record<string, string | number>) => string;
};

type LocalDate = { date: Date; has_time: boolean };

export function buildSchedule({ tasks, present_time, past_time, now, t }: ScheduleInput): AL.Notification[] {
  const entries: { key: string; notification: Omit<AL.Notification, "id"> }[] = [];

  const today = startOfDay(now);
  const parsed = tasks.map((task) => ({
    task,
    start: parseLocalDate(task.start_date, "start"),
    due: parseLocalDate(task.due_date, "end"),
  }));

  if (present_time) {
    const by_day = new Map<string, ScheduleTask[]>();

    for (const { task, start, due } of parsed) {
      if (!start) continue;

      if (start.has_time && start.date > now && start.date <= addDays(today, WINDOW_DAYS + 1)) {
        entries.push({
          key: `task_${task.id}`,
          notification: {
            title: t("scheduled_for_now"),
            body: task.name,
            at: start.date,
            extra: { task_id: task.id },
          },
        });
      }

      // A task that started earlier and is still running shows on today's summary.
      const in_progress = start.date < today && !!due && due.date >= today;
      const day = in_progress ? today : startOfDay(start.date);
      if (day < today || day > addDays(today, WINDOW_DAYS)) continue;

      const key = dayKey(day);
      by_day.set(key, [...(by_day.get(key) ?? []), task]);
    }

    for (const [key, day_tasks] of by_day) {
      const at = atTime(parseDayKey(key), present_time);
      if (at <= now) continue;

      entries.push({
        key: `day_${key}`,
        notification: {
          title:
            day_tasks.length === 1
              ? t("daily_reminder_title_singular")
              : t("daily_reminder_title", { task_count: day_tasks.length }),
          body: listTasks(day_tasks),
          at,
          extra: { type: "daily_summary" },
        },
      });
    }
  }

  if (past_time) {
    for (let day = 0; day < WINDOW_DAYS; day++) {
      const at = atTime(addDays(today, day), past_time);
      if (at <= now) continue;

      // Overdue as of the moment this reminder fires. Tasks without a due date use their start date.
      const overdue = parsed
        .filter(({ start, due }) => {
          const deadline = due ?? start;
          return !!deadline && deadline.date < at;
        })
        .map(({ task }) => task);
      if (!overdue.length) continue;

      entries.push({
        key: `overdue_${dayKey(at)}`,
        notification: {
          title:
            overdue.length === 1 ? t("past_due_date_singular") : t("past_due_date", { task_count: overdue.length }),
          body: listTasks(overdue),
          at,
          extra: { type: "overdue_summary" },
        },
      });
    }
  }

  const used = new Set<number>();

  return entries
    .sort((a, b) => a.notification.at.getTime() - b.notification.at.getTime())
    .slice(0, MAX_NOTIFICATIONS)
    .map(({ key, notification }) => {
      let id = hash(key);
      while (used.has(id)) id = (id % MAX_ID) + 1;
      used.add(id);
      return { id, ...notification };
    });
}

function listTasks(tasks: ScheduleTask[]): string {
  return tasks
    .slice(0, MAX_LISTED_TASKS)
    .map((task) => `• ${task.name}`)
    .join("\n");
}

/** Stable positive 31-bit id. Android notification ids are signed 32-bit ints. */
export function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % MAX_ID || 1;
}

/** Parses "YYYY-MM-DD" or "YYYY-MM-DD HH:mm" as local time. Date-only values map to the start or end of that day. */
export function parseLocalDate(value: string | null | undefined, boundary: "start" | "end"): LocalDate | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match;
  const has_time = hours !== undefined;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    has_time ? Number(hours) : boundary === "end" ? 23 : 0,
    has_time ? Number(minutes) : boundary === "end" ? 59 : 0,
    0,
    0,
  );

  return isNaN(date.valueOf()) ? null : { date, has_time };
}

/** Local "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDayKey(key: string): Date {
  return parseLocalDate(key, "start")!.date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function atTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours || 0, minutes || 0, 0, 0);
}
