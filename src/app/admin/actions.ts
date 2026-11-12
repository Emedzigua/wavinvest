"use server";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendPush } from "@/lib/push";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { addressQuery, geocode, refreshGeo } from "@/lib/admin/geo";
import { addDays, invoiceTotals } from "@/lib/admin/invoice";
import { OUTCOMES, countryLabel, type Outcome } from "@/lib/admin/prospects";
import { MENU_KEYS, type MenuKey } from "@/lib/admin/menu";
import { PRODUCT_LANGS, type ProductText } from "@/lib/site-products-shared";

import type { Billing, Depot, DiscountTier, InvoiceItem, InvoiceStatus, Party, QuoteStatus } from "@/lib/admin/types";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || null;
const number = (form: FormData, key: string) => Number(text(form, key).replace(",", "."));

/* ───────────── Session ───────────── */

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  if (!(await verifyTurnstile(form))) return "Potvrďte, že nie ste robot, a skúste znova.";
  const supabase = await createClient();
  // Callers sign in with a short name; their account email is made from it
  const login = text(form, "email").toLowerCase();
  const email = login.includes("@") ? login : `${login}@callers.wavinvest.eu`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return "Nesprávne meno, e-mail alebo heslo.";
  const { data: caller } = await supabase.from("callers").select("user_id").eq("user_id", data.user.id).maybeSingle();
  redirect(caller ? "/admin/call" : "/admin");
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

// Settings are saved per section, so a mistake in one can't touch the others
export async function savePrices(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("settings")
    .update({
      price_epal: number(form, "price_epal") || 0,
      price_collars: number(form, "price_collars") || 0,
      vat_rate: number(form, "vat_rate") || 0,
      currency: text(form, "currency") || "EUR",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
  refresh();
}

export async function saveTiers(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const mins = form.getAll("tier_min").map((v) => Number(String(v).replace(",", ".")));
  const pcts = form.getAll("tier_pct").map((v) => Number(String(v).replace(",", ".")));
  const tiers: DiscountTier[] = mins
    .map((min_qty, i) => ({ min_qty: Math.round(min_qty), percent: pcts[i] }))
    .filter((t) => t.min_qty > 0 && t.percent > 0 && t.percent < 100)
    .sort((a, b) => a.min_qty - b.min_qty);
  const { error } = await supabase.from("settings").update({ discount_tiers: tiers }).eq("id", 1);
  if (error) throw error;
  refresh();
}

export async function saveDepots(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
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
    .update({ depots, transport_per_km: number(form, "transport_per_km") || 0 })
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

/* ───────────── Phone notifications ───────────── */

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, device: string) {
  const { supabase, user } = await requireAdmin();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, keys: sub.keys, user_id: user.id, device: device.slice(0, 120) });
  if (error) throw error;
  refresh();
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  refresh();
}

export async function sendTestPush(): Promise<string> {
  const { supabase } = await requireAdmin();
  const [{ data: config }, { data: subs }] = await Promise.all([
    supabase.rpc("push_config_admin"),
    supabase.from("push_subscriptions").select("endpoint, keys"),
  ]);
  if (!config || !subs?.length) return "Žiadne zariadenie nemá zapnuté upozornenia.";
  const { gone, failed } = await sendPush(config, subs, { title: "WAV Invest", body: "Upozornenia fungujú ✓", url: "/admin" });
  if (gone.length) await supabase.from("push_subscriptions").delete().in("endpoint", gone);
  const ok = subs.length - gone.length - failed.length;
  if (failed.length) return `Odoslané: ${ok}, chyba: ${failed.join("; ")}`;
  return `Testovacie upozornenie odoslané (${ok} ${ok === 1 ? "zariadenie" : "zariadenia"}).`;
}

/* ───────────── Email history ───────────── */

export type EmailDraft = {
  to: string;
  subject: string;
  body: string;
  customer_id?: string | null;
  quote_id?: string | null;
  invoice_id?: string | null;
};

// Records an email opened in the mail app, so it shows in Pošta and on the customer
export async function logEmail(draft: EmailDraft) {
  const { supabase } = await requireAdmin();
  let customer = draft.customer_id ?? null;
  if (!customer && draft.to) {
    const { data } = await supabase.from("contacts").select("customer_id").ilike("email", draft.to.trim()).limit(1).maybeSingle();
    customer = data?.customer_id ?? null;
  }
  await supabase.from("emails").insert({
    to_email: draft.to.trim().toLowerCase(),
    subject: draft.subject.slice(0, 300),
    body: draft.body.slice(0, 20000),
    customer_id: customer,
    quote_id: draft.quote_id ?? null,
    invoice_id: draft.invoice_id ?? null,
  });
}

/* ───────────── Prospects ───────────── */

