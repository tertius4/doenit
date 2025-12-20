import { DB } from "$lib/DB";

export async function load({ parent }) {
  await parent();
  return {};
}
