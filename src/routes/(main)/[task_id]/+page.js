import toast from "$display/toast/toast.svelte.js";
import Api from "$logic/api";
import { redirect } from "@sveltejs/kit";

export async function load({ params, parent }) {
  await parent();
  const { task_id } = params;
  const task_result = await Api.task.getTaskById(task_id);
  if (!task_result.ok) {
    toast.show({ body: task_result.error, type: "error", duration: 3000 });
    throw redirect(308, "/create");
  }

  return { task: task_result.value };
}
