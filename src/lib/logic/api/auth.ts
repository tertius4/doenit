import auth, { type SocialProvider } from "$services/social-login";
import { apiLogger } from "$lib";
import DB from "$domain/db";
import { config } from "$lib/config";
import { initApp } from "$logic/context.svelte";
import {
  signInWithCredential,
  signOutFirebase,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  OAuthProvider,
} from "$lib/logic/chunk/firebase-auth";
import { doc, setDoc } from "$lib/logic/chunk/firebase-firestore";
import firestore from "$services/firestore";
import { PushService } from "$logic/notifications/PushService";

export const signIn = apiLogger(signInHandler);
export const signOut = apiLogger(signOutHandler);

/** Every provider needs the same plugin init, so it is done in one place. */
function initialize(): AsyncResult {
  return auth.initialize({
    web_client_id: config.google_web_client_id,
    ios_client_id: config.google_ios_client_id,
    apple_client_id: config.apple_client_id,
  });
}

async function signInHandler(provider: SocialProvider = "google"): AsyncResult {
  // Google reports a missing connection as a confusing "[16] Account reauth failed", so check first.
  if (!navigator.onLine) return { ok: false, error: "sign_in_error_offline" };

  const init_result = await initialize();
  if (!init_result.ok) return init_result;

  const result = provider === "apple" ? await auth.signInWithApple() : await auth.signInWithGoogle();
  if (!result.ok) return result;

  if (!result.value.id_token) return { ok: false, error: "sign_in_error_no_idtoken" };

  let firebase_uid: string;
  try {
    const credential =
      provider === "apple"
        ? new OAuthProvider("apple.com").credential({
            idToken: result.value.id_token,
            rawNonce: result.value.raw_nonce,
          })
        : GoogleAuthProvider.credential(result.value.id_token);

    const firebase_result = await signInWithCredential(firestore.getAuth(), credential);
    firebase_uid = firebase_result.user.uid;
  } catch (e) {
    return { ok: false, error: await credentialError(e, result.value.email) };
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
      { email_address: local_result.value.email_address, name: local_result.value.name },
      { merge: true },
    );
  } catch (e) {
    console.warn("[auth] Failed to publish user profile:", e);
  }

  await initApp(local_result.value.id);

  // Ask for the OS permission right after sign-in; push is best-effort and never blocks it.
  PushService.register({ prompt: true });

  return { ok: true };
}

/**
 * Turns a Firebase credential failure into something the user can act on. The interesting case
 * is an email already claimed by another provider: without naming that provider the user just
 * sees a dead end.
 */
async function credentialError(e: unknown, email: string | undefined): Promise<string> {
  const code = (e as { code?: string })?.code;
  if (code === "auth/network-request-failed") return "sign_in_error_offline";

  if (code === "auth/account-exists-with-different-credential" && email) {
    const methods = await fetchSignInMethodsForEmail(firestore.getAuth(), email).catch((): string[] => []);
    if (methods.includes("google.com")) return "sign_in_error_use_google";
    if (methods.includes("apple.com")) return "sign_in_error_use_apple";
    return "sign_in_error_other_provider";
  }

  return e instanceof Error ? e.message : JSON.stringify(e);
}

/**
 * Creates or refreshes the local user and points the session at it.
 *
 * Looked up by `firebase_uid` rather than `google_id`: it is the one identity that is stable
 * across providers, so an Apple sign-in resolves to the same local user. Fields Apple withholds
 * on a repeat sign-in (name, email) fall back to what is already stored.
 */
async function saveSignedInUser(
  profile: AL.SocialUserProfile,
  firebase_uid: string,
): AsyncResult<{ id: string; name: string; email_address: string }> {
  const user_result = await DB.user.findOne({ selector: { firebase_uid } });
  if (!user_result.ok) return user_result;

  let user = user_result.value;

  // A row created before firebase_uid was stored is still keyed on google_id; without this
  // fallback the lookup above misses it and a duplicate local user is created.
  if (!user && profile.id) {
    const legacy_result = await DB.user.findOne({ selector: { google_id: profile.id } });
    if (!legacy_result.ok) return legacy_result;
    user = legacy_result.value;
  }
  const details = {
    name: profile.name || user?.name || "",
    email_address: profile.email || user?.email_address || "",
    avatar: profile.avatar || user?.avatar,
    firebase_uid,
  };

  if (!user) {
    // `google_id` is the pre-existing column for the provider subject; Apple reuses it
    // rather than forcing an RxDB schema version bump for a second id field.
    const create_result = await DB.user.create({ google_id: profile.id, ...details });
    if (!create_result.ok) return create_result;
    user = create_result.value;
  } else if (
    user.name !== details.name ||
    user.email_address !== details.email_address ||
    user.avatar !== details.avatar
  ) {
    const update_result = await DB.user.update(user.id, details);
    if (!update_result.ok) return update_result;
  }

  const session_result = await DB.session.update({ user_id: user.id });
  if (!session_result.ok) return session_result;

  return { ok: true, value: { id: user.id, name: details.name, email_address: details.email_address } };
}

async function signOutHandler(): AsyncResult {
  // Google/plugin failures must not block clearing the Firebase and local session.
  const init_result = await initialize();
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
