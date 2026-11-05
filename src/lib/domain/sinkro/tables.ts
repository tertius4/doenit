import { defineTable, t, type ChannelContext } from "@tertius4/sinkro-db";

/** Channel of documents made before sign-in. It is never in the channel list, so they stay on this device. */
export const LOCAL_CHANNEL = "local";

export function personalChannel(firebase_uid: string): string {
  return `personal_${firebase_uid}`;
}

export function isPersonalScope(scope_id: string): boolean {
  return scope_id.startsWith("personal_");
}

/** A group's documents live in its scope; the rest are personal. ctx.userId is the firebase uid. */
function channelOf(doc: { scope_id?: string | null }, ctx: ChannelContext): string {
  if (doc.scope_id) return doc.scope_id;
  return ctx.userId ? personalChannel(ctx.userId) : LOCAL_CHANNEL;
}

/**
 * Most fields are optional: the old schemas required little, and an update validates the whole document, so a missing
 * field must not make an old document unchangeable.
 */
const syncedFields = () => ({
  scope_id: t.string().nullable().optional(),
  app_version: t.number().optional(),
  source_device: t.string().optional(),
});

const task = defineTable({
  name: "task",
  sync: "synced",
  version: 2,
  fields: {
    ...syncedFields(),
    name: t.string(),
    archived: t.boolean(),
    description: t.string().optional(),
    completed: t.number().optional(),
    completed_at: t.string().nullable().optional(),
    due_date: t.string().nullable().optional(),
    start_date: t.string().nullable().optional(),
    repeat_interval: t.string().optional(),
    repeat_interval_number: t.number().optional(),
    repeat_specific_days: t.array(t.number()).optional(),
    important: t.boolean().optional(),
    category_id: t.string().nullable().optional(),
    // Queries compare it with null, so it must never be missing.
    assigned_firebase_uid: t.string().nullable().optional().default(null),
    photo_ids: t
      .array(t.string())
      .merge("set")
      .optional()
      .default(() => []),
  },
  channel: channelOf,
});

const category = defineTable({
  name: "category",
  sync: "synced",
  version: 1,
  fields: {
    ...syncedFields(),
    name: t.string().optional(),
  },
  channel: channelOf,
});

const group = defineTable({
  name: "group",
  sync: "synced",
  version: 1,
  fields: {
    ...syncedFields(),
    name: t.string().optional(),
    description: t.string().optional(),
    /** The firebase_uid of the owner. */
    owner_id: t.string().optional(),
  },
  channel: channelOf,
});

const member = defineTable({
  name: "member",
  sync: "synced",
  version: 0,
  fields: {
    ...syncedFields(),
    firebase_uid: t.string().merge("immutable").optional(),
    role: t.string().optional(),
  },
  channel: channelOf,
});

const contact = defineTable({
  name: "contact",
  sync: "local",
  version: 1,
  fields: {
    owner_id: t.string().optional(),
    user_id: t.string(),
    firebase_uid: t.string(),
    relationship_id: t.string(),
    name: t.string().nullable().optional(),
    avatar_url: t.string().nullable().optional(),
    email_address: t.string().nullable().optional(),
  },
  indexes: ["relationship_id", "firebase_uid", "user_id"],
});

const contact_invite = defineTable({
  name: "contact_invite",
  sync: "local",
  version: 2,
  fields: {
    relationship_id: t.string(),
    from_firebase_uid: t.string(),
    from_email: t.string().optional(),
    to_firebase_uid: t.string(),
    to_email: t.string().optional(),
    status: t.string(),
    responded_at: t.string().nullable().optional(),
    contact_name: t.string().nullable().optional(),
  },
  indexes: ["relationship_id", "status"],
});

const notification = defineTable({
  name: "notification",
  sync: "local",
  version: 1,
  fields: {
    user_id: t.string(),
    type: t.string(),
    title: t.string(),
    body: t.string(),
    // Queries compare it with null, so it must never be missing.
    read_at: t.string().nullable().default(null),
    data: t.json<Record<string, unknown>>(),
  },
  indexes: ["user_id"],
});

const session = defineTable({
  name: "session",
  sync: "local",
  version: 0,
  fields: {
    user_id: t.string().nullable().optional(),
  },
});

const app_state = defineTable({
  name: "app_state",
  sync: "local",
  version: 2,
  fields: {
    source_device: t.string(),
    /** Whose data is on this device: another account signing in clears what can be fetched again. */
    last_firebase_uid: t.string().optional(),
    last_opened_at: t.string().optional(),
    open_count: t.number(),
    app_version: t.string().optional(),
    migration_1_complete: t.boolean().optional(),
    home_mode: t.string().optional(),
  },
});

const user_state = defineTable({
  name: "user_state",
  sync: "local",
  version: 2,
  fields: {
    user_id: t.string(),
    active_scopes: t.array(t.string()).optional(),
    sync_cursors: t.json<Record<string, string>>().optional(),
    last_opened_at: t.string().optional(),
    open_count: t.number(),
    last_rate_prompt_at: t.string().optional(),
    last_backed_up: t.string().optional(),
    rate_prompt_count: t.number(),
    has_rated: t.boolean(),
    fcm_token: t.string().optional(),
    fcm_token_updated_at: t.string().optional(),
    home_mode: t.string().optional(),
  },
});

const settings = defineTable({
  name: "settings",
  sync: "local",
  version: 1,
  fields: {
    owner_id: t.string().optional(),
    user_id: t.string().optional(),
    theme: t.string().optional(),
    notifications_enabled: t.boolean().optional(),
    push_notifications_enabled: t.boolean().optional(),
    language: t.string().nullable().optional(),
    automatic_backup: t.boolean().optional(),
    past_task_reminder_enabled: t.boolean().optional(),
    past_task_reminder_time: t.string().nullable().optional(),
    present_task_reminder_enabled: t.boolean().optional(),
    present_task_reminder_time: t.string().nullable().optional(),
    text_size: t.string().optional(),
  },
});

const user = defineTable({
  name: "user",
  sync: "local",
  version: 0,
  fields: {
    name: t.string().optional(),
    avatar: t.string().optional(),
    email_address: t.string().optional(),
    google_id: t.string().optional(),
    firebase_uid: t.string().optional(),
    app_version: t.number().optional(),
    source_device: t.string().optional(),
    owner_id: t.string().optional(),
  },
});

/** What is left of the old sync queue: durable orders to add or remove someone's scope, so offline work runs later. */
const membership_queue = defineTable({
  name: "membership_queue",
  sync: "local",
  version: 0,
  fields: {
    entity_id: t.string(),
    scope_id: t.string(),
    op: t.string(),
  },
  indexes: ["entity_id"],
});

export const tables = {
  task,
  category,
  group,
  member,
  contact,
  contact_invite,
  notification,
  session,
  app_state,
  user_state,
  settings,
  user,
  membership_queue,
};
