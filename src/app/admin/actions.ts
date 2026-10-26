"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { addressQuery, geocode, refreshGeo } from "@/lib/admin/geo";
import { addDays, invoiceTotals } from "@/lib/admin/invoice";
import type { Billing, Depot, DiscountTier, InvoiceItem, InvoiceStatus, Party, QuoteStatus } from "@/lib/admin/types";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || null;
const number = (form: FormData, key: string) => Number(text(form, key).replace(",", "."));

/* ───────────── Session ───────────── */

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  if (!(await verifyTurnstile(form))) return "Potvrďte, že nie ste robot, a skúste znova.";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(form, "email"),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "Nesprávny e-mail alebo heslo.";
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function changePassword(_: string | null, form: FormData): Promise<string | null> {
  const { supabase, user } = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 10) return "Nové heslo musí mať aspoň 10 znakov.";
  if (next !== form.get("confirm")) return "Nové heslá sa nezhodujú.";

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) return "Aktuálne heslo nie je správne.";
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return `Heslo sa nepodarilo zmeniť: ${error.message}`;
  return "ok";
}

/* ───────────── Customers ───────────── */

export async function saveCustomer(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const id = optional(form, "id");
  const fields = {
    company_name: text(form, "company_name"),
    street: optional(form, "street"),
    city: optional(form, "city"),
    postal_code: optional(form, "postal_code"),
    country: optional(form, "country"),
    status: text(form, "status") || "inactive",
    depot: text(form, "depot") || "rzeszow",
    ico: optional(form, "ico"),
    dic: optional(form, "dic"),
    ic_dph: optional(form, "ic_dph")?.toUpperCase().replace(/\s/g, "") ?? null,
    notes: optional(form, "notes"),
  };
  if (!fields.company_name) return "Vyplňte názov firmy.";

  let customerId = id;
  if (id) {
    const { data: prev } = await supabase.from("customers").select("status").eq("id", id).single();
    const { error } = await supabase.from("customers").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    if (prev?.status === "active" && fields.status !== "active") await endRunningContracts(supabase, id);
  } else {
    const { data, error } = await supabase.from("customers").insert(fields).select("id").single();
    if (error) throw error;
    customerId = data.id;
    const contactName = text(form, "contact_name");
    if (contactName) {
      await supabase.from("contacts").insert({
        customer_id: data.id,
        name: contactName,
        role: optional(form, "contact_role"),
        phone: optional(form, "contact_phone"),
        email: optional(form, "contact_email")?.toLowerCase(),
      });
    }
  }

  // Map position and distances from the warehouses
  const { data: row } = await supabase.from("customers").select("id, lat, lng, distances, geo_query").eq("id", customerId).single();
  if (row) await refreshGeo(supabase, "customers", row, addressQuery(fields), (await getSettings(supabase)).depots);

  if (id) refresh();
  else redirect(`/admin/customers/${customerId}`);
}

