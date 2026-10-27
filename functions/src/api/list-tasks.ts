import { type Result } from "../shared/result";
import { type Access, categoryNames, itemsOf } from "./store";
import { type PublicTask, type StoredTask, toPublicTask } from "./task-fields";

/** GET /v1/tasks: open personal and group tasks, or all of them with include_completed. Two queries per scope. */
export async function listTasks(access: Access, include_completed: boolean): Promise<Result<PublicTask[]>> {
  const scopes = [access.personal_scope, ...access.group_scopes];

  const per_scope = await Promise.all(
    scopes.map(async (scope_id) => {
      let query = itemsOf(scope_id).where("collection", "==", "task");
      if (!include_completed) query = query.where("archived", "==", false);

      const [snap, names] = await Promise.all([query.get(), categoryNames(scope_id)]);
      return snap.docs
        .map((doc) => doc.data() as StoredTask)
        .filter((task) => !task.soft_deleted && task.name)
        .map((task) => toPublicTask(task, names));
    }),
  );

  return { ok: true, value: per_scope.flat() };
}
