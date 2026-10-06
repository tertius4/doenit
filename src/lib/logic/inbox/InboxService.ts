/**
 * Turns tasks sent through the public API (users/{uid}/inbox_tasks, written by the `api` Cloud Function)
 * into real local tasks. Personal tasks only live on the device, so the server cannot create them itself.
 * Runs whenever the inbox listener fires, which includes the initial snapshot when the app starts.
 */

import firestore from "$services/firestore";
import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import * as task_api from "$logic/api/task";
import * as category_api from "$logic/api/categories";

let running = false;
/** Inbox docs that arrived while a drain was running; handled right after it. */
let pending: AL.InboxTask[] | null = null;

export const InboxService = {
  async drain(tasks: AL.InboxTask[]): Promise<void> {
    if (running) {
      pending = tasks;
      return;
    }

    running = true;
    try {
      let batch: AL.InboxTask[] | null = tasks;
      while (batch) {
        pending = null;
        for (const inbox_task of batch) {
          await addTask(inbox_task).catch((error) => console.warn(`[inbox] failed to add ${inbox_task.id}:`, error));
        }
        batch = pending;
      }
    } finally {
      running = false;
    }
  },
};

async function addTask(inbox_task: AL.InboxTask): Promise<void> {
  const uid = context.user?.firebase_uid;
  if (!uid) return;

  // The inbox id doubles as the task id, so a doc that was added but not yet deleted is never added twice.
  const existing = await DB.task.findById(inbox_task.id);
  if (!existing.ok) throw new Error(existing.error);

  if (!existing.value) {
    const category_id = inbox_task.category ? await resolveCategory(inbox_task.category) : undefined;
    const task = task_api.getNewTask({
      name: inbox_task.name,
      description: inbox_task.description ?? "",
      due_date: inbox_task.due_date ?? null,
      start_date: inbox_task.start_date ?? null,
      important: !!inbox_task.important,
      repeat_interval: inbox_task.repeat_interval ?? "",
      repeat_interval_number: inbox_task.repeat_interval_number ?? 1,
      repeat_specific_days: inbox_task.repeat_specific_days ?? [],
      category_id,
      scope_id: inbox_task.group_id ?? undefined,
    });

    const result = await task_api.createTask({ ...task, id: inbox_task.id } as Domain.Task);
    if (!result.ok) throw new Error(result.error);
  }

  await firestore.deleteInboxTask(uid, inbox_task.id);
}

/** Finds a category by name (ignoring case) or creates it. */
async function resolveCategory(name: string): Promise<string | undefined> {
  const categories = await DB.category.findMany({ selector: { soft_deleted: { $ne: true } } });
  if (!categories.ok) throw new Error(categories.error);

  const wanted = name.trim().toLowerCase();
  const match = categories.value.find((category) => category.name.trim().toLowerCase() === wanted);
  if (match) return match.id;

  const created = await category_api.save({ name: name.trim() });
  if (!created.ok) throw new Error(created.error);
  return created.value.id;
}
