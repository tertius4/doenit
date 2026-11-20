import DB from "$lib/domain/db";
import { checklistLabel } from "$logic/checklist";
import { isWaiting } from "$logic/chains";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";
import { context } from "$logic/context.svelte";
import { compareTasks, getGroup, isDoNowTask, listIcon } from "$lib";
import { visible$ } from "./visible";

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
  const tasks$ = visible$(DB.task, {
    // Every open task, also other people's: a task waits while the one before it is open, whoever has that one.
    selector: { archived: { $eq: false }, soft_deleted: { $ne: true } },
    sort: [{ due_date: "asc" }],
  });
  const lists$ = DB.list.subscribe$({ selector: { soft_deleted: { $ne: true } } });

  return combineLatest([tasks$, lists$]).pipe(
    map(([tasks, lists]) => {
      /** @type {Map<string, DB.List>} */
      const list_map = new Map(lists.map((l) => [l.id, l]));
      const today = new Date();

      const my_uid = context.user?.firebase_uid ?? null;
      const open_ids = new Set(tasks.map((task) => task.id));
      // Not: other people's tasks, the open tasks of a completed project (they only show in the project itself), and
      // tasks waiting on another one.
      const shown = tasks.filter(
        (task) =>
          (!task.assigned_firebase_uid || task.assigned_firebase_uid === my_uid) &&
          !(task.list_id && list_map.get(task.list_id)?.completed_at) &&
          !isWaiting(task, open_ids),
      );
      shown.sort(compareTasks);

      return shown.map((task) => formatTask(task, list_map, today));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, DB.List>} list_map
 * @param {Date} today
 * @returns {AL.MainPageTask}
 */
function formatTask(task, list_map, today) {
  const start_date = DateUtil.startOfDay(task.start_date);
  const due_date = DateUtil.endOfDay(task.due_date);

  const is_ongoing = DateUtil.isDateInRange(today, start_date || due_date, due_date || start_date);
  const is_past = calculateIsPast(today, start_date, due_date, is_ongoing);

  /** @type {AL.MainPageTask['pills']} */
  const pills = [];

  if (start_date || due_date) {
    pills.push({
      type: "round",
      label: `${formatDateRange(start_date, due_date)} ${task.due_date ? "" : DateUtil.getTime(task.start_date)}`.trim(),
      pre_icon: "clock",
      ...(task.repeat_interval ? { post_icon: "sync" } : {}),
    });
  }

  const checklist = checklistLabel(task.checklist);
  if (checklist) pills.push({ type: "square", label: checklist, pre_icon: "check" });

  const list = task.list_id ? list_map.get(task.list_id) : undefined;
  if (list) pills.push({ type: "square", label: list.name, pre_icon: listIcon(list) });

  /** @type {AL.MainPageTask['top_right_icons']} */
  const top_right_icons = [];
  if (task.important) top_right_icons.push({ name: "important" });
  if (task.photo_ids?.length) top_right_icons.push({ name: "camera" });
  if (task.description) top_right_icons.push({ name: "message" });

  return {
    id: task.id,
    name: task.name,
    time_group_number: getGroup(task),
    is_do_now: isDoNowTask(task, today),
    is_ongoing,
    is_past,
    list_id: task.list_id ?? null,
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
