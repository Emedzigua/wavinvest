"use server";

import { after } from "next/server";
import { hasLocale } from "@/i18n/config";
import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";
import { productLabel } from "@/lib/admin/labels";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendPush } from "@/lib/push";
import { adminEnabled } from "@/lib/features";

export type QuoteResult = "success" | "error" | "missing-config" | "captcha";

const PRODUCTS = ["epal", "collars", "mixed"] as const;
type Quote = {
  name: string;
  company: string;
  email: string;
  phone: string;
  product: (typeof PRODUCTS)[number];
  quantity: number;
  location: string;
  message: string;
  language: string;
};
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

// Saves the request and emails it. With the admin on, either one is enough
// (the request can be read in the admin). With the admin off, email is the
// only way anyone sees it, so it must succeed. The database stays a backup
// and may be unavailable: a free project that was idle can be paused.
export async function submitQuote(form: FormData): Promise<QuoteResult> {
  const secret = process.env.QUOTE_FORM_SECRET;
  const dbReady = supabaseConfigured && !!secret;
  const emailReady = !!process.env.RESEND_API_KEY;
  if (adminEnabled ? !dbReady && !emailReady : !emailReady) return "missing-config";
  // Spam trap: real people never tick the hidden checkbox
  if (form.get("botcheck")) return "success";
  if (!(await verifyTurnstile(form))) return "captcha";

  const product = text(form, "product_key") as (typeof PRODUCTS)[number];
  const language = text(form, "language");
  const quote: Quote = {
    name: text(form, "name").slice(0, 200),
    company: text(form, "company").slice(0, 200),
    email: text(form, "email").slice(0, 200),
    phone: text(form, "phone").slice(0, 50),
    product: PRODUCTS.includes(product) ? product : "epal",
    quantity: Number.parseInt(text(form, "quantity"), 10) || 0,
    location: text(form, "delivery_location").slice(0, 300),
    message: text(form, "message").slice(0, 5000),
    language: hasLocale(language) ? language : "en",
  };
  // The database checks this too, but email must not depend on it
  if (!quote.name || !quote.company || !quote.location || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(quote.email) || quote.quantity < 1) {
    return "error";
  }

  let id: string | null = null;
  if (dbReady) {
    const { data, error } = await createPublicClient()
      .rpc("submit_quote", {
        p_secret: secret,
        p_name: quote.name,
        p_company: quote.company,
        p_email: quote.email,
        p_phone: quote.phone,
        p_product: quote.product,
        p_quantity: quote.quantity,
        p_location: quote.location,
        p_message: quote.message,
        p_language: quote.language,
      })
      .abortSignal(AbortSignal.timeout(5000));
    if (error) {
      console.error("submit_quote failed", error.message);
      // Flood limit or invalid input: refuse it, don't pass it on by email
      if (/rate limited|invalid quote/.test(error.message)) return "error";
    } else {
      id = data as string;
    }
  }

  const emailed = emailReady && (await sendEmail(quote, id));
  if (adminEnabled ? !id && !emailed : !emailed) return "error";

  if (adminEnabled && id && secret) {
    const saved = id;
    after(() => notifyPhones(saved, quote, secret));
  }
  return "success";
}

async function sendEmail(q: Quote, id: string | null) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lines = [
    `Firma: ${q.company}`,
    `Meno: ${q.name}`,
    `E-mail: ${q.email}`,
    `Telefón: ${q.phone || "—"}`,
    `Produkt: ${productLabel[q.product]}`,
    `Množstvo: ${q.quantity} ks`,
    `Dodanie: ${q.location}`,
    `Jazyk: ${q.language.toUpperCase()}`,
    "",
    q.message,
    ...(adminEnabled && id ? ["", `Otvoriť v administrácii: ${site}/admin/quotes/${id}`] : []),
  ];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "WAV Invest <web@wavinvest.eu>",
        to: process.env.QUOTE_NOTIFY_EMAIL ?? "info@wavinvest.eu",
        reply_to: q.email,
        subject: `Nový dopyt: ${q.company} – ${q.quantity} ks`,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) console.error("Quote email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Quote email failed", e);
    return false;
  }
}

// Push notification to every admin phone that turned notifications on
async function notifyPhones(id: string, q: Quote, secret: string) {
  const client = createPublicClient();
  const { data } = await client.rpc("push_targets", { p_secret: secret });
  if (!data?.config || !data.subscriptions?.length) return;
  const { gone } = await sendPush(data.config, data.subscriptions, {
    title: `Nový dopyt: ${q.company}`,
    body: `${q.quantity} ks · ${productLabel[q.product]} · ${q.location}`,
    url: `/admin/quotes/${id}`,
  });
  for (const endpoint of gone) await client.rpc("drop_push_subscription", { p_secret: secret, p_endpoint: endpoint });
}
