import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { Request, Response } from "firebase-functions/v2/https";
import { app, getDb, verifyToken } from "../shared/firebase";
import { type Result, sendResult } from "../shared/result";

/**
 * Deletes the caller's account: leaves every group (member row tombstoned, assigned tasks unassigned), then removes
 * user_profiles/{uid}, everything under users/{uid} and the Auth user. Personal tasks only live on the device.
 */
export async function handleDeleteAccount(req: Request, res: Response): Promise<void> {
  const result = await deleteAccount(req.method, req.headers.authorization);
  sendResult(res, result);
}

async function deleteAccount(method: string, authorization: string | undefined): Promise<Result> {
  try {
    if (method !== "POST") return { ok: false, error: "Method not allowed, use POST", status_code: 405 };
    if (!authorization?.startsWith("Bearer ")) return { ok: false, error: "Unauthorized", status_code: 401 };

    const token_result = await verifyToken(authorization.slice("Bearer ".length));
    if (!token_result.success) return { ok: false, error: token_result.error_message, status_code: 401 };

    const uid = token_result.data.uid;
    const db = getDb();
    const user_ref = db.doc(`users/${uid}`);

    const memberships = await user_ref.collection("meta").doc("memberships").get();
    const scopes: string[] = memberships.data()?.scopes ?? [];

    const now = new Date().toISOString();
    const batch = db.batch();

    await Promise.all(
      scopes.map(async (scope_id) => {
        const items = db.collection(`scopes/${scope_id}/items`);
        const [members, tasks] = await Promise.all([
          items.where("collection", "==", "member").where("firebase_uid", "==", uid).get(),
          items.where("collection", "==", "task").where("assigned_firebase_uid", "==", uid).get(),
        ]);

        // A new updated_at is what makes the other members' pull pick these up.
        members.docs.forEach((d) => batch.set(d.ref, { soft_deleted: true, updated_at: now }, { merge: true }));
        tasks.docs.forEach((d) => batch.set(d.ref, { assigned_firebase_uid: null, updated_at: now }, { merge: true }));
      }),
    );

    batch.delete(db.doc(`user_profiles/${uid}`));
    await batch.commit();

    // Last: the memberships read above lives under users/{uid}.
    await db.recursiveDelete(user_ref);
    await admin.auth(app).deleteUser(uid);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    functions.logger.error("Account deletion failed:", message);
    return { ok: false, error: message };
  }
}
