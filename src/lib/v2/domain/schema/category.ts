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
    archived: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },

    name: { type: "string" },
    owner_user_id: {
      type: "string",
      description:
        "If there are multiple users on the same device. This field indicates which user this category belongs to.",
    },
  },
};
