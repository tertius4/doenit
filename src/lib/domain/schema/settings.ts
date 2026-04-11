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

    created_at: { type: "string" },
    updated_at: { type: "string" },

    user_id: { type: "string" },
    theme: { type: "string" },
    notifications_enabled: { type: "boolean" },
    language: { type: "string" },

    automatic_backup: { type: "boolean" },
    past_task_reminder_enabled: { type: "boolean" },
    past_task_reminder_time: { type: "string" },
    present_task_reminder_enabled: { type: "boolean" },
    present_task_reminder_time: { type: "string" },

    text_size: { type: "string" },
  },
};
