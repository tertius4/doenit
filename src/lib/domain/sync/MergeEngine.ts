import DB from "$domain/db";
import { SyncQueue } from "./SyncQueue";
import { mergeFields } from "./field-times";
import { isPersonalScope } from "./personal";
import { context } from "$logic/context.svelte";

class MergeEngine {
  /** Applies a pulled document. `scope_id` is the scope it was pulled from (a personal document keeps scope_id null). */
  async apply(remote: Record<string, any> & DB.MetaDataShared, scope_id: string) {
    // TODO: getCollection, moet getSyncCollection wees.
    const collection = DB.getCollection(remote.collection);
    if (!collection) throw new Error(`Collection ${remote.collection} not found`);
    const doc_result = await collection.findById(remote.id);
    if (!doc_result.ok) throw new Error(`Document ${remote.id} not found in collection ${remote.collection}`);
    const local = doc_result.value as (Record<string, any> & DB.MetaDataShared) | null;

    // The schema rejects unknown fields, so keep only the ones this app version knows (this also drops `collection`).
    // A field written by an older or newer app version must not make the whole document disappear.
    const fields = collection.collection.schema.jsonSchema.properties;
    const known = Object.fromEntries(Object.entries(remote).filter(([key]) => key in fields)) as typeof remote;

    if (!local) {
      // Nothing to delete locally, so don't materialise a tombstone for a doc this device never saw.
      if (known.soft_deleted) return;

      // A personal document is this user's here, whatever local id the device that made it uses.
      if (isPersonalScope(scope_id) && context.user) known.owner_id = context.user.id;

      const result = await collection.createRaw(known);
      if (!result.ok) console.warn(`[MergeEngine] Could not store ${remote.collection}:${remote.id}:`, result.error);
      return;
    }

    // Collections without field times keep whole-document last-writer-wins.
    if (!("field_times" in fields)) {
      if (shouldApplyRemote(local, known)) {
        const result = await collection.updateRaw(known.id, known);
        if (!result.ok) console.warn(`[MergeEngine] Could not update ${remote.collection}:${remote.id}:`, result.error);
      }
      return;
    }

    const { merged, field_times, local_won, remote_won } = mergeFields(local, known);
    if (!local_won && !remote_won && known.version <= local.version) return;

    // A merge that kept local changes is a new version every copy has to get, so it is pushed again.
    const result = await collection.updateRaw(local.id, {
      ...merged,
      field_times,
      version: Math.max(local.version, known.version) + (local_won ? 1 : 0),
      updated_at: known.updated_at > local.updated_at ? known.updated_at : local.updated_at,
      device_id: local_won ? local.device_id : known.device_id,
    } as any);
    if (!result.ok) {
      console.warn(`[MergeEngine] Could not merge ${remote.collection}:${remote.id}:`, result.error);
      return;
    }
    if (local_won) {
      await SyncQueue.enqueue({
        table_name: remote.collection,
        entity_id: local.id,
        scope_id,
        op: merged.soft_deleted ? "delete" : "upsert",
      });
    }
  }
}

const mergeEngine = new MergeEngine();
export default mergeEngine;

function shouldApplyRemote(
  local: Record<string, any> & DB.MetaDataShared,
  remote: Record<string, any> & DB.MetaDataShared,
) {
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;

  if (remote.updated_at > local.updated_at) return true;
  if (remote.updated_at < local.updated_at) return false;

  return remote.device_id > local.device_id;
}
