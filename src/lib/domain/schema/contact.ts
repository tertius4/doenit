import type { RxJsonSchema } from "rxdb";

export const contact: RxJsonSchema<DB.Contact> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "contact",
  description: "All the contacts in the system",
  properties: {
    id: { type: "string", maxLength: 50 },

    created_at: { type: "string" },
    updated_at: { type: "string" },

    owner_id: { type: "string" },

    name: { type: "string" },
    avatar: { type: "string" },
    user_id: { type: ["string", "null"] },
    email_address: { type: "string" },
  },
};
