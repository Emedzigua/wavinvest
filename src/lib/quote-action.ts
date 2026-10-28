"use server";

import { after } from "next/server";
import { hasLocale } from "@/i18n/config";
import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";
import { productLabel } from "@/lib/admin/labels";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendPush } from "@/lib/push";

export type QuoteResult = "success" | "error" | "missing-config" | "captcha";

const PRODUCTS = ["epal", "collars", "mixed"] as const;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

// Saves the request (which also creates or links a customer in the admin)
// and emails a notification when Resend is configured.
export async function submitQuote(form: FormData): Promise<QuoteResult> {
  const secret = process.env.QUOTE_FORM_SECRET;
  if (!supabaseConfigured || !secret) return "missing-config";
  // Spam trap: real people never tick the hidden checkbox
  if (form.get("botcheck")) return "success";
  if (!(await verifyTurnstile(form))) return "captcha";

  const product = text(form, "product_key") as (typeof PRODUCTS)[number];
  const language = text(form, "language");
  const quote = {
    p_secret: secret,
    p_name: text(form, "name"),
    p_company: text(form, "company"),
    p_email: text(form, "email"),
    p_phone: text(form, "phone"),
    p_product: PRODUCTS.includes(product) ? product : "epal",
    p_quantity: Number.parseInt(text(form, "quantity"), 10) || 0,
    p_location: text(form, "delivery_location"),
    p_message: text(form, "message"),
    p_language: hasLocale(language) ? language : "en",
  };

  const { data: id, error } = await createPublicClient().rpc("submit_quote", quote);
  if (error) {
    console.error("submit_quote failed", error.message);
    return "error";
  }

  const details: Record<string, string | number> = { ...quote };
  delete details.p_secret;
  after(() => Promise.all([notify(id as string, details), notifyPhones(id as string, details, secret)]));
  return "success";
}

async function notify(id: string, q: Record<string, string | number>) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lines = [
    `Firma: ${q.p_company}`,
    `Meno: ${q.p_name}`,
    `E-mail: ${q.p_email}`,
    `Telefón: ${q.p_phone || "—"}`,
    `Produkt: ${productLabel[q.p_product as keyof typeof productLabel]}`,
    `Množstvo: ${q.p_quantity} ks`,
    `Dodanie: ${q.p_location}`,
    `Jazyk: ${String(q.p_language).toUpperCase()}`,
    "",
    String(q.p_message || ""),
    "",
    `Otvoriť v administrácii: ${site}/admin/quotes/${id}`,
  ];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "WAV Invest <web@wavinvest.eu>",
      to: process.env.QUOTE_NOTIFY_EMAIL ?? "info@wavinvest.eu",
      reply_to: q.p_email,
      subject: `Nový dopyt: ${q.p_company} – ${q.p_quantity} ks`,
      text: lines.join("\n"),
    }),
  });
  if (!res.ok) console.error("Quote email failed", res.status, await res.text());
}

// Push notification to every admin phone that turned notifications on
async function notifyPhones(id: string, q: Record<string, string | number>, secret: string) {
  const client = createPublicClient();
  const { data } = await client.rpc("push_targets", { p_secret: secret });
  if (!data?.config || !data.subscriptions?.length) return;
  const { gone } = await sendPush(data.config, data.subscriptions, {
    title: `Nový dopyt: ${q.p_company}`,
    body: `${q.p_quantity} ks · ${productLabel[q.p_product as keyof typeof productLabel]} · ${q.p_location}`,
    url: `/admin/quotes/${id}`,
  });
  for (const endpoint of gone) await client.rpc("drop_push_subscription", { p_secret: secret, p_endpoint: endpoint });
}
