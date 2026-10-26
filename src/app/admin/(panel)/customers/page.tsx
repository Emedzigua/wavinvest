import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { address, money, num } from "@/lib/admin/format";
import { customerStatusLabel, productLabel, scheduleText } from "@/lib/admin/labels";
import { isRunning, monthlyValue } from "@/lib/admin/schedule";
import type { Contact, Contract, Customer, CustomerStatus } from "@/lib/admin/types";
import { CustomerPill } from "@/components/admin/StatusPill";
import MapView from "@/components/admin/MapView";
import DistanceList from "@/components/admin/DistanceList";
import { addressQuery, refreshGeo } from "@/lib/admin/geo";

export const metadata: Metadata = { title: "Zákazníci" };
// Admin pages are personal and always rendered per request
export const instant = false;

type Row = Customer & { contacts: Contact[]; contracts: Contract[] };
const FILTERS: (CustomerStatus | "all")[] = ["all", "active", "inactive", "lost"];

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as CustomerStatus) ? (sp.status as CustomerStatus | "all") : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const { supabase } = await requireAdmin();
  let query = supabase.from("customers").select("*, contacts(*), contracts(*)").order("company_name");
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`company_name.ilike.%${q.replace(/[%,()]/g, "")}%,city.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data }, settings] = await Promise.all([query, getSettings(supabase)]);
  const customers = (data ?? []) as Row[];

  // Place a few customers without a map position per visit (the free
  // geocoder allows about one lookup per second)
  const pending = customers
    .filter((c) => {
      const q = addressQuery(c);
      return q && (q !== (c.geo_query ?? "") || (c.lat != null && settings.depots.some((d) => !c.distances?.[d.id])));
    })
    .slice(0, 3);
  for (const c of pending) Object.assign(c, await refreshGeo(supabase, "customers", c, addressQuery(c), settings.depots));
  const today = new Date();

  const pins = customers
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      id: c.id,
      lat: c.lat!,
      lng: c.lng!,
      label: c.company_name,
      sub: address(c),
      href: `/admin/customers/${c.id}`,
      status: c.status,
    }));

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Zákazníci</h1>
        <Link href="/admin/customers/new" className="btn btn--dark">
          + Nový zákazník
        </Link>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/customers" : `/admin/customers?status=${f}`}
              aria-current={status === f ? "page" : undefined}
            >
              {f === "all" ? "Všetci" : customerStatusLabel[f]}
            </Link>
          ))}
        </nav>
        <form className="search">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Hľadať…" aria-label="Hľadať" />
        </form>
      </div>

      {pins.length > 0 && (
        <section className="card card--flush">
          <MapView pins={pins} depots={settings.depots} height={360} />
        </section>
      )}

      {customers.length === 0 ? (
        <p className="card muted">Žiadni zákazníci{q && ` pre „${q}“`}.</p>
      ) : (
        <div className="rows">
          {customers.map((c) => {
            const running = c.contracts.filter((k) => isRunning(k, today));
            const monthly = running.reduce((s, k) => s + monthlyValue(k), 0);
            const pieces = running.reduce((s, k) => s + k.monthly_qty, 0);
            const depot = settings.depots.find((d) => d.id === c.depot);
            const km = c.distances?.[c.depot]?.km;
            return (
              <details key={c.id} className="row">
                <summary>
                  <span className="row__name">
                    <strong>{c.company_name}</strong>
                    <small className="muted">{c.city ?? "—"}</small>
                  </span>
                  <span className="row__meta">{km != null ? `${num(km)} km${depot ? ` z ${depot.name}` : ""}` : "—"}</span>
                  <span className="row__meta">{pieces > 0 ? `${num(pieces)} ks / mes.` : "—"}</span>
                  <span className="row__meta">{monthly > 0 ? money(monthly, settings.currency) : ""}</span>
                  <CustomerPill status={c.status} />
                  <span className="row__icon" aria-hidden />
                </summary>
                <div className="row__body">
                  <div>
                    <h3 className="mini">Adresa</h3>
                    <p>{address(c) || <span className="muted">Nevyplnená</span>}</p>
                    <h3 className="mini">Vzdialenosť</h3>
                    <DistanceList depots={settings.depots} distances={c.distances} selected={c.depot} />
                    {c.notes && (
                      <>
                        <h3 className="mini">Poznámky</h3>
                        <p className="pre">{c.notes}</p>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="mini">Kontaktné osoby</h3>
                    {c.contacts.length === 0 ? (
                      <p className="muted">Žiadne</p>
                    ) : (
                      <ul className="contacts">
                        {c.contacts.map((p) => (
                          <li key={p.id}>
                            <strong>{p.name}</strong>
                            {p.role && <span className="muted"> · {p.role}</span>}
                            <br />
                            {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
                            {p.phone && p.email && " · "}
                            {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="mini">Zmluvy</h3>
                    {c.contracts.length === 0 ? (
                      <p className="muted">Žiadne</p>
                    ) : (
                      <ul className="contacts">
                        {c.contracts.map((k) => (
                          <li key={k.id} className={isRunning(k, today) ? "" : "muted"}>
                            <strong>
                              {num(k.monthly_qty)} ks / mes. · {productLabel[k.product]}
                            </strong>
                            <br />
                            <span className="muted">{money(Number(k.unit_price), settings.currency)} / ks · {scheduleText(k)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="row__actions">
                    <Link href={`/admin/customers/${c.id}`} className="btn btn--dark btn--sm">
                      Otvoriť
                    </Link>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
