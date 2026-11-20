/**
 * Pure rules for a task's checklist and for turning a task into a project. No database access, so it can be tested.
 */

export const MAX_CHECKLIST_ITEMS = 100;
export const MAX_CHECKLIST_TEXT = 300;
/** Same limits as a list's name and description (logic/api/lists.ts). */
const MAX_LIST_NAME = 100;
const MAX_LIST_DESCRIPTION = 250;

/** Trims every item, drops empty ones, and keeps to the schema's limits. Items without an id get one. */
export function cleanChecklist(items: Partial<Domain.ChecklistItem>[] | null | undefined): Domain.ChecklistItem[] {
  return (items ?? [])
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      text: (item.text ?? "").trim().slice(0, MAX_CHECKLIST_TEXT),
      done: !!item.done,
    }))
    .filter((item) => item.text)
    .slice(0, MAX_CHECKLIST_ITEMS);
}

/** Every item open again, for when a repeating task comes back. */
export function resetChecklist(items: Domain.ChecklistItem[] | null | undefined): Domain.ChecklistItem[] {
  return (items ?? []).map((item) => ({ ...item, done: false }));
}

export function toggleChecklistItem(items: Domain.ChecklistItem[] | null | undefined, item_id: string) {
  return (items ?? []).map((item) => (item.id === item_id ? { ...item, done: !item.done } : item));
}

/** "2/5" for the task's pill, or null without items. */
export function checklistLabel(items: Domain.ChecklistItem[] | null | undefined): string | null {
  if (!items?.length) return null;
  return `${items.filter((item) => item.done).length}/${items.length}`;
}

export type ProjectPlan = {
  list: { name: string; description: string; completable: true; target_date: string | null };
  tasks: Pick<Domain.Task, "name" | "description" | "archived" | "completed" | "completed_at" | "photo_ids">[];
};

/**
 * The project a task turns into: the task's name and description, its last date as the target date, and a task for
 * every item (a ticked item is a completed task). A description too long for a list goes on the first task instead,
 * and so do the task's photos.
 * @param now "YYYY-MM-DD HH:mm:ss", the completion time of the ticked items.
 */
export function projectFromTask(task: Domain.Task, now: string): ProjectPlan {
  const description = (task.description ?? "").trim();
  const fits = description.length <= MAX_LIST_DESCRIPTION;
  const date = task.due_date || task.start_date;

  const tasks = cleanChecklist(task.checklist).map((item, index) => ({
    name: item.text,
    description: index === 0 && !fits ? description : "",
    archived: item.done,
    completed: item.done ? 1 : 0,
    completed_at: item.done ? now : null,
    photo_ids: index === 0 ? [...(task.photo_ids ?? [])] : [],
  }));

  return {
    list: {
      name: task.name.trim().slice(0, MAX_LIST_NAME),
      description: fits ? description : "",
      completable: true,
      target_date: date ? date.slice(0, 10) : null,
    },
    tasks,
  };
}
