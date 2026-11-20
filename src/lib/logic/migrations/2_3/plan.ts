/**
 * Pure rules for turning groups and categories into lists (see migration.ts). No database access, so it can be tested.
 */

export type LegacyGroup = {
  id: string;
  name?: string;
  description?: string;
  scope_id?: string | null;
  owner_id?: string;
  created_at?: string;
  soft_deleted?: boolean;
};

export type LegacyCategory = {
  id: string;
  name?: string;
  scope_id?: string | null;
  owner_id?: string;
  created_at?: string;
  soft_deleted?: boolean;
};

export type TaskRef = { id: string; list_id?: string | null; scope_id?: string | null };

export type ListPlan = {
  id: string;
  name: string;
  description: string;
  scope_id: string | null;
  owner_id?: string;
  created_at?: string;
  /** The group scope whose members a list made from one of its categories gets. */
  members_from?: string;
};

export type TaskPlan = {
  id: string;
  list_id: string | null;
  /** The scope the task has to move to; undefined when it stays in its own scope. */
  move_to?: string | null;
};

/**
 * Every group and category becomes a list with the same id:
 * - a group keeps its scope (null for a group nobody was added to) and members;
 * - a personal category becomes a private list;
 * - a category in a group becomes a shared list in a new scope (its own id) with the group's members.
 * A category whose group is gone is dropped: its scope can no longer be reached.
 */
export function planLists(groups: LegacyGroup[], categories: LegacyCategory[]): ListPlan[] {
  const live_groups = groups.filter((group) => group.id && !group.soft_deleted);
  const group_scopes = new Set(live_groups.map((group) => group.scope_id).filter(Boolean));
  const plans: ListPlan[] = live_groups.map((group) => ({
    id: group.id,
    name: group.name?.trim() || "?",
    description: group.description ?? "",
    scope_id: group.scope_id ?? null,
    owner_id: group.owner_id,
    created_at: group.created_at,
  }));

  for (const category of categories) {
    if (!category.id || category.id === "default" || category.soft_deleted) continue;

    const base = {
      id: category.id,
      name: category.name?.trim() || "?",
      description: "",
      owner_id: category.owner_id,
      created_at: category.created_at,
    };

    if (!category.scope_id) {
      plans.push({ ...base, scope_id: null });
    } else if (group_scopes.has(category.scope_id)) {
      plans.push({ ...base, scope_id: category.id, members_from: category.scope_id });
    }
  }

  return plans;
}

/**
 * Where each task goes. `task.list_id` holds what the task schema migration put there: its old category, or else its
 * group. A task never changes who can see it, except that a group task in one of the group's categories moves to
 * that category's new scope (which has the same members):
 * - a group task with a category of another scope (a personal one) stays in the group's list;
 * - a personal task with a group's category goes to the Inbox.
 */
export function planTasks(tasks: TaskRef[], lists: ListPlan[]): TaskPlan[] {
  const by_id = new Map(lists.map((list) => [list.id, list]));

  return tasks.map((task) => {
    const scope_id = task.scope_id ?? null;
    const list = task.list_id ? by_id.get(task.list_id) : undefined;

    if (list && list.scope_id === scope_id) return { id: task.id, list_id: list.id };
    if (list && scope_id && list.members_from === scope_id) {
      return { id: task.id, list_id: list.id, move_to: list.scope_id };
    }

    const group_list = scope_id ? lists.find((candidate) => candidate.scope_id === scope_id) : undefined;
    return { id: task.id, list_id: group_list?.id ?? null };
  });
}
