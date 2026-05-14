import type { RxJsonSchema } from "rxdb";

export const contact: RxJsonSchema<DB.Contact> = {
  primaryKey: "id",
  required: ["id", "user_id", "firebase_uid", "relationship_id"],
  type: "object",
  version: 0,
  title: "contact",
  description: "Derived state from accepted invites. Local convenience cache only.",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    owner_id: { type: "string" },
    user_id: { type: "string" },
    firebase_uid: { type: "string" },
    relationship_id: { type: "string" },
    name: { type: ["string", "null"] },
    avatar_url: { type: ["string", "null"] },
    email_address: { type: ["string", "null"] },
  },
};
