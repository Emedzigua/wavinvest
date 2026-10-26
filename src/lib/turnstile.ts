import "server-only";
import { headers } from "next/headers";

// Checks the captcha token on the server. Without TURNSTILE_SECRET_KEY the
// check is skipped (local development), so set it in production.
export async function verifyTurnstile(form: FormData) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") console.warn("TURNSTILE_SECRET_KEY is not set — captcha is off");
    return true;
  }
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token) return false;

  const h = await headers();
  const body = new URLSearchParams({ secret, response: token });
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success: boolean };
    return json.success;
  } catch {
    return false;
  }
}
