import * as functions from "firebase-functions";
import type { Request, Response } from "firebase-functions/v2/https";
import { getDb, verifyToken } from "../shared/firebase";
import { type Result, sendResult } from "../shared/result";

const FROM = "Doenit <uitnodiging@pos.doenit.org>";
const APP_URL = "https://tertius4.github.io/doenit";
const RESEND_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_DAY = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invites someone who is not on Doenit yet: records email_invites/{email}/senders/{uid} (so they are offered the
 * connection when they sign in) and e-mails them through Resend. Rate limited per recipient and per sender.
 */
export async function handleSendEmailInvite(req: Request, res: Response, api_key: string): Promise<void> {
  const result = await sendEmailInvite(req, api_key);
  sendResult(res, result);
}

async function sendEmailInvite(req: Request, api_key: string): Promise<Result> {
  try {
    if (req.method !== "POST") return { ok: false, error: "Method not allowed, use POST", status_code: 405 };
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return { ok: false, error: "Unauthorized", status_code: 401 };

    const token_result = await verifyToken(authorization.slice("Bearer ".length));
    if (!token_result.success) return { ok: false, error: token_result.error_message, status_code: 401 };

    const uid = token_result.data.uid;
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const language = req.body?.language === "en" ? "en" : "af";
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "invalid_email", status_code: 400 };

    const db = getDb();
    const profiles = await db.collection("user_profiles").where("email_address", "==", email).limit(1).get();
    if (!profiles.empty) return { ok: false, error: "invite_error_already_on_doenit", status_code: 409 };

    const sender = (await db.doc(`user_profiles/${uid}`).get()).data() ?? {};
    const from_email: string = sender.email_address ?? token_result.data.email ?? "";
    const from_name: string = sender.name || token_result.data.name || from_email;

    const invite_ref = db.doc(`email_invites/${email}/senders/${uid}`);
    const quota_ref = db.doc(`email_invite_quota/${uid}`);
    const today = new Date().toISOString().slice(0, 10);

    // Reserve the send first, so two quick taps cannot both e-mail.
    const should_send = await db.runTransaction(async (tx) => {
      const [invite, quota] = await Promise.all([tx.get(invite_ref), tx.get(quota_ref)]);
      const sent_at = invite.data()?.created_at;
      if (sent_at && Date.now() - Date.parse(sent_at) < RESEND_AGAIN_AFTER_MS) return false;

      const count = quota.data()?.date === today ? (quota.data()?.count ?? 0) : 0;
      if (count >= MAX_PER_DAY) throw new QuotaError();

      tx.set(invite_ref, { from_email, from_name, created_at: new Date().toISOString() });
      tx.set(quota_ref, { date: today, count: count + 1 });
      return true;
    });

    // Already e-mailed recently: the invite is recorded, nothing else to do.
    if (!should_send) return { ok: true };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, reply_to: from_email || undefined, ...message(language, from_name, email) }),
    });

    if (!response.ok) {
      functions.logger.error("Resend failed", response.status, await response.text());
      // Let them try again rather than waiting a week for an e-mail that never went out.
      await invite_ref.delete();
      return { ok: false, error: "invite_error_email_failed", status_code: 502 };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof QuotaError) return { ok: false, error: "invite_error_too_many", status_code: 429 };
    functions.logger.error("sendEmailInvite failed", error);
    return { ok: false, error: "invite_error_email_failed", status_code: 500 };
  }
}

class QuotaError extends Error {}

function message(language: "af" | "en", name: string, email: string): { subject: string; text: string; html: string } {
  const lines =
    language === "en"
      ? {
          subject: `${name} invited you to Doenit`,
          intro: `${name} wants to share tasks with you on Doenit, a simple to-do app.`,
          step: `Download Doenit and sign in with ${email}, and you will be connected straight away.`,
          button: "Get Doenit",
          footer: `You got this e-mail because ${name} invited you. Not interested? Just ignore it.`,
        }
      : {
          subject: `${name} nooi jou na Doenit`,
          intro: `${name} wil take met jou deel op Doenit, 'n eenvoudige taak-program.`,
          step: `Laai Doenit af en teken in met ${email}, dan is julle dadelik gekoppel.`,
          button: "Kry Doenit",
          footer: `Jy kry hierdie e-pos omdat ${name} jou genooi het. Nie belangstel nie? Ignoreer dit net.`,
        };

  const text = `${lines.intro}\n\n${lines.step}\n\n${APP_URL}\n\n${lines.footer}`;
  const html = `<div style="font-family:sans-serif;font-size:16px;line-height:1.5;color:#222;max-width:480px">
<p>${escape(lines.intro)}</p>
<p>${escape(lines.step)}</p>
<p><a href="${APP_URL}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escape(lines.button)}</a></p>
<p style="font-size:13px;color:#777">${escape(lines.footer)}</p>
</div>`;

  return { subject: lines.subject, text, html };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
