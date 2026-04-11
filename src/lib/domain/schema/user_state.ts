import type { RxJsonSchema } from "rxdb";

export const user_state: RxJsonSchema<DB.UserState> = {
  title: "user_state",
  version: 0,
  primaryKey: "user_id",
  type: "object",
  properties: {
    user_id: {
      type: "string",
      maxLength: 100,
    },
    last_opened_at: {
      type: "string",
      format: "date-time",
    },
    open_count: {
      type: "number",
      minimum: 0,
    },
    last_rate_prompt_at: {
      type: "string",
      format: "date-time",
    },
    last_backed_up: {
      type: "string",
      format: "date-time",
    },
    rate_prompt_count: {
      type: "number",
      minimum: 0,
    },
    has_rated: {
      type: "boolean",
    },
    updated_at: {
      type: "string",
      format: "date-time",
    },
  },
  required: ["user_id", "open_count", "rate_prompt_count", "has_rated", "updated_at"],
};
