import { PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import { User } from "$lib/tools/user/src/user.svelte";

const user = new User(PUBLIC_GOOGLE_AUTH);
export { user };
