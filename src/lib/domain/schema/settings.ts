import type { RxJsonSchema } from "rxdb";

export const settings: RxJsonSchema<DB.Settings> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "settings",
  description: "All the settings of a specific user",
  properties: {
    id: { type: "string", maxLength: 50 },
    archived: { type: "boolean" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    soft_deleted: { type: "boolean" },
    dirty: { type: "boolean" },
    version: { type: "number" },

    user_id: { type: "string" },
    theme: { type: "string" },
    notifications_enabled: { type: "boolean" },
    language: { type: "string" },
    reminder_time: { type: "string" },
    reminders_enabled: { type: "boolean" },
    text_size: { type: "string" },
  },
};
