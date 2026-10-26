import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { address, date, money, num } from "@/lib/admin/format";
import { invoiceStatusLabel, productLabel, scheduleText } from "@/lib/admin/labels";
import { isRunning, monthlyValue } from "@/lib/admin/schedule";
import type { Contact, Contract, Customer, Invoice, Quote } from "@/lib/admin/types";
import { invoiceState } from "@/lib/admin/invoice";
import { deleteContact, deleteContract, deleteCustomer, saveContact, saveCustomer } from "../../../actions";
import CustomerFields from "@/components/admin/CustomerFields";
import DistanceList from "@/components/admin/DistanceList";
import LockedForm from "@/components/admin/LockedForm";
import { addressQuery, refreshGeo } from "@/lib/admin/geo";
import ContractForm from "@/components/admin/ContractForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import MapView from "@/components/admin/MapView";
import { CustomerPill, QuotePill } from "@/components/admin/StatusPill";

export const metadata: Metadata = { title: "Zákazník" };
// Admin pages are personal and always rendered per request
export const instant = false;

type Full = Customer & {
  contacts: Contact[];
  contracts: Contract[];
  quotes: Quote[];
  invoices: Pick<Invoice, "id" | "number" | "issue_date" | "due_date" | "total" | "status" | "currency">[];
};

