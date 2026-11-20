import { type Result } from "../shared/result";
import { type Access, findTask, stampChange, tasksOfList, writeItem, writeTaskChanges } from "./store";
import { detach } from "./chain";

/** DELETE /v1/tasks/{id}: a soft delete with the full document, like the app's own deletes, so every device removes it. */
export async function deleteTask(access: Access, id: string): Promise<Result> {
  const found = await findTask(access, id);
  if (!found) return { ok: false, error: "Task not found", status_code: 404 };
  const { task, scope_id } = found;

  // Whatever waited on this task now waits on the task before it.
  const chain_tasks = await tasksOfList(scope_id, task.list_id ?? null);
  await writeTaskChanges(scope_id, chain_tasks, detach(chain_tasks, id).filter((change) => change.id !== id));

  await writeItem(scope_id, stampChange(task, { ...task, soft_deleted: true }));
  return { ok: true };
}
