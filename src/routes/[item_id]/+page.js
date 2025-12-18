import { DB } from "$lib/DB";
import { error } from "@sveltejs/kit";

export async function load({ params, parent }) {
  await parent();
  const origin_task = await DB.Task.get(params.item_id);
  if (!origin_task) {
    error(404, "Task not found");
  }

  return {
    /** @type {Task} */
    task: {
      id: origin_task.id,
      completed_at: origin_task.completed_at,
      created_at: origin_task.created_at,
      updated_at: origin_task.updated_at,
      name: origin_task.name,
      // description: origin_task.description || "",
      due_date: origin_task.due_date,
      start_date: origin_task.start_date,
      important: !!origin_task.important,
      completed: origin_task.completed ?? 0,
      photo_ids: origin_task.photo_ids || [],
      repeat_interval: origin_task.repeat_interval,
      repeat_interval_number: origin_task.repeat_interval_number || 1,
      repeat_specific_days: origin_task.repeat_specific_days || [],
      archived: origin_task.archived || false,
      category_id: origin_task.category_id || undefined,
      assigned_user_email: origin_task.assigned_user_email || undefined,
    },
  };
}
