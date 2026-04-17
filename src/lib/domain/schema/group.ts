import type { RxJsonSchema } from "rxdb";

export const group: RxJsonSchema<DB.Group> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "group",
  description: "All the groups in the system",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },
    owner_user_id: { type: "string" },

    name: { type: "string" },
    description: { type: "string" },
  },
};
