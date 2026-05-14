import DB from "$domain/db";

class MergeEngine {
  async apply(remote: Record<string, any> & DB.MetaDataShared) {
    // TODO: getCollection, moet getSyncCollection wees.
    const collection = DB.getCollection(remote.collection);
    if (!collection) throw new Error(`Collection ${remote.collection} not found`);
    const doc_result = await collection.findById(remote.id);
    if (!doc_result.ok) throw new Error(`Document ${remote.id} not found in collection ${remote.collection}`);
    const local = doc_result.value;

    
    delete remote.collection; // Only used for fetching, not stored in DB
    console.log("remote", remote);

    if (!local) {
      const result = await collection.createRaw(remote);
      console.log("Created new local document from remote:", result);
      return;
    }

    if (shouldApplyRemote(local as Record<string, any> & DB.MetaDataShared, remote)) {
      const result = await collection.updateRaw(remote.id, remote);
      console.log("Updated local document from remote:", result);
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
