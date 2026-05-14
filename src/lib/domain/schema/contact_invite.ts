import type { RxJsonSchema } from "rxdb";

export const contact_invite: RxJsonSchema<DB.ContactInvite> = {
  primaryKey: "id",
  required: ["id", "relationship_id", "from_firebase_uid", "to_firebase_uid", "status"],
  type: "object",
  version: 0,
  title: "contact_invite",
  description: "Local cache of user-level invite documents from Firestore. Not scope-synced.",
  properties: {
    id: { type: "string", maxLength: 100 },
    relationship_id: { type: "string" },
    from_firebase_uid: { type: "string" },
    from_email: { type: "string" },
    to_firebase_uid: { type: "string" },
    to_email: { type: "string" },
    status: { type: "string", enum: ["pending", "accepted", "rejected", "cancelled"] },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    responded_at: { type: ["string", "null"] },
  },
};
