import { apiLogger } from "$lib";
import firestore from "$services/firestore";
import { context } from "$logic/context.svelte";
import * as env from "$env/static/public";
import t from "$display/translate";

export const list = apiLogger(listHandler);
export const create = apiLogger(createHandler);
export const revoke = apiLogger(revokeHandler);

export const MAX_KEYS = 10;
export const API_URL = `https://africa-south1-${env.PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/api/v1/tasks`;
export const DOCS_URL = "https://github.com/tertius4/doenit/blob/master/docs/API.md";

async function listHandler(): AsyncResult<AL.ApiKey[]> {
  const uid = context.user?.firebase_uid;
  if (!uid) return { ok: false, error: t("you_are_not_logged_in") };

  return { ok: true, value: await firestore.fetchApiKeys(uid) };
}

/**
 * Creates a key `dk_<uid>_<secret>`. Only the sha256 of the secret is stored, so the returned key is the
 * only time it can be shown. The uid in the key lets the API find it with a single document read.
 */
async function createHandler(label: string): AsyncResult<{ key: string; api_key: AL.ApiKey }> {
  const uid = context.user?.firebase_uid;
  if (!uid) return { ok: false, error: t("you_are_not_logged_in") };

  const trimmed = label.trim().slice(0, 50);
  if (!trimmed) return { ok: false, error: t("api_key_label_required") };

  const existing = await firestore.fetchApiKeys(uid);
  if (existing.length >= MAX_KEYS) return { ok: false, error: t("api_key_limit_reached") };

  const secret = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const key = `dk_${uid}_${secret}`;
  const hash = await sha256Hex(secret);
  const data = { label: trimmed, prefix: `dk_…${secret.slice(-4)}`, created_at: new Date().toISOString() };

  await firestore.createApiKey(uid, hash, data);
  return { ok: true, value: { key, api_key: { id: hash, ...data } } };
}

async function revokeHandler(key_id: string): AsyncResult {
  const uid = context.user?.firebase_uid;
  if (!uid) return { ok: false, error: t("you_are_not_logged_in") };

  await firestore.deleteApiKey(uid, key_id);
  return { ok: true };
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
