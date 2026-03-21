import type { RxJsonSchema } from "rxdb";

export const user: RxJsonSchema<DB.User> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "user",
  description: "All the users logged in on this device",
  properties: {
    id: { type: "string", maxLength: 50 },
    archived: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },

    name: { type: "string" },
    avatar: { type: "string" },
    email_address: { type: "string" },
    google_id: { type: "string" },
  },
};
