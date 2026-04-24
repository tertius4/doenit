import auth from "$services/social-login";
import { apiLogger } from "$lib";
import DB from "$domain/db";
import { config } from "$lib/config";
import { initApp } from "$logic/context.svelte";
import { signInWithCredential, signOutFirebase, GoogleAuthProvider } from "$lib/logic/chunk/firebase-auth";
import { doc, setDoc } from "$lib/logic/chunk/firebase-firestore";
import firestore from "$services/firestore";

export const signIn = apiLogger(signInHandler);
export const signOut = apiLogger(signOutHandler);

async function signInHandler(): AsyncResult {
  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  if (!init_result.ok) return init_result;

  const result = await auth.signInWithGoogle();
  if (!result.ok) return result;

  // Sign into Firebase Auth with the Google id_token
  if (!result.value.id_token) return { ok: false, error: "sign_in_error_no_idtoken" };
  const credential = GoogleAuthProvider.credential(result.value.id_token);
  const firebase_result = await signInWithCredential(firestore.getAuth(), credential);
  const firebase_uid = firebase_result.user.uid;

  const user_result = await DB.user.findOne({ selector: { google_id: result.value.id } });
  if (!user_result.ok) return user_result;

  let user = user_result.value;
  if (!user) {
    const create_result = await DB.user.create({
      google_id: result.value.id,
      name: result.value.name,
      email_address: result.value.email,
      avatar: result.value.avatar,
      firebase_uid,
    });
    if (!create_result.ok) return create_result;
    user = create_result.value;
  } else {
    const update_result = await DB.user.update(user.id, {
      name: result.value.name,
      email_address: result.value.email,
      avatar: result.value.avatar,
      firebase_uid,
    });
    if (!update_result.ok) return update_result;
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

  const session_result = await DB.session.update({ user_id: user.id });
  if (!session_result.ok) return session_result;

  await initApp(user.id);

  return { ok: true };
}

async function signOutHandler(): AsyncResult {
  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  if (!init_result.ok) return init_result;

  const result = await auth.signOut();
  if (!result.ok) return result;

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
