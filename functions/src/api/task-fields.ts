import { type Result } from "../shared/result";

/** Year first only (never 05/06/2026), optional time; seconds and a timezone (Z, +02:00) may follow and are ignored. */
const DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i;
const TASK_FIELDS = ["name", "description", "due_date", "start_date", "important", "category", "group_id", "repeat"];
/** Same keys as REPEAT_INTERVALS in the app (src/lib/index.ts). */
const REPEAT_INTERVALS = ["daily", "workdaily", "weekly", "weekly_custom_days", "monthly", "yearly"];
/** Intervals that honour `every`; the app ignores the number for the others. */
const NUMBERED_INTERVALS = ["daily", "weekly", "monthly", "yearly"];
const REPEAT_FIELDS = ["interval", "every", "days"];
/** Index matches Date.getDay(): 0 = Sunday. */
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/** Same as MAX_CUSTOM_INTERVAL in the app's repeat picker. */
const MAX_REPEAT_EVERY = 500;

/** The task fields a request can set, in the app's own format. `category` is a name, resolved per scope. */
export type TaskInput = {
  name: string;
  description: string;
  due_date: string | null;
  start_date: string | null;
  important: boolean;
  category: string | null;
  group_id: string | null;
  /** The app's own repeat fields, so they can be stored as is. "" means no repeat. */
  repeat_interval: string;
  repeat_interval_number: number;
  repeat_specific_days: number[];
};

/** A task as the app stores it in scopes/{scope_id}/items (plus `collection` and `synced_at`). */
export type StoredTask = Omit<TaskInput, "category" | "group_id"> & {
  id: string;
  collection: "task";
  archived: boolean;
  completed: number;
  completed_at: string | null;
  category_id: string | null;
  photo_ids: string[];
  scope_id: string | null;
  owner_id: string;
  device_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  soft_deleted: boolean;
  assigned_firebase_uid?: string | null;
};

/** A task as the API returns it. */
export type PublicTask = {
  id: string;
  name: string;
  description: string;
  due_date: string | null;
  start_date: string | null;
  important: boolean;
  category: string | null;
  group_id: string | null;
  repeat: { interval: string; every?: number; days?: string[] } | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toPublicTask(task: StoredTask, category_names: Map<string, string>): PublicTask {
  return {
    id: task.id,
    name: task.name,
    description: task.description ?? "",
    due_date: task.due_date ?? null,
    start_date: task.start_date ?? null,
    important: !!task.important,
    category: (task.category_id && category_names.get(task.category_id)) || null,
    group_id: task.scope_id ?? null,
    repeat: toPublicRepeat(task),
    // A repeating task that was completed is open again on its next dates, just like in the app.
    completed: !!task.archived,
    completed_at: task.completed_at ?? null,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

function toPublicRepeat(task: StoredTask): PublicTask["repeat"] {
  const interval = task.repeat_interval;
  if (!interval) return null;

  const repeat: NonNullable<PublicTask["repeat"]> = { interval };
  if (NUMBERED_INTERVALS.includes(interval)) repeat.every = task.repeat_interval_number || 1;
  if (interval === "weekly_custom_days") repeat.days = (task.repeat_specific_days ?? []).map((day) => DAY_NAMES[day]);
  return repeat;
}

export function parseTask(body: unknown): Result<TaskInput> {
  const bad = (error: string) => ({ ok: false, error, status_code: 400 }) as const;

  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Body must be a JSON object");
  const input = body as Record<string, unknown>;

  const unknown_fields = Object.keys(input).filter((key) => !TASK_FIELDS.includes(key));
  if (unknown_fields.length) return bad(`Unknown field(s): ${unknown_fields.join(", ")}`);

  const optionalString = (key: string, max: number): Result<string | null> => {
    const value = input[key];
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "string") return bad(`${key} must be a string`);

    const trimmed = value.trim();
    if (trimmed.length > max) return bad(`${key} must be at most ${max} characters`);
    return { ok: true, value: trimmed || null };
  };

  const optionalDate = (key: string): Result<string | null> => {
    const value = optionalString(key, 30);
    if (!value.ok || !value.value) return value;

    const date = parseDate(value.value);
    if (!date) return bad(`${key} is not a valid date, e.g. 2026-05-05 or 2026-05-05 09:00`);
    return { ok: true, value: date };
  };

  const name = optionalString("name", 500);
  if (!name.ok) return name;
  if (!name.value) return bad("name is required");

  const description = optionalString("description", 5000);
  if (!description.ok) return description;

  const due_date = optionalDate("due_date");
  if (!due_date.ok) return due_date;

  const start_date = optionalDate("start_date");
  if (!start_date.ok) return start_date;
  if (start_date.value && due_date.value && start_date.value > due_date.value) {
    return bad("start_date must be on or before due_date");
  }
  // The app keeps a single date in start_date (due_date is only the end of a range), so a lone due_date moves there.
  if (due_date.value && !start_date.value) {
    start_date.value = due_date.value;
    due_date.value = null;
  }

  if (input.important != null && typeof input.important !== "boolean") return bad("important must be a boolean");

  const category = optionalString("category", 100);
  if (!category.ok) return category;

  const group_id = optionalString("group_id", 50);
  if (!group_id.ok) return group_id;

  const repeat = parseRepeat(input.repeat, !!(due_date.value || start_date.value));
  if (!repeat.ok) return repeat;

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value ?? "",
      due_date: due_date.value ?? null,
      start_date: start_date.value ?? null,
      important: input.important === true,
      category: category.value ?? null,
      group_id: group_id.value ?? null,
      ...repeat.value!,
    },
  };
}

