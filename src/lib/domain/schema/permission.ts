import type { RxJsonSchema } from "rxdb";

export const permissions: RxJsonSchema<DB.Permissions> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "permissions",
  description: "All the permissions of a specific user",
  properties: {
    id: { type: "string", maxLength: 50 },
    archived: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },

    user_id: { type: "string" },
    share_tasks: { type: "boolean" },
    backup_data: { type: "boolean" },
  },
};
