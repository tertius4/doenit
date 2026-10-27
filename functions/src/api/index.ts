import * as functions from "firebase-functions";
import type { Request, Response } from "firebase-functions/v2/https";
import { createHash } from "crypto";
import { getDb } from "../shared/firebase";
import { type Result, sendResult } from "../shared/result";
import { type Access } from "./store";
import { createTask } from "./create-task";
import { listTasks } from "./list-tasks";
import { updateTask } from "./update-task";
import { deleteTask } from "./delete-task";

/** last_used_at is only rewritten once a day to save Firestore writes. */
const LAST_USED_INTERVAL_MS = 24 * 60 * 60 * 1000;
const TASK_PATH = /^\/v1\/tasks(?:\/([A-Za-z0-9_-]{1,50}))?$/;

/**
 * Public API with `Authorization: Bearer dk_<uid>_<secret>`. See docs/API.md.
 *   GET    /v1/tasks       list open tasks (?include_completed=true for all)
 *   POST   /v1/tasks       create a task
 *   PATCH  /v1/tasks/{id}  change a task
 *   DELETE /v1/tasks/{id}  delete a task
 * Tasks are read and written in Firestore directly (personal scope or group scope), so it needs Sync to be on.
 * Keys are created by the app and stored as users/{uid}/api_keys/{sha256(secret)}, so a lookup is a single read.
 */
export async function handleApi(req: Request, res: Response): Promise<void> {
  const result = await handleApiRequest(req);
  sendResult(res, result, req.method === "POST" ? 201 : 200);
}

async function handleApiRequest(req: Request): Promise<Result<unknown>> {
  try {
    const match = req.path.replace(/\/+$/, "").match(TASK_PATH);
    if (!match) return { ok: false, error: "Not found", status_code: 404 };

    const id = match[1];
    const allowed = id ? ["PATCH", "DELETE"] : ["GET", "POST"];
    if (!allowed.includes(req.method)) {
      return { ok: false, error: `Method not allowed, use ${allowed.join(" or ")}`, status_code: 405 };
    }

    const key_result = await verifyApiKey(req.headers.authorization);
    if (!key_result.ok) return key_result;

    const access_result = await loadAccess(key_result.value!);
    if (!access_result.ok) return access_result;
    const access = access_result.value!;

    if (req.method === "GET") return await listTasks(access, req.query.include_completed === "true");
    if (req.method === "POST") return await createTask(access, req.body);
    if (req.method === "PATCH") return await updateTask(access, id!, req.body);
    return await deleteTask(access, id!);
  } catch (error) {
    functions.logger.error("API request failed:", error);
    return { ok: false, error: "Internal server error", status_code: 500 };
  }
}

/** Resolves `Bearer dk_<uid>_<secret>` to its owner with a single document read. */
async function verifyApiKey(authorization: string | undefined): Promise<Result<string>> {
  const unauthorized = { ok: false, error: "Invalid or missing API key", status_code: 401 } as const;

  const match = authorization?.match(/^Bearer dk_([A-Za-z0-9]{1,128})_([A-Za-z0-9_-]{20,128})$/);
  if (!match) return unauthorized;

  const [, uid, secret] = match;
  const key_id = createHash("sha256").update(secret).digest("hex");
  const key_ref = getDb().collection("users").doc(uid).collection("api_keys").doc(key_id);
  const key_snap = await key_ref.get();
  if (!key_snap.exists) return unauthorized;

  const last_used = Date.parse(key_snap.get("last_used_at") ?? "") || 0;
  if (Date.now() - last_used > LAST_USED_INTERVAL_MS) {
    // Awaited: work left running after the response may be cut off. Only happens once a day per key.
    await key_ref.update({ last_used_at: new Date().toISOString() }).catch((error) => {
      functions.logger.warn("Could not update last_used_at:", error);
    });
  }

  return { ok: true, value: uid };
}

/** Reads the owner's memberships once: the API needs Sync, since personal tasks only reach the cloud with it on. */
async function loadAccess(uid: string): Promise<Result<Access>> {
  const snap = await getDb().collection("users").doc(uid).collection("meta").doc("memberships").get();
  if (!snap.get("personal_sync_enabled_at")) {
    return { ok: false, error: "Turn on Sync in Doenit to use the API", status_code: 403 };
  }

  const group_scopes = ((snap.get("scopes") as string[] | undefined) ?? []).filter((id) => !id.startsWith("personal_"));
  return { ok: true, value: { uid, personal_scope: `personal_${uid}`, group_scopes } };
}