/** Returns the date in the app's format ("YYYY-MM-DD" or "YYYY-MM-DD HH:mm"). Out-of-range parts roll over. */
function parseDate(value: string): string | null {
  const match = value.match(DATE_PATTERN);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return formatDate(date, match[4] !== undefined);
}

function formatDate(date: Date, with_time: boolean): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  return with_time ? `${formatted} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` : formatted;
}

type RepeatFields = Pick<TaskInput, "repeat_interval" | "repeat_interval_number" | "repeat_specific_days">;

/** Maps the public `repeat` object onto the app's repeat fields. */
function parseRepeat(value: unknown, has_date: boolean): Result<RepeatFields> {
  const bad = (error: string) => ({ ok: false, error, status_code: 400 }) as const;

  if (value == null) {
    return { ok: true, value: { repeat_interval: "", repeat_interval_number: 1, repeat_specific_days: [] } };
  }
  if (typeof value !== "object" || Array.isArray(value)) return bad("repeat must be an object");
  const input = value as Record<string, unknown>;

  const unknown_fields = Object.keys(input).filter((key) => !REPEAT_FIELDS.includes(key));
  if (unknown_fields.length) return bad(`Unknown repeat field(s): ${unknown_fields.join(", ")}`);

  const interval = input.interval;
  if (typeof interval !== "string" || !REPEAT_INTERVALS.includes(interval)) {
    return bad(`repeat.interval must be one of: ${REPEAT_INTERVALS.join(", ")}`);
  }
  if (!has_date) return bad("repeat needs a due_date or start_date");

  const every = input.every ?? 1;
  if (input.every != null && !NUMBERED_INTERVALS.includes(interval)) {
    return bad(`repeat.every only works with: ${NUMBERED_INTERVALS.join(", ")}`);
  }
  if (typeof every !== "number" || !Number.isInteger(every) || every < 1 || every > MAX_REPEAT_EVERY) {
    return bad(`repeat.every must be a whole number from 1 to ${MAX_REPEAT_EVERY}`);
  }

  let days: number[] = [];
  if (interval === "weekly_custom_days") {
    if (!Array.isArray(input.days) || !input.days.length) {
      return bad('repeat.days is required for weekly_custom_days, e.g. ["mon", "fri"]');
    }
    for (const day of input.days) {
      const index = typeof day === "string" ? DAY_NAMES.indexOf(day.trim().toLowerCase()) : -1;
      if (index === -1) return bad(`repeat.days may only contain: ${DAY_NAMES.join(", ")}`);
      if (!days.includes(index)) days.push(index);
    }
    days.sort((a, b) => a - b);
  } else if (input.days !== undefined) {
    return bad("repeat.days only works with weekly_custom_days");
  }

  return { ok: true, value: { repeat_interval: interval, repeat_interval_number: every, repeat_specific_days: days } };
}

/** Same as markTaskDone in the app: counts the completion; a repeating task moves on to its next dates instead. */
export function markDone(task: StoredTask): void {
  task.completed = (task.completed ?? 0) + 1;
  task.completed_at = new Date().toLocaleString("sv-SE", { timeZone: "Africa/Johannesburg" });

  const is_repeat = !!task.repeat_interval && !!(task.start_date || task.due_date);
  task.archived = !is_repeat;
  if (!is_repeat) return;

  task.start_date = nextDate(task.start_date, task);
  task.due_date = nextDate(task.due_date, task);
}

/** Same as getNextRepeatDates in the app (src/lib/index.ts). Dates are plain strings, so the maths is done in UTC. */
function nextDate(value: string | null, task: StoredTask): string | null {
  if (!value) return null;

  const [day_part, time] = value.split(" ");
  const [year, month, day] = day_part.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const every = task.repeat_interval_number || 1;
  const weekday = date.getUTCDay();

  switch (task.repeat_interval) {
    case "daily":
      date.setUTCDate(date.getUTCDate() + every);
      break;
    case "workdaily":
      date.setUTCDate(date.getUTCDate() + (weekday === 5 ? 3 : weekday === 6 ? 2 : 1));
      break;
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7 * every);
      break;
    case "weekly_custom_days": {
      const days = task.repeat_specific_days ?? [];
      let add = 7;
      for (let i = 1; i <= 7; i++) {
        if (days.includes((weekday + i) % 7)) {
          add = i;
          break;
        }
      }
      date.setUTCDate(date.getUTCDate() + add);
      break;
    }
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + every);
      break;
    case "yearly":
      date.setUTCFullYear(date.getUTCFullYear() + every);
      break;
    default:
      return value;
  }

  return time ? `${formatDate(date, false)} ${time}` : formatDate(date, false);
}

/** The public fields of a stored task, so a PATCH can be merged onto it and validated as a whole. */
export function toTaskBody(task: PublicTask): Record<string, unknown> {
  const { name, description, due_date, start_date, important, category, group_id, repeat } = task;
  return { name, description, due_date, start_date, important, category, group_id, repeat };
}
