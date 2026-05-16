import type { RxJsonSchema } from "rxdb";

export const task: RxJsonSchema<DB.Task> = {
  title: "task",
  version: 1,
  description: "describes a task",
  type: "object",
  required: ["id", "name", "archived", "created_at", "updated_at"],
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 50 },
    archived: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    version: { type: "number" },

    name: { type: "string" },
    description: { type: "string" },
    completed: { type: "number" },
    completed_at: { type: ["string", "null"] },
    due_date: { type: ["string", "null"] },
    start_date: { type: ["string", "null"] },
    repeat_interval: { type: "string" },
    repeat_specific_days: { type: "array", items: { type: "number" } },
    repeat_interval_number: { type: "number" },
    important: { type: "boolean" },
    category_id: { type: ["string", "null"] },
    assigned_firebase_uid: { type: ["string", "null"] },
    photo_ids: { type: "array", items: { type: "string" } },
    owner_id: { type: "string" },
    device_id: {
      type: "string",
      description: " The device_id is for conflict resolution. device_id > device_id; Final tie-breaker",
    },
    scope_id: { type: ["string", "null"] },
  },
};
