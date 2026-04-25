import type { RxCollection } from "$lib/logic/chunk/rxdb";
import Table from "./local-table";

export class SyncQueueTable extends Table<Domain.SyncQueueItem> {
  constructor(collection: RxCollection<DB.SyncQueueItem>) {
    super(collection as RxCollection<Domain.SyncQueueItem & DB.MetaDataPrivate>);
  }

  async create(item: Domain.SyncQueueItem): AsyncResult<DB.SyncQueueItem> {
    return super.create(item) as AsyncResult<DB.SyncQueueItem>;
  }

  async update(id: string, changes: Partial<DB.SyncQueueItem>): AsyncResult<DB.SyncQueueItem> {
    return super.update(id, changes) as AsyncResult<DB.SyncQueueItem>;
  }
}
