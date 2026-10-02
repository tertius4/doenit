import DB from "$domain/db";
import firestore from "$services/firestore";
import { MembershipService } from "./MembershipService";
import { SyncQueue } from "./SyncQueue";
import syncEngine from "./SyncEngine";
import { context } from "$logic/context.svelte";

const BATCH_SIZE = 50;

export class PushProcessor {
  static async run() {
    const result_batch = await SyncQueue.getBatch(BATCH_SIZE);
    if (!result_batch.ok) return result_batch;

    // The user's own membership removal goes last: it revokes the access needed to push everything else of that scope.
    const my_uid = context.user?.firebase_uid;
    const isOwnRemoval = (item: DB.SyncQueueItem) =>
      item.table_name === "membership" && item.op === "delete" && item.entity_id === my_uid;
    const batch = [...result_batch.value].sort((a, b) => Number(isOwnRemoval(a)) - Number(isOwnRemoval(b)));
    for (const item of batch) {
      try {
        if (item.table_name === "membership") {
          if (item.op === "delete") {
            await MembershipService.removeScope(item.entity_id, item.scope_id);
          } else {
            await MembershipService.addScope(item.entity_id, item.scope_id);
          }
          await SyncQueue.remove(item.id);
          continue;
        }

        const collection = DB.getCollection(item.table_name);
        if (!collection) throw new Error(`Collection ${item.table_name} not found`);
        const doc_result = await collection.findById(item.entity_id);
        if (!doc_result.ok) throw new Error(`Document ${item.entity_id} not found in collection ${item.table_name}`);
        const doc = doc_result.value;

        if (item.op === "delete" && !doc) {
          await firestore.delete(item);
        } else if (doc) {
          // A soft-deleted doc is pushed in full so remote tombstones keep version/device_id for merging.
          await firestore.upsert(item.table_name, doc as DB.MetaDataShared & Record<string, any>);
        }

        await SyncQueue.remove(item.id);
      } catch (err) {
        console.warn(`[PushProcessor] Failed to push ${item.table_name}:${item.entity_id} (${item.op}):`, err);
        await SyncQueue.markFailed(item.id);
      }
    }

    // If the batch was full there may be more items waiting — schedule another tick
    if (batch.length === BATCH_SIZE) {
      syncEngine.requestTick();
    }
  }
}
