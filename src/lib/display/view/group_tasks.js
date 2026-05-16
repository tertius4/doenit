import DB from "$lib/domain/db";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";
import { context } from "$logic/context.svelte";

/**
 * @param {string} group_id
 * @param {AL.MainPageTask[]} list
 * @returns {() => void}
 */
export function taskList(group_id, list) {
  /** @type {import("rxjs").Subscription} */
  let subscription;

  subscribeGroupTaskList(group_id)
    .then((pipe) => pipe.subscribe((data) => list.splice(0, list.length, ...data)))
    .then((sub) => (subscription = sub));

  return () => () => subscription?.unsubscribe();
}

/**
 * @param {string} group_id
 * @returns {Promise<import("rxjs").Observable<AL.MainPageTask[]>>}
 */
async function subscribeGroupTaskList(group_id) {
  const tasks$ = DB.task.subscribe$({
    selector: { scope_id: group_id, archived: { $eq: false }, soft_deleted: { $ne: true } },
    sort: [{ due_date: "asc" }],
  });
  const categories$ = DB.category.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([tasks$, categories$]).pipe(
    map(([tasks, categories]) => {
      /** @type {Map<string, DB.Category>} */
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const today = new Date();
      return tasks.map((task) => formatTask(task, categoryMap, today));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, DB.Category>} categoryMap
 * @param {Date} today
 * @returns {AL.MainPageTask}
 */
function formatTask(task, categoryMap, today) {
  const startDate = DateUtil.parseWithTimeBoundary(task.start_date, "start");
  const dueDate = DateUtil.parseWithTimeBoundary(task.due_date, "end");

  const is_ongoing = DateUtil.isDateInRange(today, startDate || dueDate, dueDate || startDate);
  const is_past = calculateIsPast(today, startDate, dueDate, is_ongoing);

  /** @type {AL.MainPageTask['pills']} */
  const pills = [];

  if (startDate || dueDate) {
    pills.push({
      type: "round",
      label: formatDateRange(startDate, dueDate),
      pre_icon: "clock",
      ...(task.repeat_interval ? { post_icon: "sync" } : {}),
    });
  }

  if (task.category_id) {
    const category = categoryMap.get(task.category_id);
    if (category) pills.push({ type: "square", label: category.name, pre_icon: "categories" });
  }

  /** @type {AL.MainPageTask['top_right_icons']} */
  const top_right_icons = [];
  if (task.important) top_right_icons.push({ name: "important" });
  if (task.photo_ids?.length) top_right_icons.push({ name: "camera" });

  return {
    id: task.id,
    name: task.name,
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
 * @param {Date | null} startDate
 * @param {Date | null} dueDate
 * @returns {string}
 */
function formatDateRange(startDate, dueDate) {
  const date = dueDate ?? startDate;
  if (!date) return "";

  const locale = context.settings.language === "en" ? "en-GB" : "af-ZA";
  if (!startDate || !dueDate || DateUtil.isSameDay(startDate, dueDate)) {
    return DateUtil.format(date, "D MMM YYYY", { locale });
  }

  if (startDate.getFullYear() === dueDate.getFullYear() && startDate.getMonth() === dueDate.getMonth()) {
    return `${DateUtil.format(startDate, "D", { locale })}-${DateUtil.format(dueDate, "D MMM YYYY", { locale })}`;
  }

  return `${DateUtil.format(startDate, "D MMM", { locale })} - ${DateUtil.format(dueDate, "D MMM YYYY", { locale })}`;
}

/**
 * @param {Date} today
 * @param {Date | null} startDate
 * @param {Date | null} dueDate
 * @param {boolean} is_ongoing
 * @returns {boolean}
 */
function calculateIsPast(today, startDate, dueDate, is_ongoing) {
  if (is_ongoing) return false;

  const date = dueDate ?? startDate;
  if (!date) return false;

  return date < today;
}
