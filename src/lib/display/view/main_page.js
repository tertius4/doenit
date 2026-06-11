import DB from "$lib/domain/db";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";
import { context } from "$logic/context.svelte";
import { getGroup } from "$lib";

/**
 *
 * @param {AL.MainPageTask[]} list
 * @returns {() => void}
 */
export function taskList(list) {
  /** @type {import("rxjs").Subscription} */
  let subscription;

  subscribeTaskList()
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @returns {Promise<import("rxjs").Observable<AL.MainPageTask[]>>}
 */
async function subscribeTaskList() {
  const tasks$ = DB.task.subscribe$({
    selector: {
      archived: { $eq: false },
      soft_deleted: { $ne: true },
      assigned_firebase_uid: { $in: [null, context.user?.firebase_uid ?? null] },
    },
    sort: [{ due_date: "asc" }],
  });
  const categories$ = DB.category.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([tasks$, categories$]).pipe(
    map(([tasks, categories]) => {
      /** @type {Map<string, DB.Category>} */
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const today = new Date();

      tasks.sort((a, b) => {
        const groupDiff = getGroup(a) - getGroup(b);

        if (groupDiff !== 0) {
          return groupDiff;
        }

        // Belangrike take eerste binne groep
        if (a.important !== b.important) {
          return a.important ? -1 : 1;
        }

        // Daarna op datum
        const aDate = DateUtil.endOfDay(a.due_date) ?? DateUtil.startOfDay(a.start_date) ?? new Date(0);
        const bDate = DateUtil.endOfDay(b.due_date) ?? DateUtil.startOfDay(b.start_date) ?? new Date(0);

        return aDate.getTime() - bDate.getTime();
      });

      return tasks.map((task) => formatTask(task, categoryMap, today));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, DB.Category>} category_map
 * @param {Date} today
 * @returns {AL.MainPageTask}
 */
function formatTask(task, category_map, today) {
  const start_date = DateUtil.startOfDay(task.start_date);
  const due_date = DateUtil.endOfDay(task.due_date);

  const is_ongoing = DateUtil.isDateInRange(today, start_date || due_date, due_date || start_date);
  const is_past = calculateIsPast(today, start_date, due_date, is_ongoing);

  /** @type {AL.MainPageTask['pills']} */
  const pills = [];

  if (start_date || due_date) {
    pills.push({
      type: "round",
      label: formatDateRange(start_date, due_date),
      pre_icon: "clock",
      ...(task.repeat_interval ? { post_icon: "sync" } : {}),
    });
  }

  if (task.category_id) {
    const category = category_map.get(task.category_id);
    if (category) pills.push({ type: "square", label: category.name, pre_icon: "categories" });
  }

  /** @type {AL.MainPageTask['top_right_icons']} */
  const top_right_icons = [];
  if (task.important) top_right_icons.push({ name: "important" });
  if (task.photo_ids?.length) top_right_icons.push({ name: "camera" });

  return {
    id: task.id,
    name: task.name,
    time_group_number: getGroup(task),
    is_ongoing,
    is_past,
    category_id: task.category_id,
    onclick: () => {},
    onlongpress: () => {},
    pills,
    ...(top_right_icons.length ? { top_right_icons } : {}),
  };
}

/**
 * @param {Date | null} start_date
 * @param {Date | null} dueDate
 * @returns {string}
 */
function formatDateRange(start_date, dueDate) {
  const date = dueDate ?? start_date;
  if (!date) return "";

  const locale = context.settings.language === "en" ? "en-GB" : "af-ZA";
  if (!start_date || !dueDate || DateUtil.isSameDay(start_date, dueDate)) {
    return DateUtil.format(date, "D MMM YYYY", { locale });
  }

  if (start_date.getFullYear() === dueDate.getFullYear() && start_date.getMonth() === dueDate.getMonth()) {
    return `${DateUtil.format(start_date, "D", { locale })}-${DateUtil.format(dueDate, "D MMM YYYY", { locale })}`;
  }

  return `${DateUtil.format(start_date, "D MMM", { locale })} - ${DateUtil.format(dueDate, "D MMM YYYY", { locale })}`;
}

/**
 *
 * @param {Date} today
 * @param {Date | null} start_date
 * @param {Date | null} dueDate
 * @param {boolean} is_ongoing
 * @returns {boolean}
 */
function calculateIsPast(today, start_date, dueDate, is_ongoing) {
  if (is_ongoing) return false;

  const date = dueDate ?? start_date;
  if (!date) return false;

  return date < today;
}
