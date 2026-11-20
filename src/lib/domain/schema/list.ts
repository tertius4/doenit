import type { RxJsonSchema } from "rxdb";

/**
 * A list of tasks. Private while scope_id is null (synced through the personal scope, like a task); shared once it
 * has its own scope, which is then the list's id. The list document of a shared list lives at scopes/{id}/items/{id}.
 */
export const list: RxJsonSchema<DB.List> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "list",
  description: "Lists that hold tasks",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    version: { type: "number" },
    owner_id: { type: "string" },
    device_id: {
      type: "string",
      description: " The device_id is for conflict resolution. device_id > device_id; Final tie-breaker",
    },
    scope_id: { type: ["string", "null"] },
    /** When each field last changed, for merging copies per field (see sync/field-times.ts). */
    field_times: { type: "object" },

    name: { type: "string" },
    description: { type: "string" },
  },
};
