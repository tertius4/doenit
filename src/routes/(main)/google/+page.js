import { alert } from "$lib/core/alert";
import { user } from "$lib/core/user.svelte.js";
import { redirect } from "@sveltejs/kit";

export async function load({ url }) {
  const return_to = url.searchParams.get("return_to");
  url.searchParams.delete("return_to");
  const new_url = new URL(url.href.replace("#", "?"));
  const access_token = new_url.searchParams.get("access_token");
  const id_token = new_url.searchParams.get("id_token");
  const expires_in = new_url.searchParams.get("expires_in");

  // Decode id_token to get user info (JWT payload)
  const payload = JSON.parse(atob(id_token.split(".")[1]));

  const info = {
    access_token,
    id_token,
    expires_in,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    },
  };

  alert.success("Info", JSON.stringify(info, null, 2));
  console.log("Google auth info:", info);
  redirect(303, return_to);
}
