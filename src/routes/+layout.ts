import DB from "$domain/db";
import { alert } from "$lib/core/alert";
import { initApp } from "$logic/context.svelte";

export const ssr = false;

export async function load({ url, params }) {
  try {
    await DB.init();
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return alert.error("Databasis fout", message);
  }

  try {
    await initApp();
  } catch (error) {
    console.error("Failed to initialize app", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return alert.error("Initialisatie fout", message);
  }
}
