import type { RxJsonSchema } from "rxdb";

export const group_contact: RxJsonSchema<DB.GroupContact> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "group_contact",
  description: "Join table linking groups and contacts",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },
    owner_user_id: { type: "string" },

    group_id: { type: "string" },
    contact_id: { type: "string" },
    role: { type: "string", enum: ["admin", "member"] },
  },
};
