import BaseTable, { attempt } from "./base-table";

export default class SyncTable<T extends { id: string; channel: string; scope_id?: string | null }> extends BaseTable<T> {
  moveChannel(id: string, channel: string): AsyncResult<T> {
    return attempt(() => this.table.moveChannel(id, channel));
  }

  /** A new scope_id takes the document to that scope's channel, so the two never drift apart. */
  async update(id: string, changes: Partial<T> | Record<string, any>): AsyncResult<T> {
    const result = await super.update(id, changes);
    if (!result.ok) return result;

    const scope_id = changes.scope_id;
    const value = result.value as T;
    return scope_id && scope_id !== value.channel ? this.moveChannel(id, scope_id) : result;
  }

  /** Deletes from this device only, so nothing reaches other devices. */
  purge(id: string): AsyncResult<boolean> {
    return attempt(() => this.table.purge(id));
  }
}
