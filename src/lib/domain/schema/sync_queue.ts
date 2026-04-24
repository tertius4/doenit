import type { RxJsonSchema } from "rxdb";

export const sync_queue: RxJsonSchema<DB.SyncQueueItem> = {
  title: "sync_queue",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 50 },

    created_at: { type: "string" },
    updated_at: { type: "string" },

    owner_id: { type: "string" },

    collection: { type: "string" },
    entity_id: { type: "string" },
    scope_id: { type: "string" },

    op: { type: "string", enum: ["upsert", "delete"] },

    attempts: { type: "number", minimum: 0 },
    last_attempt_at: { type: "number" },
  },
  required: ["id", "created_at", "updated_at", "owner_id", "collection", "entity_id", "scope_id", "op", "attempts"],
  indexes: ["collection", "entity_id"],
};