// A customer who stops buying keeps their history: running contracts end today
async function endRunningContracts(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], customerId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("contracts")
    .update({ end_date: today })
    .eq("customer_id", customerId)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gt.${today}`);
  // Contracts that had not started yet are simply removed
  await supabase.from("contracts").delete().eq("customer_id", customerId).gt("start_date", today);
}

export async function setCustomerStatus(id: string, status: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("customers").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (status !== "active") await endRunningContracts(supabase, id);
  refresh();
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  redirect("/admin/customers");
}

/* ───────────── Contacts ───────────── */

export async function saveContact(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = optional(form, "id");
  const row = {
    customer_id: text(form, "customer_id"),
    name: text(form, "name"),
    role: optional(form, "role"),
    phone: optional(form, "phone"),
    email: optional(form, "email")?.toLowerCase() ?? null,
  };
  if (!row.name) throw new Error("Chýba meno");
  const { error } = id
    ? await supabase.from("contacts").update(row).eq("id", id)
    : await supabase.from("contacts").insert(row);
  if (error) throw error;
  refresh();
}

export async function deleteContact(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("contacts").delete().eq("id", id);
  refresh();
}

/* ───────────── Contracts ───────────── */

export async function saveContract(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = optional(form, "id");
  const schedule = text(form, "schedule");
  const row = {
    customer_id: text(form, "customer_id"),
    product: text(form, "product"),
    monthly_qty: Math.round(number(form, "monthly_qty")),
    unit_price: number(form, "unit_price"),
    start_date: text(form, "start_date"),
    end_date: optional(form, "end_date"),
    schedule,
    weekdays: schedule === "monthly" ? [] : form.getAll("weekdays").map(Number).sort(),
    month_day: schedule === "monthly" ? Math.round(number(form, "month_day")) || 1 : null,
    notes: optional(form, "notes"),
  };
  if (!(row.monthly_qty > 0) || !(row.unit_price >= 0)) throw new Error("Neplatné množstvo alebo cena");

  if (id) {
    const { data: prev } = await supabase.from("contracts").select("*").eq("id", id).single();
    const effective = text(form, "effective_from");
    const termsChanged =
      prev &&
      (prev.product !== row.product || prev.monthly_qty !== row.monthly_qty || Number(prev.unit_price) !== row.unit_price);

    // Changing quantity or price from a later date keeps the revenue history:
    // the old terms end the day before and a new contract starts that day.
    if (prev && termsChanged && effective && effective > prev.start_date) {
      const dayBefore = new Date(`${effective}T00:00:00Z`);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      await supabase.from("contracts").update({ end_date: dayBefore.toISOString().slice(0, 10) }).eq("id", id);
      const { error } = await supabase.from("contracts").insert({ ...row, start_date: effective });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("contracts").update(row).eq("id", id);
      if (error) throw error;
    }
  } else {
    const { error } = await supabase.from("contracts").insert(row);
    if (error) throw error;
    // A customer with a running contract is active
    await supabase.from("customers").update({ status: "active" }).eq("id", row.customer_id).neq("status", "active");
  }

  // A contract made from a request closes that request
  const quoteId = optional(form, "quote_id");
  if (quoteId) {
    await supabase.from("quotes").update({ status: "archived" }).eq("id", quoteId);
    redirect(`/admin/customers/${row.customer_id}`);
  }
  refresh();
}

export async function deleteContract(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("contracts").delete().eq("id", id);
  refresh();
}

/* ───────────── Quotes ───────────── */

export async function setQuoteStatus(id: string, status: QuoteStatus) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("quotes")
    .update({ status, ...(status === "replied" ? { replied_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  refresh();
}

// Called when the reply email is opened, so "new" requests move on by themselves
export async function markReplied(id: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("quotes")
    .update({ status: "replied", replied_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["new", "opened"]);
  refresh();
}

export async function deleteQuote(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("quotes").delete().eq("id", id);
  redirect("/admin/quotes");
}

/* ───────────── Settings ───────────── */

export async function saveSettings(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const mins = form.getAll("tier_min").map((v) => Number(String(v).replace(",", ".")));
  const pcts = form.getAll("tier_pct").map((v) => Number(String(v).replace(",", ".")));
  const tiers: DiscountTier[] = mins
    .map((min_qty, i) => ({ min_qty: Math.round(min_qty), percent: pcts[i] }))
    .filter((t) => t.min_qty > 0 && t.percent > 0 && t.percent < 100)
    .sort((a, b) => a.min_qty - b.min_qty);

  const current = await getSettings(supabase);
  const names = form.getAll("depot_name").map((v) => String(v).trim());
  const addresses = form.getAll("depot_address").map((v) => String(v).trim());
  const ids = form.getAll("depot_id").map((v) => String(v));
  const depots: Depot[] = [];
  for (const [i, name] of names.entries()) {
    if (!name) continue;
    const address = addresses[i] || name;
    const prev = current.depots.find((d) => d.id === ids[i]);
    const point = prev && prev.address === address ? prev : await geocode(address);
    if (!point) return `Adresu skladu „${name}“ sa nepodarilo nájsť na mape. Skúste presnejšiu adresu.`;
    const id =
      prev?.id ??
      (name.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-|-$/g, "") || `sklad-${i + 1}`);
    depots.push({ id, name, address, lat: point.lat, lng: point.lng });
  }
  if (depots.length === 0) return "Zadajte aspoň jeden sklad.";

  const { error } = await supabase
    .from("settings")
    .update({
      depots,
      transport_per_km: number(form, "transport_per_km") || 0,
      price_epal: number(form, "price_epal") || 0,
      price_collars: number(form, "price_collars") || 0,
      vat_rate: number(form, "vat_rate") || 0,
      currency: text(form, "currency") || "EUR",
      discount_tiers: tiers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;

  // Warehouses moved or were added: distances are recalculated on the next visit
  const key = (list: Depot[]) => JSON.stringify(list.map((d) => [d.id, d.lat, d.lng]));
  if (key(depots) !== key(current.depots)) {
    await supabase.from("customers").update({ distances: null }).not("distances", "is", null);
    await supabase.from("quotes").update({ distances: null }).not("distances", "is", null);
  }
  refresh();
}

/* ───────────── Billing details ───────────── */

export async function saveBilling(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const billing: Billing = {
    name: text(form, "name"),
    street: text(form, "street"),
    postal_code: text(form, "postal_code"),
    city: text(form, "city"),
    country: text(form, "country"),
    ico: text(form, "ico"),
    dic: text(form, "dic"),
    ic_dph: text(form, "ic_dph").toUpperCase().replace(/\s/g, ""),
    register: text(form, "register"),
    iban: text(form, "iban").toUpperCase().replace(/\s/g, ""),
    swift: text(form, "swift").toUpperCase(),
    bank: text(form, "bank"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    due_days: Math.max(0, Math.round(number(form, "due_days"))) || 14,
    note: text(form, "note"),
  };
  if (!billing.name) return "Vyplňte obchodné meno.";
  const { error } = await supabase.from("settings").update({ billing }).eq("id", 1);
  if (error) throw error;
  refresh();
}

/* ───────────── Invoices ───────────── */

export async function saveInvoice(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const settings = await getSettings(supabase);
  const id = optional(form, "id");

  const items: InvoiceItem[] = form
    .getAll("item_description")
    .map((d, i) => ({
      description: String(d).trim(),
      qty: Number(String(form.getAll("item_qty")[i]).replace(",", ".")),
      unit: String(form.getAll("item_unit")[i] || "ks").trim(),
      unit_price: Number(String(form.getAll("item_price")[i]).replace(",", ".")),
    }))
    .filter((i) => i.description && i.qty > 0 && Number.isFinite(i.unit_price));
  if (items.length === 0) return "Pridajte aspoň jednu položku.";

  const buyer: Party = {
    name: text(form, "buyer_name"),
    street: text(form, "buyer_street"),
    postal_code: text(form, "buyer_postal_code"),
    city: text(form, "buyer_city"),
    country: text(form, "buyer_country"),
    ico: text(form, "buyer_ico"),
    dic: text(form, "buyer_dic"),
    ic_dph: text(form, "buyer_ic_dph").toUpperCase().replace(/\s/g, ""),
  };
  if (!buyer.name) return "Vyplňte odberateľa.";

  const euSupply = form.get("eu_supply") === "on";
  if (euSupply && !buyer.ic_dph) return "Pri dodaní do EÚ bez DPH vyplňte IČ DPH odberateľa.";
  const vatRate = number(form, "vat_rate");
  const issue = text(form, "issue_date");
  const row = {
    customer_id: optional(form, "customer_id"),
    buyer,
    items,
    issue_date: issue,
    delivery_date: text(form, "delivery_date") || issue,
    due_date: text(form, "due_date") || addDays(issue, settings.billing.due_days),
    currency: settings.currency,
    vat_rate: vatRate,
    eu_supply: euSupply,
    note: optional(form, "note"),
    ...invoiceTotals(items, vatRate, euSupply),
  };

  if (id) {
    const { error } = await supabase.from("invoices").update(row).eq("id", id);
    if (error) throw error;
    redirect(`/admin/invoices/${id}`);
  }

  // Numbering 2026xxxx; retry if two invoices are created at the same moment
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: number } = await supabase.rpc("next_invoice_number", { p_year: Number(issue.slice(0, 4)) });
    const { data, error } = await supabase
      .from("invoices")
      .insert({ ...row, number, seller: settings.billing })
      .select("id")
      .single();
    if (!error) redirect(`/admin/invoices/${data.id}`);
    if (error.code !== "23505") throw error;
  }
  return "Faktúru sa nepodarilo uložiť, skúste znova.";
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("invoices")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  refresh();
}
