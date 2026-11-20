import { apiLogger } from "$lib";
import DateUtil from "$display/date-util";
import t from "$lib/display/translate";
import DB from "$lib/domain/db";
import { context } from "$logic/context.svelte";
import { SyncQueue } from "$domain/sync/SyncQueue";
import { NotificationService } from "$logic/notifications/NotificationService";
import { stableId } from "$domain/sync/scopes";
import { projectFromTask } from "$logic/checklist";
import { detach } from "$logic/chains";

export const save = apiLogger(saveListHandler);
export const remove = apiLogger(deleteListHandler);
export const addMember = apiLogger(addMemberHandler);
export const removeMember = apiLogger(removeMemberHandler);
export const getMembers = apiLogger(getMembersHandler);
export const getContacts = apiLogger(getContactsHandler);
export const getById = apiLogger(getByIdHandler);
export const moveTasks = apiLogger(moveTasksHandler);
export const complete = apiLogger(completeListHandler);
export const reopen = apiLogger(reopenListHandler);
export const convertTask = apiLogger(convertTaskHandler);

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 250;

/**
 * A list is private while its scope_id is null: its tasks sync through the owner's personal scope. Sharing it the
 * first time gives it its own scope (the list's id) and moves its tasks there. A shared list keeps its scope, even
 * when everyone else has left again.
 */

