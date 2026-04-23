import type { RxJsonSchema } from "rxdb";

export const member: RxJsonSchema<DB.Member> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 1,
  title: "member",
  description: "Join table linking groups and contacts",
  properties: {
    id: { type: "string", maxLength: 50 },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },

    version: { type: "number" },
    device_id: {
      type: "string",
      description: " The device_id is for conflict resolution. device_id > device_id; Final tie-breaker",
    },

    owner_id: { type: "string" },
    scope_id: { type: ["string", "null"] },

    user_id: { type: "string" }, // Can only add contacts who are "accepted" contacts -> thus have a user_id.

    role: { type: "string", enum: ["admin", "member"] },
  },
};
