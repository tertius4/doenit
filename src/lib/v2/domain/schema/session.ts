import type { RxJsonSchema } from "rxdb";

export const session: RxJsonSchema<DB.Session> = {
  primaryKey: "id",
  required: [],
  type: "object",
  version: 0,
  title: "session",
  description: "The current session of the app",
  properties: {
    id: { type: "string", maxLength: 50 },
    user_id: { type: ["string", "null"] },
  },
};
