import { redirect } from "@sveltejs/kit";
import { PUBLIC_DEV_EMAILS } from "$env/static/public";
import { context } from "$logic/context.svelte";

export async function load({ parent }) {
    const { ready } = await parent();
    await ready;

    const email = context.user?.email_address;
    if (!email || !PUBLIC_DEV_EMAILS.includes(email)) {
        throw redirect(307, "/");
    }
}