export default async function CustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const [{ data }, settings] = await Promise.all([
    supabase
      .from("customers")
      .select("*, contacts(*), contracts(*), quotes(*), invoices(id, number, issue_date, due_date, total, status, currency)")
      .eq("id", id)
      .order("created_at", { referencedTable: "contacts" })
      .order("start_date", { referencedTable: "contracts" })
      .order("created_at", { referencedTable: "quotes", ascending: false })
      .order("number", { referencedTable: "invoices", ascending: false })
      .maybeSingle(),
    getSettings(supabase),
  ]);
  if (!data) notFound();
  // Fills in the map position and distances for customers created from a quote
  const c = await refreshGeo(supabase, "customers", data as Full, addressQuery(data as Full), settings.depots);
  const depot = settings.depots.find((d) => d.id === c.depot) ?? settings.depots[0];
  const cur = settings.currency;
  const today = new Date();
  const monthly = c.contracts.filter((k) => isRunning(k, today)).reduce((s, k) => s + monthlyValue(k), 0);
  const prefill = sp.contract === "new";
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="label">
            <Link href="/admin/customers">Zákazníci</Link>
          </p>
          <h1 className="display">{c.company_name}</h1>
          <p className="adm-head__meta">
            <CustomerPill status={c.status} />
            {monthly > 0 && <span>{money(monthly, cur)} / mesiac</span>}
            {c.source === "quote" && <span className="muted">vytvorený z dopytu {date(c.created_at)}</span>}
          </p>
        </div>
        <div className="btn-row">
          <Link href={`/admin/invoices/new?customer=${c.id}`} className="btn btn--dark">
            Vystaviť faktúru
          </Link>
          <ConfirmButton
          action={deleteCustomer.bind(null, c.id)}
          message={`Naozaj vymazať zákazníka ${c.company_name} vrátane kontaktov a zmlúv?`}
        >
          Vymazať
        </ConfirmButton>
        </div>
      </header>

      <div className="adm-grid">
        <section className="card">
          <LockedForm action={saveCustomer} title="Údaje firmy">
            <input type="hidden" name="id" value={c.id} />
            <CustomerFields c={c} depots={settings.depots} />
          </LockedForm>
        </section>

        <section className="card card--flush">
          <div className="card__pad">
            <div className="card__head">
              <h2 className="card__title">Poloha</h2>
              {address(c) && (
                <a
                  className="btn btn--ghost btn--sm"
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(depot?.address ?? "")}&destination=${encodeURIComponent(address(c))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Trasa ↗
                </a>
              )}
            </div>
            <DistanceList depots={settings.depots} distances={c.distances} selected={c.depot} />
          </div>
          {c.lat != null && c.lng != null ? (
            <MapView
              pins={[{ id: c.id, lat: c.lat, lng: c.lng, label: c.company_name, sub: address(c), status: c.status }]}
              depots={settings.depots}
              height={380}
            />
          ) : (
            <div className="map-empty">
              <p className="muted">
                Doplňte adresu a zákazník sa zobrazí na mape.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="card" id="contacts">
        <h2 className="card__title">Kontaktné osoby</h2>
        <ul className="people">
          {c.contacts.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                {p.role && <span className="muted"> · {p.role}</span>}
                <p>
                  {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
                  {p.phone && p.email && " · "}
                  {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                </p>
              </div>
              <details className="inline-edit">
                <summary className="btn btn--ghost btn--sm">Upraviť</summary>
                <ContactForm customerId={c.id} p={p} />
                <ConfirmButton action={deleteContact.bind(null, p.id)} message={`Odstrániť kontakt ${p.name}?`}>
                  Odstrániť kontakt
                </ConfirmButton>
              </details>
            </li>
          ))}
        </ul>
        <details className="add">
          <summary className="btn btn--ghost btn--sm">+ Pridať kontaktnú osobu</summary>
          <ContactForm customerId={c.id} />
        </details>
      </section>

      <section className="card" id="contracts">
        <div className="card__head">
          <h2 className="card__title">Zmluvy</h2>
        </div>
        <ul className="contracts">
          {c.contracts.map((k) => (
            <li key={k.id} className={isRunning(k, today) ? "" : "is-off"}>
              <div className="contract__sum">
                <strong>
                  {productLabel[k.product]} · {num(k.monthly_qty)} ks / mes.
                </strong>
                <span className="muted">
                  {money(Number(k.unit_price), cur)} / ks · {scheduleText(k)} · od {date(k.start_date)}
                  {k.end_date && ` do ${date(k.end_date)}`}
                  {k.notes && ` · ${k.notes}`}
                </span>
              </div>
              <span className="contract__value">{money(monthlyValue(k), cur)}</span>
              <details className="inline-edit">
                <summary className="btn btn--ghost btn--sm">Upraviť</summary>
                <ContractForm customerId={c.id} contract={k} />
                <ConfirmButton action={deleteContract.bind(null, k.id)} message="Odstrániť túto zmluvu?">
                  Odstrániť zmluvu
                </ConfirmButton>
              </details>
            </li>
          ))}
        </ul>
        <details className="add" open={prefill || c.contracts.length === 0}>
          <summary className="btn btn--ghost btn--sm">+ Pridať zmluvu</summary>
          <ContractForm
            customerId={c.id}
            quoteId={prefill ? str(sp.quote) : undefined}
            defaults={prefill ? { product: str(sp.product), qty: str(sp.qty), price: str(sp.price) } : undefined}
            submitLabel={prefill ? "Vytvoriť zmluvu a aktivovať" : "Pridať zmluvu"}
          />
        </details>
      </section>

      {c.invoices.length > 0 && (
        <section className="card">
          <h2 className="card__title">Faktúry</h2>
          <ul className="list">
            {c.invoices.map((i) => {
              const state = invoiceState(i);
              return (
                <li key={i.id}>
                  <Link href={`/admin/invoices/${i.id}`}>
                    <span>
                      <strong>{i.number}</strong>
                      <small className="muted">
                        {date(i.issue_date)} · {money(Number(i.total), i.currency)}
                      </small>
                    </span>
                    <span className={`pill pill--i-${state}`}>{invoiceStatusLabel[state]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {c.quotes.length > 0 && (
        <section className="card">
          <h2 className="card__title">Dopyty od zákazníka</h2>
          <ul className="list">
            {c.quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/admin/quotes/${q.id}`}>
                  <span>
                    <strong>
                      {productLabel[q.product]} · {num(q.quantity)} ks
                    </strong>
                    <small className="muted">
                      {date(q.created_at)} · {q.name}
                    </small>
                  </span>
                  <QuotePill status={q.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ContactForm({ customerId, p }: { customerId: string; p?: Contact }) {
  return (
    <form action={saveContact} className="adm-form">
      <input type="hidden" name="customer_id" value={customerId} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="form__row">
        <label className="field">
          <span>Meno a priezvisko *</span>
          <input name="name" required defaultValue={p?.name} />
        </label>
        <label className="field">
          <span>Pozícia</span>
          <input name="role" defaultValue={p?.role ?? ""} placeholder="napr. nákup, sklad" />
        </label>
      </div>
      <div className="form__row">
        <label className="field">
          <span>Telefón</span>
          <input name="phone" type="tel" defaultValue={p?.phone ?? ""} />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input name="email" type="email" defaultValue={p?.email ?? ""} />
        </label>
      </div>
      <div className="btn-row">
        <button className="btn btn--dark btn--sm">{p ? "Uložiť kontakt" : "Pridať kontakt"}</button>
      </div>
    </form>
  );
}
