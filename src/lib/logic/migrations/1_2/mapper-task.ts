import DB from "$domain/db";
import type { RxDatabase } from "rxdb";

export async function migrateTasks(legacyDb: RxDatabase) {
  // Get all the tasks from the old DB.
  const raw_old_tasks = await legacyDb.Task.find().exec();
  const old_tasks = raw_old_tasks.map((doc) => doc.toJSON());

  // Map old tasks to new tasks.
  const new_tasks: Domain.Task[] = old_tasks.map((old_task) => ({
    id: old_task.id,
    created_at: old_task.created_at,
    name: old_task.name,
    completed: old_task.completed,
    completed_at: old_task.completed_at,
    due_date: old_task.due_date,
    start_date: old_task.start_date,
    repeat_interval: old_task.repeat_interval,
    repeat_specific_days: old_task.repeat_specific_days,
    repeat_interval_number: old_task.repeat_interval_number,
    important: old_task.important,
    category_id: old_task.category_id,
    assigned_firebase_uid: undefined,
    photo_ids: old_task.photo_ids || [],
    archived: old_task.archived,
  }));

  // Insert new tasks into the new DB.
  await DB.task.createMany(new_tasks);
}
