import auth from "$services/social-login";
import { apiLogger } from "$lib";
import DB from "$domain/db";
import { config } from "$lib/config";
import { initApp } from "$logic/context.svelte";
import { signInWithCredential, signOutFirebase, GoogleAuthProvider } from "$lib/logic/chunk/firebase-auth";
import { doc, setDoc } from "$lib/logic/chunk/firebase-firestore";
import firestore from "$services/firestore";
import { PushService } from "$logic/notifications/PushService";

export const signIn = apiLogger(signInHandler);
export const signOut = apiLogger(signOutHandler);

async function signInHandler(): AsyncResult {
  // Google reports a missing connection as a confusing "[16] Account reauth failed", so check first.
  if (!navigator.onLine) return { ok: false, error: "sign_in_error_offline" };

  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  if (!init_result.ok) return init_result;

  const result = await auth.signInWithGoogle();
  if (!result.ok) return result;

  // Sign into Firebase Auth with the Google id_token
  if (!result.value.id_token) return { ok: false, error: "sign_in_error_no_idtoken" };

  let firebase_uid: string;
  try {
    const credential = GoogleAuthProvider.credential(result.value.id_token);
    const firebase_result = await signInWithCredential(firestore.getAuth(), credential);
    firebase_uid = firebase_result.user.uid;
  } catch (e) {
    const is_network_error = (e as { code?: string })?.code === "auth/network-request-failed";
    return { ok: false, error: is_network_error ? "sign_in_error_offline" : e instanceof Error ? e.message : JSON.stringify(e) };
  }

  const local_result = await saveSignedInUser(result.value, firebase_uid);
  if (!local_result.ok) {
    // Don't leave Firebase signed in while the local session is not.
    await signOutFirebase(firestore.getAuth()).catch((e) => console.warn("[auth] Firebase rollback failed:", e));
    return local_result;
  }

  // Publish user profile so other users can look up this firebase_uid by email
  try {
    await setDoc(
      doc(firestore.getDb(), "user_profiles", firebase_uid),
      { email_address: result.value.email, name: result.value.name },
      { merge: true },
    );
  } catch (e) {
    console.warn("[auth] Failed to publish user profile:", e);
  }

  await initApp(local_result.value);

  // Ask for the OS permission right after sign-in; push is best-effort and never blocks it.
  PushService.register({ prompt: true });

  return { ok: true };
}

/** Creates or refreshes the local user and points the session at it. Returns the user id. */
async function saveSignedInUser(profile: AL.GoogleUserProfile, firebase_uid: string): AsyncResult<string> {
  const user_result = await DB.user.findOne({ selector: { google_id: profile.id } });
  if (!user_result.ok) return user_result;

  const details = {
    name: profile.name,
    email_address: profile.email,
    avatar: profile.avatar,
    firebase_uid,
  };

  let user = user_result.value;
  if (!user) {
    const create_result = await DB.user.create({ google_id: profile.id, ...details });
    if (!create_result.ok) return create_result;
    user = create_result.value;
  } else if (
    user.name !== details.name ||
    user.email_address !== details.email_address ||
    user.avatar !== details.avatar ||
    user.firebase_uid !== details.firebase_uid
  ) {
    const update_result = await DB.user.update(user.id, details);
    if (!update_result.ok) return update_result;
  }

  const session_result = await DB.session.update({ user_id: user.id });
  if (!session_result.ok) return session_result;

  return { ok: true, value: user.id };
}

async function signOutHandler(): AsyncResult {
  // Google/plugin failures must not block clearing the Firebase and local session.
  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  const result = init_result.ok ? await auth.signOut() : init_result;
  if (!result.ok) console.warn("[auth] Google sign-out failed:", result.error);

  // While still signed in: the token must be removed so the next user of this device never gets these pushes.
  // Bounded: an offline device must not keep the user waiting on sign-out.
  await Promise.race([PushService.unregister(), new Promise((resolve) => setTimeout(resolve, 3000))]);

  try {
    await signOutFirebase(firestore.getAuth());
  } catch (e) {
    console.warn("[auth] Firebase sign-out failed:", e);
  }

  const session_result = await DB.session.update({ user_id: null });
  if (!session_result.ok) return session_result;

  await initApp(null);

  return { ok: true };
}
