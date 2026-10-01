import toast from "$display/toast/toast.svelte.js";
import Api from "$logic/api";
import { redirect } from "@sveltejs/kit";

export async function load({ parent, params, depends }) {
  depends("layout:main");
  const { ready } = await parent();
  await ready;

  const result = await Api.groups.getById(params.group_id);
  if (!result.ok) {
    toast.show({ body: "Group not found", type: "error", duration: 3000 });
    throw redirect(308, "/groups");
  }

  return { group: result.value };
}