async function saveListHandler({
  id,
  name,
  description,
  completable = false,
  target_date = null,
}: Partial<DB.List>): AsyncResult<DB.List> {
  try {
    const list_name = name?.trim();
    const list_description = description?.trim() ?? "";
    if (!list_name) return { ok: false, error: t("enter_list_name") };
    if (list_name.length > MAX_NAME_LENGTH) return { ok: false, error: t("list_name_too_long") };
    if (list_description.length > MAX_DESCRIPTION_LENGTH) return { ok: false, error: t("list_description_too_long") };

    // Only a list with an end (a project) has a target date or can be completed.
    const project = completable
      ? { completable: true, target_date: target_date || null }
      : { completable: false, target_date: null, completed_at: null };

    if (id) {
      const admin = await requireAdmin(id);
      if (!admin.ok) return admin;

      return DB.list.update(id, { name: list_name, description: list_description, ...project });
    }

    return DB.list.create({
      name: list_name,
      description: list_description,
      scope_id: null,
      completed_at: null,
      ...project,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 * Deletes a list. Its tasks are deleted with it, or (keep_tasks) moved to the Inbox of the user deleting it.
 * Only the owner may delete a shared list; the other members lose it and are told.
 */
async function deleteListHandler(id: string, keep_tasks: boolean): AsyncResult {
  try {
    const admin = await requireAdmin(id);
    if (!admin.ok) return admin;

    const list = admin.value;
    if (list.scope_id && list.owner_id !== context.user?.id) {
      return { ok: false, error: t("only_owner_can_delete_list") };
    }

    const tasks = await DB.task.findMany({ selector: { list_id: id, soft_deleted: { $ne: true } } });
    if (!tasks.ok) return tasks;

    // Content first: the tombstones must be queued before members lose access to the scope.
    if (keep_tasks) {
      for (const task of tasks.value) {
        const moved = await moveTask(task, null, null);
        if (!moved.ok) return moved;
      }
    } else if (tasks.value.length) {
      const removed = await DB.task.removeMany(tasks.value.map((task) => task.id));
      if (!removed.ok) return removed;
    }

    const members = list.scope_id
      ? await DB.member.findMany({ selector: { scope_id: list.scope_id, soft_deleted: { $ne: true } } })
      : ({ ok: true, value: [] } as Result<DB.Member[]>);
    if (!members.ok) return members;

    if (members.value.length) {
      const removed = await DB.member.removeMany(members.value.map((member) => member.id));
      if (!removed.ok) return removed;
    }

    const deleted = await DB.list.remove(id);
    if (!deleted.ok) return deleted;

    await notifyDeletedList(members.value, list);

    // Membership removals go last: pushing the tombstones above requires the scope membership they revoke.
    if (list.scope_id) {
      const scope_id = list.scope_id;
      const removals = members.value
        .filter((member) => member.firebase_uid)
        .map((member) => ({
          table_name: "membership",
          entity_id: member.firebase_uid,
          scope_id,
          op: "delete" as const,
        }));
      if (removals.length) await SyncQueue.enqueueMany(removals);
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 * Completes a project by hand. Its open tasks stay open, but only show in the project itself. The other members of a
 * shared project are told.
 */
async function completeListHandler(id: string): AsyncResult<DB.List> {
  try {
    const admin = await requireAdmin(id);
    if (!admin.ok) return admin;

    const list = admin.value;
    if (!list.completable) return { ok: false, error: t("list_not_completable") };
    if (list.completed_at) return { ok: true, value: list };

    const result = await DB.list.update(id, { completed_at: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss") });
    if (!result.ok) return result;

    if (list.scope_id) await notifyCompletedList(result.value);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function reopenListHandler(id: string): AsyncResult<DB.List> {
  try {
    const admin = await requireAdmin(id);
    if (!admin.ok) return admin;
    if (!admin.value.completed_at) return { ok: true, value: admin.value };

    return DB.list.update(id, { completed_at: null });
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

async function addMemberHandler(list_id: string, contact_id: string): AsyncResult<ListMember> {
  try {
    const admin = await requireAdmin(list_id);
    if (!admin.ok) return admin;

    const contact_result = await DB.contact.findById(contact_id);
    if (!contact_result.ok) return contact_result;

    const contact = contact_result.value;
    if (!contact || contact.user_id !== context.user?.id) return { ok: false, error: t("contact_not_found") };

    const firebase_uid = contact.firebase_uid;
    if (!firebase_uid) return { ok: false, error: t("contact_not_linked") };

    const list = await ensureListScope(admin.value);
    if (!list.ok) return list;

    const existing_member = await findMember(list.value.id, firebase_uid);
    if (!existing_member.ok) return existing_member;

    const result = await upsertMember(list.value.id, firebase_uid, "member", existing_member.value);
    if (!result.ok) return result;

    await enqueueMembership(firebase_uid, list.value.id);
    if (!existing_member.value || existing_member.value.soft_deleted) {
      await NotificationService.createAddedToList(firebase_uid, list.value).then(warnOnFailure);
    }

    return {
      ok: true,
      value: {
        ...result.value,
        is_me: false,
        contact: { name: contact.name || "", email_address: contact.email_address || "" },
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/** Removes a member, or lets the current user leave. Tasks assigned to that member become unassigned. */
async function removeMemberHandler(member_id: string): AsyncResult {
  try {
    const member_result = await DB.member.findById(member_id);
    if (!member_result.ok) return member_result;
    if (!member_result.value) return { ok: false, error: t("member_not_found") };

    const member = member_result.value;
    if (member.soft_deleted) return { ok: true };

    const list_result = member.scope_id ? await DB.list.findById(member.scope_id) : null;
    const list = list_result?.ok ? list_result.value : null;

    const is_self = member.firebase_uid === context.user?.firebase_uid;
    if (is_self) {
      if (list && list.owner_id === context.user?.id) return { ok: false, error: t("owner_cannot_leave_list") };
    } else {
      if (!list) return { ok: false, error: t("list_not_found") };

      const admin = await requireAdmin(list.id);
      if (!admin.ok) return admin;

      // Admin rows belong to the list owner and can't be removed by anyone else.
      if (member.role === "admin") return { ok: false, error: t("cannot_remove_list_owner") };
    }

    const assigned = await DB.task.findMany({
      selector: { scope_id: member.scope_id, assigned_firebase_uid: member.firebase_uid, soft_deleted: { $ne: true } },
    });
    if (!assigned.ok) return assigned;
    if (assigned.value.length) {
      const cleared = await DB.task.updateMany(
        assigned.value.map((task) => ({ id: task.id, changes: { assigned_firebase_uid: null } })),
      );
      if (!cleared.ok) return cleared;
    }

    const result = await DB.member.update(member_id, { soft_deleted: true });
    if (!result.ok) return result;

    await enqueueMembershipRemoval(member.firebase_uid, member.scope_id);
    if (list && is_self) {
      await notifyMemberLeft(list);
    } else if (list) {
      await NotificationService.createRemovedFromList(member.firebase_uid, list).then(warnOnFailure);
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

export type ListMember = DB.Member & {
  is_me: boolean;
  contact: { name?: string; email_address: string } | null;
};

async function getMembersHandler(list_id: string): AsyncResult<ListMember[]> {
  try {
    const result = await DB.member.findMany({
      selector: { scope_id: list_id, soft_deleted: { $ne: true } },
    });
    if (!result.ok) return result;

    const members = result.value;
    const contact_result = context.user?.id
      ? await DB.contact.findMany({
          selector: { user_id: context.user.id, firebase_uid: { $in: members.map((member) => member.firebase_uid) } },
        })
      : null;

    const my_uid = context.user?.firebase_uid;
    const hash: Record<string, { name?: string; email_address: string }> = {};
    if (contact_result?.ok) {
      for (const contact of contact_result.value) {
        if (!contact.firebase_uid) continue;
        // Several contacts can point at the same user; keep the one that has a name.
        if (hash[contact.firebase_uid]?.name && !contact.name) continue;

        hash[contact.firebase_uid] = {
          email_address: contact.email_address || "",
          name: contact.name || "",
        };
      }
    }

    const enriched = members.map((member) => {
      const is_me = !!my_uid && member.firebase_uid === my_uid;
      return {
        ...member,
        is_me,
        contact: is_me
          ? { name: "", email_address: context.user?.email_address || "" }
          : hash[member.firebase_uid] || null,
      };
    });

    return { ok: true, value: enriched };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/** Contacts that can be added to a list, i.e. the ones linked to a user. */
async function getContactsHandler(): AsyncResult<DB.Contact[]> {
  if (!context.user?.id) return { ok: true, value: [] };

  const result = await DB.contact.findMany({
    selector: { user_id: context.user.id },
    sort: [{ name: "asc" }],
  });
  if (!result.ok) return result;

  return { ok: true, value: result.value.filter((contact) => !!contact.firebase_uid) };
}

async function getByIdHandler(id: string): AsyncResult<DB.List> {
  try {
    const result = await DB.list.findById(id);
    if (!result.ok) return result;
    if (!result.value || result.value.soft_deleted) return { ok: false, error: t("list_not_found") };

    // The owner always may, even before they have a member row; a shared list also its members.
    const list = result.value;
    if (list.owner_id === context.user?.id || (!context.user && list.owner_id === "device")) {
      return { ok: true, value: list };
    }
    if (!list.scope_id || !context.active_scopes.includes(list.scope_id)) {
      return { ok: false, error: t("list_not_found") };
    }

    const member_result = await findMember(list.scope_id, context.user?.firebase_uid ?? "");
    if (!member_result.ok) return member_result;
    if (!member_result.value || member_result.value.soft_deleted) return { ok: false, error: t("list_not_found") };

    return { ok: true, value: list };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/** Puts tasks in a list (null is the Inbox). Tasks that change scope get new ids (see moveTask). */
async function moveTasksHandler(list_id: string | null, task_ids: string[]): AsyncResult {
  try {
    let scope_id: string | null = null;
    if (list_id) {
      const list = await getByIdHandler(list_id);
      if (!list.ok) return list;
      if (list.value.completed_at) return { ok: false, error: t("project_is_completed") };
      scope_id = list.value.scope_id ?? null;
    }

    const tasks = await DB.task.findMany({ selector: { id: { $in: task_ids } } });
    if (!tasks.ok) return tasks;

    for (const task of tasks.value) {
      const moved = await moveTask(task, list_id, scope_id);
      if (!moved.ok) return moved;
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/**
 * Turns a task with a checklist into a project (see projectFromTask): a task for every item, then the task itself is
 * deleted. A task in a shared list gives a shared project with the same members.
 * @returns The new project.
 */
async function convertTaskHandler(task_id: string): AsyncResult<DB.List> {
  try {
    const task_result = await DB.task.findById(task_id);
    if (!task_result.ok) return task_result;
    const task = task_result.value;
    if (!task || task.soft_deleted) return { ok: false, error: t("task_not_found") };
    if (!task.checklist?.length) return { ok: false, error: t("checklist_empty") };

    const plan = projectFromTask(task, DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"));
    const created = await saveListHandler(plan.list);
    if (!created.ok) return created;
    let project = created.value;

    if (task.scope_id) {
      const shared = await shareLike(project, task.scope_id);
      if (!shared.ok) return shared;
      project = shared.value;
    }

    for (const new_task of plan.tasks) {
      const result = await DB.task.create({
        ...new_task,
        due_date: null,
        start_date: null,
        repeat_interval: "",
        repeat_specific_days: [],
        repeat_interval_number: 1,
        important: false,
        checklist: [],
        after_task_id: null,
        list_id: project.id,
        scope_id: project.scope_id ?? null,
      });
      if (!result.ok) return result;
    }

    const left = await leaveChain(task.id);
    if (!left.ok) return left;
    const removed = await DB.task.remove(task.id);
    if (!removed.ok) return removed;

    return { ok: true, value: project };
  } catch (err) {
    const error = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, error };
  }
}

/** Shares a new list with everyone in another list's scope, without needing them as contacts. */
async function shareLike(list: DB.List, scope_id: string): AsyncResult<DB.List> {
  const shared = await ensureListScope(list);
  if (!shared.ok) return shared;

  const members = await DB.member.findMany({ selector: { scope_id, soft_deleted: { $ne: true } } });
  if (!members.ok) return members;

  for (const member of members.value) {
    if (member.firebase_uid === context.user?.firebase_uid) continue;

    const added = await upsertMember(shared.value.id, member.firebase_uid, "member", null);
    if (!added.ok) return added;
    await enqueueMembership(member.firebase_uid, shared.value.id);
    await NotificationService.createAddedToList(member.firebase_uid, shared.value).then(warnOnFailure);
  }

  return shared;
}

/**
 * Puts a task in another list. Within one scope only list_id changes. Across scopes the task is copied into the new
 * scope under an id derived from the old one, and the old one is deleted: the old scope's members see it go, the new
 * scope's members get it, and one id never lives in two scopes.
 * @param list_id  The list, or null for the Inbox.
 * @param scope_id  That list's scope (null for a private list or the Inbox).
 */
export async function moveTask(task: DB.Task, list_id: string | null, scope_id: string | null): AsyncResult<DB.Task> {
  const same_list = (task.list_id ?? null) === list_id;
  if (same_list && (task.scope_id ?? null) === scope_id) return { ok: true, value: task };

  if (!same_list) {
    // A chain stays inside one list: the task leaves its chain first.
    const left = await leaveChain(task.id);
    if (!left.ok) return left;
    task = { ...task, after_task_id: null };
  }

  if ((task.scope_id ?? null) === scope_id) return DB.task.update(task.id, { list_id, after_task_id: null });

  const { id, created_at, updated_at, version, device_id, owner_id, field_times, soft_deleted, ...content } = task;
  const changes = {
    ...content,
    list_id,
    scope_id,
    // The whole list moves scope together (ensureListScope), so the task it waits on gets its new id too.
    after_task_id: content.after_task_id ? await stableId(content.after_task_id, scope_id ?? "personal") : null,
    // Nobody outside the user can be assigned a private task.
    ...(scope_id ? {} : { assigned_firebase_uid: null }),
  } as Domain.Task;

  const new_id = await stableId(id, scope_id ?? "personal");
  const existing = await DB.task.findById(new_id);
  if (!existing.ok) return existing;

  const moved = existing.value
    ? await DB.task.update(new_id, { ...changes, soft_deleted: false })
    : await DB.task.create({ ...changes, id: new_id, created_at } as Domain.Task);
  if (!moved.ok) return moved;

  const removed = await DB.task.remove(id);
  if (!removed.ok) return removed;

  return moved;
}

/**
 * Takes a task out of its chain (before it is deleted or leaves its list): whatever waited on it now waits on the
 * task before it, or on nothing.
 */
export async function leaveChain(task_id: string): AsyncResult {
  const task = await DB.task.findById(task_id);
  if (!task.ok || !task.value) return { ok: true };

  const tasks = await DB.task.findMany({ selector: { list_id: task.value.list_id ?? null, soft_deleted: { $ne: true } } });
  if (!tasks.ok) return tasks;

  for (const { id, after_task_id } of detach(tasks.value, task_id)) {
    const result = await DB.task.update(id, { after_task_id });
    if (!result.ok) return result;
  }
  return { ok: true };
}

/**
 * Gives a private list its own scope the first time it is shared: the owner becomes its admin member, and the list
 * and its tasks move from the personal scope to the new one.
 */
export async function ensureListScope(list: DB.List): AsyncResult<DB.List> {
  if (list.scope_id) return { ok: true, value: list };

  const firebase_uid = context.user?.firebase_uid;
  if (!firebase_uid) return { ok: false, error: t("sign_in_to_share") };

  // The owner's own membership first: every write below goes to the new scope.
  await enqueueMembership(firebase_uid, list.id);
  const owner = await upsertMember(list.id, firebase_uid, "admin");
  if (!owner.ok) return owner;

  const updated = await DB.list.update(list.id, { scope_id: list.id });
  if (!updated.ok) return updated;

  const tasks = await DB.task.findMany({ selector: { list_id: list.id, soft_deleted: { $ne: true } } });
  if (!tasks.ok) return tasks;
  for (const task of tasks.value) {
    const moved = await moveTask(task, list.id, list.id);
    if (!moved.ok) return moved;
  }

  return updated;
}

function findMember(scope_id: string, firebase_uid: string): AsyncResult<DB.Member | null> {
  return DB.member.findOne({ selector: { scope_id, firebase_uid } });
}

/** Creates or revives a member row. Pass `known` (null = none) to skip the lookup when the caller already did it. */
async function upsertMember(
  scope_id: string,
  firebase_uid: string,
  role: DB.Member["role"],
  known?: DB.Member | null,
): AsyncResult<DB.Member> {
  let existing = known;
  if (existing === undefined) {
    const existing_result = await findMember(scope_id, firebase_uid);
    if (!existing_result.ok) return existing_result;
    existing = existing_result.value;
  }

  if (existing) {
    if (existing.role === role && !existing.soft_deleted) return { ok: true, value: existing };

    return DB.member.update(existing.id, {
      role,
      soft_deleted: false,
      scope_id,
      firebase_uid,
    } as Partial<DB.Member>);
  }

  return DB.member.create({
    scope_id,
    firebase_uid,
    role,
    owner_id: context.user?.id || "device",
  } as Domain.Member);
}

/** Resolves the list and verifies the current user may administer it: its owner, or an admin member. */
async function requireAdmin(list_id: string): AsyncResult<DB.List> {
  const list_result = await DB.list.findById(list_id);
  if (!list_result.ok) return list_result;

  const list = list_result.value;
  if (!list || list.soft_deleted) return { ok: false, error: t("list_not_found") };

  const my_id = context.user?.id ?? "device";
  if (list.owner_id === my_id) return { ok: true, value: list };

  const my_uid = context.user?.firebase_uid;
  if (list.scope_id && my_uid) {
    const member = await findMember(list.scope_id, my_uid);
    if (member.ok && member.value && !member.value.soft_deleted && member.value.role === "admin") {
      return { ok: true, value: list };
    }
  }

  return { ok: false, error: t("only_list_admin") };
}

async function enqueueMembership(firebase_uid: string | undefined, scope_id: string) {
  if (!firebase_uid) return;

  await SyncQueue.enqueue({ table_name: "membership", entity_id: firebase_uid, scope_id, op: "upsert" });
}

async function enqueueMembershipRemoval(firebase_uid: string | undefined, scope_id: string | null | undefined) {
  if (!firebase_uid || !scope_id) return;

  await SyncQueue.enqueue({ table_name: "membership", entity_id: firebase_uid, scope_id, op: "delete" });
}

async function notifyDeletedList(members: DB.Member[], list: DB.List) {
  const current_firebase_uid = context.user?.firebase_uid;
  await Promise.all(
    members
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid && !member.soft_deleted)
      .map((member) => NotificationService.createListDeleted(member.firebase_uid, list).then(warnOnFailure)),
  );
}

async function notifyMemberLeft(list: DB.List) {
  const current_firebase_uid = context.user?.firebase_uid;
  const members = await DB.member.findMany({ selector: { scope_id: list.id, soft_deleted: { $ne: true } } });
  if (!members.ok) return;

  const user_name = context.user?.name || context.user?.email_address || "";
  await Promise.all(
    members.value
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid)
      .map((member) => NotificationService.createUserLeftList(member.firebase_uid, list, user_name).then(warnOnFailure)),
  );
}

async function notifyCompletedList(list: DB.List) {
  const current_firebase_uid = context.user?.firebase_uid;
  const members = await DB.member.findMany({ selector: { scope_id: list.id, soft_deleted: { $ne: true } } });
  if (!members.ok) return;

  const user_name = context.user?.name || context.user?.email_address || "";
  await Promise.all(
    members.value
      .filter((member) => member.firebase_uid && member.firebase_uid !== current_firebase_uid)
      .map((member) => NotificationService.createListCompleted(member.firebase_uid, list, user_name).then(warnOnFailure)),
  );
}

function warnOnFailure(result: Result<unknown>) {
  if (!result.ok) console.warn("[lists] failed to create notification:", result.error);
}
