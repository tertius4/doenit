import DB from "$domain/db";

class MergeEngine {
  async apply(remote: Record<string, any> & DB.MetaDataShared) {
    // TODO: getCollection, moet getSyncCollection wees.
    const collection = DB.getCollection(remote.collection);
    if (!collection) throw new Error(`Collection ${remote.collection} not found`);
    const doc_result = await collection.findById(remote.id);
    if (!doc_result.ok) throw new Error(`Document ${remote.id} not found in collection ${remote.collection}`);
    const local = doc_result.value;

    // The schema rejects unknown fields, so keep only the ones this app version knows (this also drops `collection`).
    // A field written by an older or newer app version must not make the whole document disappear.
    const fields = collection.collection.schema.jsonSchema.properties;
    const known = Object.fromEntries(Object.entries(remote).filter(([key]) => key in fields)) as typeof remote;

    if (!local) {
      // Nothing to delete locally, so don't materialise a tombstone for a doc this device never saw.
      if (known.soft_deleted) return;

      const result = await collection.createRaw(known);
      if (!result.ok) console.warn(`[MergeEngine] Could not store ${remote.collection}:${remote.id}:`, result.error);
      return;
    }

    if (shouldApplyRemote(local as Record<string, any> & DB.MetaDataShared, known)) {
      const result = await collection.updateRaw(known.id, known);
      if (!result.ok) console.warn(`[MergeEngine] Could not update ${remote.collection}:${remote.id}:`, result.error);
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
