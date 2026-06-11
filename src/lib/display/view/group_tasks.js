import DB from "$lib/domain/db";
import DateUtil from "$lib/display/date-util";
import { map, combineLatest } from "rxjs";
import { context } from "$logic/context.svelte";
import t from "$lib/display/translate";
import { getGroup } from "$lib";

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
  const members$ = DB.member.subscribe$({ selector: { scope_id: group_id, soft_deleted: { $ne: true } } });
  const contacts$ = DB.contact.subscribe$({});

  return combineLatest([tasks$, categories$, members$, contacts$]).pipe(
    map(([tasks, categories, members, contacts]) => {
      /** @type {Map<string, DB.Category>} */
      const category_map = new Map(categories.map((c) => [c.id, c]));
      /** @type {Map<string, string>} */
      const contact_map = new Map(contacts.map((c) => [c.firebase_uid, c.name ?? c.email_address ?? c.firebase_uid]));
      const today = new Date();

      tasks.sort((a, b) => {
        const group_diff = getGroup(a) - getGroup(b);
        if (group_diff !== 0) return group_diff;

        const my_uid = context.user?.firebase_uid;
        // Mine first, then others, then unassigned
        const is_mine_a = a.assigned_firebase_uid === my_uid;
        const is_other_a = a.assigned_firebase_uid && a.assigned_firebase_uid !== my_uid;
        const a_rank = is_mine_a ? 0 : is_other_a ? 1 : 2;

        const is_mine_b = b.assigned_firebase_uid === my_uid;
        const is_other_b = b.assigned_firebase_uid && b.assigned_firebase_uid !== my_uid;
        const b_rank = is_mine_b ? 0 : is_other_b ? 1 : 2;

        if (a_rank !== b_rank) return a_rank - b_rank;

        // Belangrike take eerste binne groep
        if (a.important !== b.important) {
          return a.important ? -1 : 1;
        }

        // Daarna op datum
        const a_date = DateUtil.endOfDay(a.due_date) ?? DateUtil.startOfDay(a.start_date) ?? new Date(0);
        const b_date = DateUtil.endOfDay(b.due_date) ?? DateUtil.startOfDay(b.start_date) ?? new Date(0);

        return a_date.getTime() - b_date.getTime();
      });

      return tasks.map((task) => formatTask(task, category_map, contact_map, today));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, DB.Category>} categoryMap
 * @param {Map<string, string>} contactMap
 * @param {Date} today
 * @returns {AL.MainPageTask}
 */
function formatTask(task, categoryMap, contactMap, today) {
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

  if (task.assigned_firebase_uid) {
    const my_uid = context.user?.firebase_uid;
    const assignee =
      task.assigned_firebase_uid === my_uid ? t("me") : (contactMap.get(task.assigned_firebase_uid) ?? t("unassigned"));
    pills.push({ type: "square", label: assignee, pre_icon: "user" });
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
    is_for_someone_else: !!(task.assigned_firebase_uid && task.assigned_firebase_uid !== context.user?.firebase_uid),
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
