import * as functions from "firebase-functions";
import type { Request, Response } from "firebase-functions/v2/https";
import { createHash, randomUUID } from "crypto";
import { getDb } from "../shared/firebase";
import { type Result, sendResult } from "../shared/result";

/** Pending API tasks per user. The app drains the inbox, so this only fills up while no device is online. */
const INBOX_LIMIT = 100;
/** last_used_at is only rewritten once a day to save Firestore writes. */
const LAST_USED_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;
const TASK_FIELDS = ["name", "description", "due_date", "start_date", "important", "category", "group_id"];

type InboxTask = {
  id: string;
  name: string;
  description: string;
  due_date: string | null;
  start_date: string | null;
  important: boolean;
  category: string | null;
  group_id: string | null;
  key_id: string;
  created_at: string;
};

/**
 * Public API: POST /v1/tasks with `Authorization: Bearer dk_<uid>_<secret>`.
 * The task is written to users/{uid}/inbox_tasks; the app turns it into a real task when it is open and online
 * (personal tasks only live on the device). Keys are created by the app itself and stored as
 * users/{uid}/api_keys/{sha256(secret)}, so a lookup is a single document read. See docs/API.md.
 */
export async function handleApi(req: Request, res: Response): Promise<void> {
  const result = await handleApiRequest(req.method, req.path, req.headers.authorization, req.body);
  sendResult(res, result, 201);
}

async function handleApiRequest(
  method: string,
  path: string,
  authorization: string | undefined,
  body: unknown,
): Promise<Result<{ id: string }>> {
  try {
    if (path.replace(/\/+$/, "") !== "/v1/tasks") return { ok: false, error: "Not found", status_code: 404 };
    if (method !== "POST") return { ok: false, error: "Method not allowed, use POST", status_code: 405 };

    const db = getDb();
    const key_result = await verifyApiKey(db, authorization);
    if (!key_result.ok) return key_result;
    const { uid, key_id } = key_result.value!;

    const task_result = parseTask(body);
    if (!task_result.ok) return task_result;
    const task = task_result.value!;

    const inbox = db.collection("users").doc(uid).collection("inbox_tasks");
    const [membership_snap, count_snap] = await Promise.all([
      task.group_id ? db.collection("users").doc(uid).collection("meta").doc("memberships").get() : null,
      inbox.count().get(),
    ]);

    if (task.group_id) {
      const scopes = (membership_snap?.get("scopes") as string[] | undefined) ?? [];
      if (!scopes.includes(task.group_id)) return { ok: false, error: "Unknown group", status_code: 400 };
    }

    if (count_snap.data().count >= INBOX_LIMIT) {
      return {
        ok: false,
        error: `Inbox full: ${INBOX_LIMIT} tasks are waiting. Open Doenit to add them, then try again.`,
        status_code: 429,
      };
    }

    const id = randomUUID();
    const inbox_task: InboxTask = { ...task, id, key_id, created_at: new Date().toISOString() };
    await inbox.doc(id).set(inbox_task);

    return { ok: true, value: { id } };
  } catch (error) {
    functions.logger.error("API request failed:", error);
    return { ok: false, error: "Internal server error", status_code: 500 };
  }
}

/** Resolves `Bearer dk_<uid>_<secret>` to its owner with a single document read. */
async function verifyApiKey(
  db: FirebaseFirestore.Firestore,
  authorization: string | undefined,
): Promise<Result<{ uid: string; key_id: string }>> {
  const unauthorized = { ok: false, error: "Invalid or missing API key", status_code: 401 } as const;

  const match = authorization?.match(/^Bearer dk_([A-Za-z0-9]{1,128})_([A-Za-z0-9_-]{20,128})$/);
  if (!match) return unauthorized;

  const [, uid, secret] = match;
  const key_id = createHash("sha256").update(secret).digest("hex");
  const key_ref = db.collection("users").doc(uid).collection("api_keys").doc(key_id);
  const key_snap = await key_ref.get();
  if (!key_snap.exists) return unauthorized;

  const last_used = Date.parse(key_snap.get("last_used_at") ?? "") || 0;
  if (Date.now() - last_used > LAST_USED_INTERVAL_MS) {
    // Awaited: work left running after the response may be cut off. Only happens once a day per key.
    await key_ref.update({ last_used_at: new Date().toISOString() }).catch((error) => {
      functions.logger.warn("Could not update last_used_at:", error);
    });
  }

  return { ok: true, value: { uid, key_id } };
}

function parseTask(body: unknown): Result<Omit<InboxTask, "id" | "key_id" | "created_at">> {
  const bad = (error: string) => ({ ok: false, error, status_code: 400 }) as const;

  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Body must be a JSON object");
  const input = body as Record<string, unknown>;

  const unknown_fields = Object.keys(input).filter((key) => !TASK_FIELDS.includes(key));
  if (unknown_fields.length) return bad(`Unknown field(s): ${unknown_fields.join(", ")}`);

  const optionalString = (key: string, max: number): Result<string | null> => {
    const value = input[key];
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "string") return bad(`${key} must be a string`);

    const trimmed = value.trim();
    if (trimmed.length > max) return bad(`${key} must be at most ${max} characters`);
    return { ok: true, value: trimmed || null };
  };

  const name = optionalString("name", 500);
  if (!name.ok) return name;
  if (!name.value) return bad("name is required");

  const description = optionalString("description", 5000);
  if (!description.ok) return description;

  const due_date = optionalString("due_date", 16);
  if (!due_date.ok) return due_date;
  if (due_date.value && !DATE_PATTERN.test(due_date.value)) return bad("due_date must be YYYY-MM-DD or YYYY-MM-DD HH:mm");

  const start_date = optionalString("start_date", 16);
  if (!start_date.ok) return start_date;
  if (start_date.value && !DATE_PATTERN.test(start_date.value)) {
    return bad("start_date must be YYYY-MM-DD or YYYY-MM-DD HH:mm");
  }
  if (start_date.value && due_date.value && start_date.value > due_date.value) {
    return bad("start_date must be on or before due_date");
  }

  if (input.important !== undefined && typeof input.important !== "boolean") return bad("important must be a boolean");

  const category = optionalString("category", 100);
  if (!category.ok) return category;

  const group_id = optionalString("group_id", 50);
  if (!group_id.ok) return group_id;

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value ?? "",
      due_date: due_date.value ?? null,
      start_date: start_date.value ?? null,
      important: input.important === true,
      category: category.value ?? null,
      group_id: group_id.value ?? null,
    },
  };
}
