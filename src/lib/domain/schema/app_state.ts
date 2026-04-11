import type { RxJsonSchema } from "rxdb";

export const app_state: RxJsonSchema<DB.AppState> = {
  title: "app_state",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 50,
    },
    device_id: {
      type: "string",
    },
    last_opened_at: {
      type: "string",
      format: "date-time",
    },
    open_count: {
      type: "number",
      minimum: 0,
    },
    app_version: {
      type: "string",
    },
    updated_at: {
      type: "string",
      format: "date-time",
    },
  },
  required: ["id", "device_id", "open_count", "updated_at"],
};
