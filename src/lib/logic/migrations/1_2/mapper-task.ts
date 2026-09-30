import DB from "$domain/db";

export async function migrateTasks(legacyDb: any) {
  try {
    const task_collection =
      (legacyDb as any).Task || (legacyDb as any).task || (legacyDb as any).collections?.Task || (legacyDb as any).collections?.task;
    if (!task_collection) {
      return { ok: false, error: "Legacy Task collection not found" } as Result<{
        scanned: number;
        inserted: number;
        skipped: number;
      }>;
    }

    // Get all tasks from the old DB.
    const raw_old_tasks = await task_collection.find().exec();
    const old_tasks = raw_old_tasks.map((doc: any) => doc.toJSON());

    const new_tasks: Domain.Task[] = [];
    let skipped = 0;

    for (const old_task of old_tasks) {
      if (!old_task?.id) {
        skipped += 1;
        continue;
      }

      const existing = await DB.task.findById(old_task.id);
      if (!existing.ok) {
        return { ok: false, error: existing.error };
      }
      if (existing.value) {
        skipped += 1;
        continue;
      }

      new_tasks.push({
        id: old_task.id,
        created_at: old_task.created_at || new Date().toISOString(),
        updated_at: old_task.updated_at || old_task.created_at || new Date().toISOString(),
        name: old_task.name || "",
        description: old_task.description || "",
        completed: typeof old_task.completed === "number" ? old_task.completed : 0,
        completed_at: old_task.completed_at || null,
        due_date: old_task.due_date || null,
        start_date: old_task.start_date || null,
        repeat_interval: old_task.repeat_interval || "none",
        repeat_specific_days: Array.isArray(old_task.repeat_specific_days) ? old_task.repeat_specific_days : [],
        repeat_interval_number:
          typeof old_task.repeat_interval_number === "number" ? old_task.repeat_interval_number : 1,
        important: !!old_task.important,
        category_id: old_task.category_id || null,
        assigned_firebase_uid: null,
        photo_ids: Array.isArray(old_task.photo_ids) ? old_task.photo_ids : [],
        archived: !!old_task.archived,
        scope_id: null,
      } as any);
    }

    const insert_result = await DB.task.createMany(new_tasks as any);
    if (!insert_result.ok) return insert_result;

    return {
      ok: true,
      value: {
        scanned: old_tasks.length,
        inserted: insert_result.value.length,
        skipped,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}
