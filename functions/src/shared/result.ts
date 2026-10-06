import type { Response } from "firebase-functions/v2/https";

export type Result<T = undefined> = { ok: true; value?: T } | { ok: false; error: string; status_code?: number };

/** Sends a Result as `{ ok, value }` / `{ ok, error }` with its status code (errors default to 500). */
export function sendResult<T>(res: Response, result: Result<T>, success_status = 200): void {
  const status = result.ok ? success_status : (result.status_code ?? 500);
  const body = result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
  res.status(status).json(body);
}
