import DB from "$domain/db";
import type { RxDatabase } from "rxdb";

export async function migrateCategories(legacyDb: RxDatabase) {
  // Get all the Categories from the old DB.
  const raw_old_categories = await legacyDb.Category.find().exec();
  const old_categories = raw_old_categories.map((doc) => doc.toJSON());

  // Remember to cancel out Default category.
  const filtered_old_categories = old_categories.filter((cat) => !cat.is_default);

  // Map old categories to new categories.
  const new_categories: Domain.Category[] = filtered_old_categories.map((old_cat) => ({
    id: old_cat.id,
    name: old_cat.name,
  }));

  // Insert new categories into the new DB.
  await DB.category.createMany(new_categories);
}
