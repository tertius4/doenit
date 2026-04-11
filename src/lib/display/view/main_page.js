import DB from "$lib/domain/db";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";

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
    selector: { archived: { $eq: false }, soft_deleted: { $ne: true } },
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

  const is_ongoing = DateUtil.isDateInRange(today, startDate, dueDate);
  const is_past = dueDate ? dueDate < today && !is_ongoing : false;

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

  if (!startDate || !dueDate || DateUtil.isSameDay(startDate, dueDate)) {
    return DateUtil.format(date, "D MMM. YYYY");
  }

  if (startDate.getFullYear() === dueDate.getFullYear() && startDate.getMonth() === dueDate.getMonth()) {
    return `${DateUtil.format(startDate, "D")}-${DateUtil.format(dueDate, "D MMM. YYYY")}`;
  }

  return `${DateUtil.format(startDate, "D MMM")} - ${DateUtil.format(dueDate, "D MMM. YYYY")}`;
}
