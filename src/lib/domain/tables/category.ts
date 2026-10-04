import t from "$lib/display/translate";
import Table from "./sync-table";
import BaseTable from "./base-table";

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

  /** Categories are local only, so they are hard deleted instead of soft deleted. */
  // TODO: This should not be a shared table type but rather a local table type
  async remove(id: string): AsyncResult {
    return BaseTable.prototype.remove.call(this, id);
  }
}
