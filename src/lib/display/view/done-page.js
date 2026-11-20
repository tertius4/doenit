import DB from "$lib/domain/db";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";
import { visible$ } from "./visible";

/**
 * @param {AL.DonePageTask[]} list
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
 * @returns {Promise<import("rxjs").Observable<AL.DonePageTask[]>>}
 */
async function subscribeTaskList() {
  const tasks$ = visible$(DB.task, {
    selector: { $or: [{ archived: { $eq: true } }, { completed: { $gt: 0 } }], soft_deleted: { $ne: true } },
    sort: [{ completed_at: "desc" }],
  });
  const lists$ = DB.list.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([tasks$, lists$]).pipe(
    map(([tasks, lists]) => {
      /** @type {Map<string, DB.List>} */
      const list_map = new Map(lists.map((l) => [l.id, l]));
      return tasks.map((task) => formatTask(task, list_map));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, DB.List>} list_map
 * @returns {AL.DonePageTask}
 */
function formatTask(task, list_map) {
  const startDate = DateUtil.parseWithTimeBoundary(task.start_date, "start");
  const dueDate = DateUtil.parseWithTimeBoundary(task.due_date, "end");

  /** @type {AL.DonePageTask['pills']} */
  const pills = [];

  if (startDate || dueDate) {
    pills.push({
      type: "round",
      label: `${formatDateRange(startDate, dueDate)} ${task.due_date ? "" : DateUtil.getTime(task.start_date)}`.trim(),
      pre_icon: "clock",
      ...(task.repeat_interval ? { post_icon: "sync" } : {}),
    });
  }

  const list = task.list_id ? list_map.get(task.list_id) : undefined;
  if (list) pills.push({ type: "square", label: list.name, pre_icon: list.scope_id ? "users" : "categories" });

  return {
    id: task.id,
    name: task.name,
    completed_count: task.completed,
    pills,
  };
}

/**
 * @param {Date | null} start_date
 * @param {Date | null} due_date
 * @returns {string}
 */
function formatDateRange(start_date, due_date) {
  const date = due_date ?? start_date;
  if (!date) return "";

  if (!start_date || !due_date || DateUtil.isSameDay(start_date, due_date)) {
    return DateUtil.format(date, "D MMM YYYY");
  }

  if (start_date.getFullYear() === due_date.getFullYear() && start_date.getMonth() === due_date.getMonth()) {
    return `${DateUtil.format(start_date, "D")}-${DateUtil.format(due_date, "D MMM YYYY")}`;
  }

  return `${DateUtil.format(start_date, "D MMM")} - ${DateUtil.format(due_date, "D MMM YYYY")}`;
}
