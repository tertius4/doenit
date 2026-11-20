import t from "$display/translate";
import DB from "$domain/db";
import DateUtil from "$display/date-util";
import { getGroup, INBOX_ID } from "$lib";
import { context } from "$logic/context.svelte";
import { combineLatest, distinctUntilChanged, map, switchMap } from "rxjs";
import { visible$ } from "./visible";

/**
 * Fills `list` with the lists the current user can see. Use as `onMount(View.lists.getList(list))`.
 * @param {AL.ListListItem[]} list
 * @returns {() => () => void}
 */
export function getList(list) {
  return () => {
    const subscription = subscribeListList().subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * Fills `list` with a single list (empty when it is not visible). Use as `onMount(View.lists.getOne(id, list))`.
 * @param {string} list_id
 * @param {AL.ListListItem[]} list
 * @returns {() => () => void}
 */
export function getOne(list_id, list) {
  return () => {
    const subscription = subscribeListList(list_id).subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * Fills `list` with the Inbox and every list, each with its number of open tasks for the current user. For
 * pickers (the task form, moving tasks). Use as `onMount(View.lists.options(list))`.
 * @param {AL.ListOption[]} list
 * @returns {() => () => void}
 */
export function options(list) {
  return () => {
    const subscription = subscribeOptions().subscribe((data) => list.splice(0, list.length, ...data));
    return () => subscription.unsubscribe();
  };
}

/**
 * The Inbox first, then the lists by most open tasks. For the list filter on the home page.
 * @returns {import("rxjs").Observable<AL.ListOption[]>}
 */
export function subscribeFilterOptions() {
  return subscribeOptions().pipe(
    map(([inbox, ...lists]) => [
      inbox,
      ...lists.sort((a, b) => b.task_count - a.task_count || a.name.localeCompare(b.name)),
    ]),
  );
}

/** @returns {import("rxjs").Observable<AL.ListOption[]>} */
function subscribeOptions() {
  const lists$ = visible$(DB.list, { selector: { soft_deleted: { $ne: true } }, sort: [{ name: "asc" }] });
  const tasks$ = visible$(DB.task, { selector: { soft_deleted: { $ne: true }, archived: { $ne: true } } });

  return combineLatest([lists$, tasks$]).pipe(
    map(([lists, tasks]) => {
      /** @type {Map<string, number>} */
      const counts = new Map();
      for (const task of tasks) {
        if (task.assigned_firebase_uid && task.assigned_firebase_uid !== context.user?.firebase_uid) continue;
        const list_id = task.list_id || INBOX_ID;
        counts.set(list_id, (counts.get(list_id) || 0) + 1);
      }

      return [
        { id: INBOX_ID, name: t("inbox"), task_count: counts.get(INBOX_ID) || 0, is_shared: false },
        ...lists.map((list) => ({
          id: list.id,
          name: list.name,
          task_count: counts.get(list.id) || 0,
          is_shared: !!list.scope_id,
        })),
      ];
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}

/**
 * Re-emits whenever the user's memberships change, so the scope filters below never go stale.
 * @param {string} [list_id] Limit to one list.
 * @returns {import("rxjs").Observable<AL.ListListItem[]>}
 */
function subscribeListList(list_id) {
  const user_id = context.user?.id ?? "device";
  const my_uid = context.user?.firebase_uid;

  const scope_ids$ = DB.user_state.subscribeOne$(context.user?.id || "device").pipe(
    map((state) => state?.active_scopes ?? []),
    distinctUntilChanged((a, b) => a.length === b.length && a.every((id, i) => id === b[i])),
  );

  return scope_ids$.pipe(
    switchMap((scope_ids) => {
      const lists$ = DB.list.subscribe$({
        selector: {
          $or: [{ scope_id: { $in: scope_ids } }, { owner_id: user_id }],
          soft_deleted: { $ne: true },
          ...(list_id ? { id: list_id } : {}),
        },
        sort: [{ name: "asc" }],
      });
      const members$ = DB.member.subscribe$({
        selector: { scope_id: { $in: scope_ids }, soft_deleted: { $ne: true } },
      });
      const contacts$ = DB.contact.subscribe$({ selector: { user_id } });
      const tasks$ = visible$(DB.task, {
        selector: {
          ...(list_id ? { list_id } : { list_id: { $ne: null } }),
          archived: { $ne: true },
          soft_deleted: { $ne: true },
        },
      });

      return combineLatest([lists$, members$, contacts$, tasks$]);
    }),
    map(([lists, members, contacts, tasks]) => {
      const contact_map = new Map(contacts.map((c) => [c.firebase_uid, c]));

      /** @type {Map<string, number>} */
      const task_count_map = new Map();
      for (const task of tasks) {
        if (!task.list_id) continue;
        task_count_map.set(task.list_id, (task_count_map.get(task.list_id) || 0) + 1);
      }

      /** @type {Map<string, DB.Member[]>} */
      const members_map = new Map();
      for (const member of members) {
        if (!member.scope_id) continue;
        const list_members = members_map.get(member.scope_id);
        if (list_members) list_members.push(member);
        else members_map.set(member.scope_id, [member]);
      }

      // A shared list only shows while the user is an active member, so a left list disappears before sync confirms.
      const visible = lists.filter(
        (list) =>
          list.owner_id === user_id ||
          (list.scope_id && members_map.get(list.scope_id)?.some((m) => m.firebase_uid === my_uid)),
      );

      return visible.map((list) => {
        /** @type {AL.ListListItem["members"]} */
        const formatted_names = [];

        for (const member of (list.scope_id && members_map.get(list.scope_id)) || []) {
          const is_admin = member.role === "admin";
          if (my_uid && member.firebase_uid === my_uid) {
            formatted_names.push({ name: t("you"), is_admin, is_me: true });
            continue;
          }

          // Members the viewer has no contact for are still members: show them rather than hiding them.
          const contact = contact_map.get(member.firebase_uid);
          const name = contact?.name || contact?.email_address || t("unknown_member");
          formatted_names.push({ name, is_admin });
        }

        return {
          id: list.id,
          name: list.name,
          description: list.description,
          owner_id: list.owner_id,
          is_shared: formatted_names.length > 1,
          task_count: task_count_map.get(list.id) || 0,
          members: formatted_names.sort((a, b) => {
            if (a.is_me && !b.is_me) return -1;
            if (!a.is_me && b.is_me) return 1;
            if (a.is_admin && !b.is_admin) return -1;
            if (!a.is_admin && b.is_admin) return 1;
            return a.name.localeCompare(b.name);
          }),
        };
      });
    }),
    // Emissions that produce an identical list must not re-render every card.
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}

// The tasks of one list (its page).

/**
 * Fills `list` with a list's open tasks (the Inbox for `INBOX_ID`). Returns the unsubscribe function, so it can be
 * returned from `onMount`.
 * @param {string} list_id
 * @param {AL.MainPageTask[]} list
 * @returns {() => void}
 */
export function taskList(list_id, list) {
  const subscription = subscribeListTaskList(list_id).subscribe((data) => list.splice(0, list.length, ...data));
  return () => subscription.unsubscribe();
}

/**
 * @param {string} list_id
 * @returns {import("rxjs").Observable<AL.MainPageTask[]>}
 */
function subscribeListTaskList(list_id) {
  const tasks$ = visible$(DB.task, {
    selector: { list_id: list_id === INBOX_ID ? null : list_id, archived: { $ne: true }, soft_deleted: { $ne: true } },
    sort: [{ due_date: "asc" }],
  });
  const contacts$ = DB.contact.subscribe$({ selector: { user_id: context.user?.id } });

  return combineLatest([tasks$, contacts$]).pipe(
    map(([tasks, contacts]) => {
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

        // Belangrike take eerste binne die tydgroep
        if (a.important !== b.important) {
          return a.important ? -1 : 1;
        }

        // Daarna op datum
        const a_date = DateUtil.endOfDay(a.due_date) ?? DateUtil.startOfDay(a.start_date) ?? new Date(0);
        const b_date = DateUtil.endOfDay(b.due_date) ?? DateUtil.startOfDay(b.start_date) ?? new Date(0);

        return a_date.getTime() - b_date.getTime();
      });

      return tasks.map((task) => formatTask(task, contact_map, today));
    }),
  );
}

/**
 * @param {DB.Task} task
 * @param {Map<string, string>} contactMap
 * @param {Date} today
 * @returns {AL.MainPageTask}
 */
function formatTask(task, contactMap, today) {
  const startDate = DateUtil.parseWithTimeBoundary(task.start_date, "start");
  const dueDate = DateUtil.parseWithTimeBoundary(task.due_date, "end");

  const is_ongoing = DateUtil.isDateInRange(today, startDate || dueDate, dueDate || startDate);
  const is_past = calculateIsPast(today, startDate, dueDate, is_ongoing);

  /** @type {AL.MainPageTask['pills']} */
  const pills = [];

  if (startDate || dueDate) {
    pills.push({
      type: "round",
      label: `${formatDateRange(startDate, dueDate)} ${task.due_date ? "" : DateUtil.getTime(task.start_date)}`.trim(),
      pre_icon: "clock",
      ...(task.repeat_interval ? { post_icon: "sync" } : {}),
    });
  }

  if (task.assigned_firebase_uid) {
    const my_uid = context.user?.firebase_uid;
    const assignee =
      task.assigned_firebase_uid === my_uid ? t("me") : (contactMap.get(task.assigned_firebase_uid) ?? t("unknown_member"));
    pills.push({ type: "square", label: assignee, pre_icon: "user" });
  }

  /** @type {AL.MainPageTask['top_right_icons']} */
  const top_right_icons = [];
  if (task.important) top_right_icons.push({ name: "important" });
  if (task.photo_ids?.length) top_right_icons.push({ name: "camera" });
  if (task.description) top_right_icons.push({ name: "message" });

  return {
    id: task.id,
    name: task.name,
    time_group_number: getGroup(task),
    is_ongoing,
    is_past,
    is_for_someone_else: !!(task.assigned_firebase_uid && task.assigned_firebase_uid !== context.user?.firebase_uid),
    list_id: task.list_id ?? null,
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
