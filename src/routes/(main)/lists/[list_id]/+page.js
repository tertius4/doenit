import toast from "$display/toast/toast.svelte.js";
import Api from "$logic/api";
import t from "$display/translate";
import { INBOX_ID } from "$lib";
import { redirect } from "@sveltejs/kit";

export async function load({ parent, params, depends }) {
  depends("lists:page");
  const { ready } = await parent();
  await ready;

  // The Inbox is not a list document: it is every task without a list.
  if (params.list_id === INBOX_ID) return { list: null };

  const result = await Api.lists.getById(params.list_id);
  if (!result.ok) {
    toast.show({ body: t("list_not_found"), type: "error", duration: 3000 });
    throw redirect(308, "/lists");
  }

  return { list: result.value };
}
