import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/** No 0, O, 1 or I, so a code read out loud or off a screen can't be mistyped. Keep in step with firestore.rules. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

/** Where invite links point: the web app, which hands the code to Doenit (see captureInviteLinks). */
export const INVITE_URL = "https://doenit.org/";

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Turns what someone typed or scanned ("k7q-4mx", "K7Q 4MX") into a stored code, or null when it can't be one. */
export function normalizeCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** "K7Q4MX" → "K7Q-4MX", easier to read and say. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function inviteLink(code: string): string {
  return `${INVITE_URL}?nooi=${code}`;
}

/** Reads a code from an invite link: https://…/?nooi=CODE or doenit://nooi/CODE. */
export function codeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const value = parsed.searchParams.get("nooi") ?? (parsed.host === "nooi" ? parsed.pathname.slice(1) : null);
    return value ? normalizeCode(value) : null;
  } catch {
    return null;
  }
}

/** A code from a link or typed in, waiting for the user to say whether to connect (ModalConnectByCode). */
export const pendingInvite = $state<{ code: string | null }>({ code: null });

/**
 * Picks up invite links: on the web from the page's own address, in the app from the link that opened it.
 * Returns a function that stops listening.
 */
export function captureInviteLinks(): () => void {
  if (!Capacitor.isNativePlatform()) {
    const code = codeFromUrl(location.href);
    if (code) {
      pendingInvite.code = code;
      // Don't ask again on a reload.
      const url = new URL(location.href);
      url.searchParams.delete("nooi");
      history.replaceState(history.state, "", url);
    }
    return () => {};
  }

  App.getLaunchUrl()
    .then((launch) => {
      const code = launch?.url ? codeFromUrl(launch.url) : null;
      if (code) pendingInvite.code = code;
    })
    .catch((error) => console.warn("[invite-code] could not read the launch url:", error));

  const listener = App.addListener("appUrlOpen", ({ url }) => {
    const code = codeFromUrl(url);
    if (code) pendingInvite.code = code;
  });
  return () => {
    listener.then((l) => l.remove());
  };
}
