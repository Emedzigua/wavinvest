"use server";

import { refresh } from "next/cache";
import { requireCaller } from "@/lib/admin/auth";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

// Saves what happened on the call; the page then loads the next company
export async function logCall(_: string | null, form: FormData): Promise<string | null> {
  const { supabase } = await requireCaller();
  const outcome = text(form, "outcome");
  if (!outcome) return "outcome";
  const next = text(form, "next_action") || null;
  if ((outcome === "call_back" || outcome === "meeting") && !next) return "date";
  const pallets = Number.parseInt(text(form, "pallets"), 10);
  const { error } = await supabase.rpc("caller_log", {
    p_id: text(form, "id"),
    p_outcome: outcome,
    p_next: next,
    p_contact_name: text(form, "contact_name"),
    p_contact_role: text(form, "contact_role"),
    p_contact_phone: text(form, "contact_phone"),
    p_contact_email: text(form, "contact_email"),
    p_pallets: Number.isFinite(pallets) && pallets > 0 ? Math.min(pallets, 1_000_000) : null,
    p_supplier: text(form, "supplier"),
    p_email_consent: form.get("email_consent") === "on",
    p_note: text(form, "note"),
    p_time: outcome === "meeting" && /^\d{2}:\d{2}$/.test(text(form, "meeting_time")) ? text(form, "meeting_time") : null,
  });
  if (error) {
    console.error("caller_log failed", error.message);
    return "failed";
  }
  refresh();
  return null;
}

export async function skipCompany(id: string) {
  const { supabase } = await requireCaller();
  const { error } = await supabase.rpc("caller_skip", { p_id: id });
  if (error) throw error;
  refresh();
}
