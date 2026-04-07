import t from "$lib/display/translate";
import Table from "./sync-table";

export class CategoryTable extends Table<Domain.Category> {
  async create(item: Domain.Category): AsyncResult<DB.Category> {
    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Category>): AsyncResult<DB.Category> {
    if (!!changes.name) changes.name = changes.name.trim();

    if (changes.name !== undefined && !changes.name) {
      return { ok: false, error: t("enter_category_name") };
    }

    return super.update(id, changes);
  }
}
