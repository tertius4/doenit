import auth from "$services/social-login";
import { apiLogger } from "$lib";
import DB from "$domain/db";
import { config } from "$lib/config";

export const signIn = apiLogger(signInHandler);
export const signOut = apiLogger(signOutHandler);

async function signInHandler(): AsyncResult {
  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  if (!init_result.ok) return init_result;

  const result = await auth.signInWithGoogle();
  if (!result.ok) return result;

  const user_result = await DB.user.findOne({ selector: { google_id: result.value.id } });
  if (!user_result.ok) return user_result;

  let user = user_result.value;
  if (!user) {
    const create_result = await DB.user.create({
      google_id: result.value.id,
      name: result.value.name,
      email_address: result.value.email,
      avatar: result.value.avatar,
    });
    if (!create_result.ok) return create_result;
    user = create_result.value;
  } else {
    const update_result = await DB.user.update(user.id, {
      name: result.value.name,
      email_address: result.value.email,
      avatar: result.value.avatar,
    });
    if (!update_result.ok) return update_result;
  }

  const session_result = await DB.session.update({ user_id: user.id });
  if (!session_result.ok) return session_result;

  return { ok: true };
}

async function signOutHandler(): AsyncResult {
  const init_result = await auth.initialize({ web_client_id: config.google_web_client_id });
  if (!init_result.ok) return init_result;

  const result = await auth.signOut();
  if (!result.ok) return result;

  const session_result = await DB.session.update({ user_id: null });
  if (!session_result.ok) return session_result;

  return { ok: true };
}
