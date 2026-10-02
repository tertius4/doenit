import type { RxJsonSchema } from "rxdb";

export const notification: RxJsonSchema<DB.Notification> = {
  primaryKey: "id",
  required: ["id", "user_id", "type", "title", "body", "data", "created_at", "updated_at"],
  type: "object",
  version: 1,
  title: "notification",
  description: "Local cache of user-level notifications from Firestore. Not scope-synced.",
  properties: {
    id: { type: "string", maxLength: 100 },
    user_id: { type: "string" },
    type: {
      type: "string",
      enum: [
        "invite_received",
        "invite_accepted",
        "group_added",
        "group_removed",
        "group_deleted",
        "user_left_group",
        "task_assigned",
        "task_completed",
        "mentioned",
      ],
    },
    title: { type: "string" },
    body: { type: "string" },
    read_at: { type: ["string", "null"] },
    data: { type: "object", additionalProperties: true },
    created_at: { type: "string" },
    updated_at: { type: "string" },
  },
};
