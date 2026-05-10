import DB from "$domain/db";

export const ssr = false;

export async function load({ params, parent }) {
  await parent();
  const col = DB.getCollection(params.collection);
  if (!col) {
    return { collection: params.collection, records: null, error: "Collection not found" };
  }
  const result = await col.findMany();
  return {
    collection: params.collection,
    records: result.ok ? result.value : null,
    error: result.ok ? null : result.error,
  };
}
