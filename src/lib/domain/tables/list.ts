import t from "$lib/display/translate";
import Table from "./sync-table";

export class ListTable extends Table<Domain.List> {
  async create(item: Domain.List): AsyncResult<DB.List> {
    const name = item.name?.trim() || "";
    if (!name) return { ok: false, error: t("enter_list_name") };

    return super.create({ ...item, name });
  }

  async update(id: string, changes: Partial<DB.List>): AsyncResult<DB.List> {
    if (changes.name !== undefined) {
      changes.name = changes.name.trim();
      if (!changes.name) return { ok: false, error: t("enter_list_name") };
    }

    return super.update(id, changes);
  }
}
