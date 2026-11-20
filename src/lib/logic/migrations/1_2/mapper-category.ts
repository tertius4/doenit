import DB from "$domain/db";

export async function migrateCategories(legacyDb: any) {
  try {
    const category_collection =
      (legacyDb as any).Category ||
      (legacyDb as any).category ||
      (legacyDb as any).collections?.Category ||
      (legacyDb as any).collections?.category;
    if (!category_collection) {
      return { ok: false, error: "Legacy Category collection not found" } as Result<{
        scanned: number;
        inserted: number;
        skipped: number;
      }>;
    }

    // Get all categories from the old DB.
    const raw_old_categories = await category_collection.find().exec();
    const old_categories = raw_old_categories.map((doc: any) => doc.toJSON());

    // Skip default categories and invalid IDs.
    const filtered_old_categories = old_categories.filter((cat: any) => !cat.is_default && !!cat.id);

    const new_lists: Domain.List[] = [];
    let skipped = 0;

    for (const old_cat of filtered_old_categories) {
      const existing = await DB.list.findById(old_cat.id);
      if (!existing.ok) {
        return { ok: false, error: existing.error };
      }
      if (existing.value) {
        skipped += 1;
        continue;
      }

      new_lists.push({
        id: old_cat.id,
        name: old_cat.name || "?",
        scope_id: null,
        ...(old_cat.created_at && { created_at: old_cat.created_at }),
        ...(old_cat.updated_at && { updated_at: old_cat.updated_at }),
      } as any);
    }

    const insert_result = await DB.list.createMany(new_lists as any);
    if (!insert_result.ok) return insert_result;

    return {
      ok: true,
      value: {
        scanned: filtered_old_categories.length,
        inserted: insert_result.value.length,
        skipped,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, error: message };
  }
}
