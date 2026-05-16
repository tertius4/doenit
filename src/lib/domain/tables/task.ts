import t from "$lib/display/translate";
import Table from "./sync-table";

export class TaskTable extends Table<Domain.Task> {
  async create(item: Domain.Task): AsyncResult<DB.Task> {
    item = JSON.parse(JSON.stringify(item));

    item.name = item.name?.trim() || "";
    if (!item.name) return { ok: false, error: t("what_must_be_done") };

    const date_format = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/; // YYYY-MM-DD HH:mm
    // If date is set, ensure it's not in the past and the right format: YYYY-MM-DD HH:mm
    if (item.due_date !== undefined) {
      if (!!item.due_date && !date_format.test(item.due_date)) {
        return { ok: false, error: t("due_date_invalid_format") };
      }
    }

    if (item.start_date !== undefined) {
      if (!!item.start_date && !date_format.test(item.start_date)) {
        return { ok: false, error: t("start_date_invalid_format") };
      }
    }

    return super.create(item);
  }

  async update(id: string, changes: Partial<DB.Task>): AsyncResult<DB.Task> {
    changes = JSON.parse(JSON.stringify(changes));

    if (changes.name !== undefined) {
      changes.name = changes.name?.trim() || "";
    }

    if (!changes.name) return { ok: false, error: t("what_must_be_done") };

    const date_format = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/; // YYYY-MM-DD HH:mm
    // If date is set, ensure it's not in the past and the right format: YYYY-MM-DD HH:mm
    if (changes.due_date !== undefined) {
      if (!!changes.due_date && !date_format.test(changes.due_date)) {
        return { ok: false, error: t("due_date_invalid_format") };
      }
    }

    if (changes.start_date !== undefined) {
      if (!!changes.start_date && !date_format.test(changes.start_date)) {
        return { ok: false, error: t("start_date_invalid_format") };
      }
    }

    return super.update(id, changes);
  }
}