// Records a call (or visit/note) and moves the prospect to the matching status
export async function logProspectActivity(form: FormData): Promise<string | void> {
  const { supabase, user } = await requireAdmin();
  const id = text(form, "prospect_id");
  const kind = (text(form, "kind") || "call") as "call" | "visit" | "email" | "note";
  const outcome = optional(form, "outcome") as Outcome | null;
  const note = optional(form, "note");
  let nextAction = optional(form, "next_action");
  if (!outcome && !note) return "Vyberte výsledok alebo napíšte poznámku.";

  const result = outcome ? OUTCOMES[outcome] : null;
  if (result?.days && !nextAction) nextAction = addDays(new Date().toISOString().slice(0, 10), result.days);
  if ((outcome === "call_back" || outcome === "meeting") && !nextAction) return "Zadajte dátum.";

  const { error: logError } = await supabase
    .from("prospect_activities")
    .insert({ prospect_id: id, kind, outcome, note, user_id: user.id });
  if (logError) throw logError;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (result) patch.status = result.status;
  if (result) patch.next_action = result.status === "not_interested" || result.status === "unreachable" ? null : nextAction;
  const { error } = await supabase.from("prospects").update(patch).eq("id", id);
  if (error) throw error;
  refresh();
}

export async function saveProspect(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("prospects")
    .update({
      phone: optional(form, "phone"),
      website: optional(form, "website"),
      email: optional(form, "email")?.toLowerCase() ?? null,
      street: optional(form, "street"),
      city: optional(form, "city"),
      postal_code: optional(form, "postal_code"),
      contact_name: optional(form, "contact_name"),
      contact_role: optional(form, "contact_role"),
      contact_phone: optional(form, "contact_phone"),
      contact_email: optional(form, "contact_email")?.toLowerCase() ?? null,
      notes: optional(form, "notes"),
      next_action: optional(form, "next_action"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", text(form, "id"));
  if (error) throw error;
  refresh();
}

export async function setProspectStatus(id: string, status: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("prospects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

// A won prospect becomes a real customer, with its contact person
export async function convertProspect(id: string) {
  const { supabase } = await requireAdmin();
  const { data: p, error } = await supabase.from("prospects").select("*").eq("id", id).single();
  if (error) throw error;
  if (p.customer_id) redirect(`/admin/customers/${p.customer_id}`);
  const country = countryLabel[p.country as string];
  const { data: c, error: e2 } = await supabase
    .from("customers")
    .insert({
      company_name: p.name,
      street: p.street,
      city: p.city,
      postal_code: p.postal_code,
      country,
      lat: p.lat,
      lng: p.lng,
      status: "active",
      depot: p.nearest_depot ?? "rzeszow",
      notes: p.notes,
    })
    .select("id")
    .single();
  if (e2) throw e2;
  if (p.contact_name || p.contact_phone || p.contact_email) {
    await supabase.from("contacts").insert({
      customer_id: c.id,
      name: p.contact_name ?? p.name,
      role: p.contact_role,
      phone: p.contact_phone ?? p.phone,
      email: p.contact_email ?? p.email,
    });
  }
  await supabase.from("prospects").update({ status: "customer", customer_id: c.id, next_action: null }).eq("id", id);
  redirect(`/admin/customers/${c.id}`);
}

/* ───────────── Menu ───────────── */

export async function saveMenu(keys: string[]) {
  const { supabase } = await requireAdmin();
  const menu = MENU_KEYS.filter((k: MenuKey) => keys.includes(k));
  const { error } = await supabase.rpc("set_admin_menu", { p_menu: menu });
  if (error) throw error;
  refresh();
}

/* ───────────── Website products ───────────── */
const SITE_PRODUCTS_TAG = "site-products";

// The product list is cached and the home page prerendered: expire both so visitors see the change now
function productsChanged() {
  updateTag(SITE_PRODUCTS_TAG);
  revalidatePath("/[lang]", "page");
}

// "Názov: hodnota" per line → [["Názov", "hodnota"], …]
function parseSpecs(raw: string): [string, string][] {
  return raw
    .split("\n")
    .map((line) => {
      const at = line.indexOf(":");
      return at < 0 ? ["", ""] : [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    })
    .filter(([k, v]) => k && v)
    .slice(0, 12)
    .map(([k, v]) => [k.slice(0, 80), v.slice(0, 160)]);
}

// Path inside the product-images bucket, for photos uploaded here (not the starter Pexels ones)
const storedImagePath = (url: string | null) => url?.split("/storage/v1/object/public/product-images/")[1] ?? null;

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "produkt";

export async function saveSiteProduct(_: string | null, form: FormData): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const id = text(form, "id");
  const content: Record<string, ProductText> = {};
  for (const l of PRODUCT_LANGS) {
    const t: ProductText = {
      name: text(form, `${l}_name`).slice(0, 120) || undefined,
      tagline: text(form, `${l}_tagline`).slice(0, 200) || undefined,
      description: text(form, `${l}_description`).slice(0, 1500) || undefined,
      image_alt: text(form, `${l}_image_alt`).slice(0, 200) || undefined,
      specs: parseSpecs(text(form, `${l}_specs`)),
    };
    if (t.name || t.tagline || t.description || t.specs?.length) content[l] = t;
  }
  if (!content.sk?.name) return "Zadajte aspoň slovenský názov produktu.";

  // A new photo, already shrunk in the browser
  let image = text(form, "image") || null;
  const file = form.get("image_file");
  if (file instanceof File && file.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Fotka musí byť JPG, PNG alebo WebP.";
    if (file.size > 3_500_000) return "Fotka je príliš veľká. Skúste menšiu.";
    const path = `${slugify(content.sk.name)}-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) return "Fotku sa nepodarilo nahrať. Skúste to znova.";
    const old = storedImagePath(image);
    image = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    if (old) await supabase.storage.from("product-images").remove([old]); // the replaced photo
  }

  const row = {
    content,
    image,
    active: form.get("active") === "on",
    quote_key: (["epal", "collars", "mixed"].includes(text(form, "quote_key")) ? text(form, "quote_key") : "mixed") as "epal" | "collars" | "mixed",
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await supabase.from("site_products").update(row).eq("id", id);
    if (error) throw error;
  } else {
    // New products go to the end of the list, with a web-address name made from the Slovak name
    const { data: last } = await supabase.from("site_products").select("sort").order("sort", { ascending: false }).limit(1);
    let slug = slugify(content.sk.name);
    const { data: taken } = await supabase.from("site_products").select("slug").like("slug", `${slug}%`);
    if (taken?.some((t) => t.slug === slug)) slug = `${slug.slice(0, 34)}-${Date.now().toString(36).slice(-5)}`;
    const { error } = await supabase.from("site_products").insert({ ...row, slug, sort: (last?.[0]?.sort ?? 0) + 10 });
    if (error) throw error;
  }
  productsChanged();
  redirect("/admin/products");
}

export async function setSiteProductActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("site_products").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  productsChanged();
  refresh();
}

// Swaps a product with its neighbour in the list
export async function moveSiteProduct(id: string, direction: -1 | 1) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_products").select("id, sort").order("sort").order("created_at");
  const rows = data ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((rid, n) => supabase.from("site_products").update({ sort: n * 10 }).eq("id", rid)));
  productsChanged();
  refresh();
}

export async function deleteSiteProduct(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_products").select("image").eq("id", id).maybeSingle();
  const { error } = await supabase.from("site_products").delete().eq("id", id);
  if (error) throw error;
  const photo = storedImagePath(data?.image ?? null);
  if (photo) await supabase.storage.from("product-images").remove([photo]);
  productsChanged();
  redirect("/admin/products");
}

/* ───────────── Callers ───────────── */

const CALLER_COUNTRIES = ["PL", "SK", "CZ", "HU", "AT", "DE", "LT", "LV"];
const CALLER_LANGS = ["sk", "cs", "pl", "de", "hu", "en"];

const callerError = (message: string) =>
  message.includes("login taken")
    ? "Toto prihlasovacie meno už existuje. Zvoľte iné."
    : message.includes("password too short")
      ? "Heslo musí mať aspoň 8 znakov."
      : "Uloženie sa nepodarilo. Skúste to znova.";

export async function createCaller(_: string | null, form: FormData): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const login = text(form, "login").toLowerCase();
  const name = text(form, "name").slice(0, 80);
  const password = String(form.get("password") ?? "");
  const countries = form.getAll("countries").map(String).filter((c) => CALLER_COUNTRIES.includes(c));
  const language = CALLER_LANGS.includes(text(form, "language")) ? text(form, "language") : "sk";
  if (!name) return "Zadajte meno volajúceho.";
  if (!/^[a-z0-9._-]{2,32}$/.test(login)) return "Prihlasovacie meno: 2–32 malých písmen bez diakritiky, číslic, bodiek alebo pomlčiek.";
  if (password.length < 8) return "Heslo musí mať aspoň 8 znakov.";
  if (countries.length === 0) return "Vyberte aspoň jednu krajinu.";
  const { error } = await supabase.rpc("create_caller", {
    p_login: login,
    p_name: name,
    p_password: password,
    p_countries: countries,
    p_language: language,
  });
  if (error) return callerError(error.message);
  redirect("/admin/callers");
}

export async function updateCaller(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const id = text(form, "id");
  const countries = form.getAll("countries").map(String).filter((c) => CALLER_COUNTRIES.includes(c));
  if (countries.length === 0) return "Vyberte aspoň jednu krajinu.";
  const { error } = await supabase
    .from("callers")
    .update({
      name: text(form, "name").slice(0, 80) || undefined,
      countries,
      language: CALLER_LANGS.includes(text(form, "language")) ? text(form, "language") : "sk",
    })
    .eq("user_id", id);
  if (error) throw error;
  refresh();
}

export async function setCallerPassword(form: FormData): Promise<string | void> {
  const { supabase } = await requireAdmin();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return "Heslo musí mať aspoň 8 znakov.";
  const { error } = await supabase.rpc("set_caller_password", { p_user: text(form, "id"), p_password: password });
  if (error) return callerError(error.message);
}

export async function setCallerActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_caller_active", { p_user: id, p_active: active });
  if (error) throw error;
  refresh();
}
