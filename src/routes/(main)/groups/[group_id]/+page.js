import toast from "$display/toast/toast.svelte.js";
import { redirect } from "@sveltejs/kit";

export async function load({ parent }) {
  const data = await parent();

  if (!data?.group) {
    toast.show({ body: "Group not found", type: "error", duration: 3000 });
    throw redirect(308, "/groups");
  }

  return {
    ...data,
    group: data.group,
  };
}
