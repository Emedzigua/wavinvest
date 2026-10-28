import { createHash } from "node:crypto";
import { createPublicClient } from "@/lib/supabase/server";

const BOTS = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor|curl|wget/i;

// Counts a page view of the public website. No cookies and no IP are
// stored: the visitor id is a hash of IP + browser + today's date + a secret,
// so it can't be reversed and changes every day.
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOTS.test(ua)) return new Response(null, { status: 204 });

  let path = "";
  try {
    path = String(((await request.json()) as { path?: string }).path ?? "").slice(0, 300);
  } catch {}
  if (!path.startsWith("/") || path.startsWith("/admin")) return new Response(null, { status: 204 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.QUOTE_FORM_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "wav";
  const visitor = createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex");
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "";

  await createPublicClient().rpc("track_view", { p_path: path, p_visitor: visitor, p_country: country });
  return new Response(null, { status: 204 });
}
