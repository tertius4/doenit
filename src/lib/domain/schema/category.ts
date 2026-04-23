import type { RxJsonSchema } from "rxdb";

export const category: RxJsonSchema<DB.Category> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "category",
  description: "All the categories in the system",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    version: { type: "number" },

    name: { type: "string" },

    owner_id: { type: "string" },
    device_id: { type: "string", description: " The device_id is for conflict resolution. device_id > device_id; Final tie-breaker" },
    scope_id: { type: ["string", "null"] },
  },
};
