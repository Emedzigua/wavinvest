import Link from "next/link";
import type { Metadata } from "next";
import BackButton from "@/components/admin/BackButton";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { address, money, num } from "@/lib/admin/format";
import { customerStatusLabel } from "@/lib/admin/labels";
import { isRunning, monthlyValue } from "@/lib/admin/schedule";
import type { Contact, Contract, Customer, CustomerStatus } from "@/lib/admin/types";
import { CustomerPill } from "@/components/admin/StatusPill";
import MapView from "@/components/admin/MapView";
import { customerColor } from "@/lib/admin/colors";
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
      color: customerColor(c.id),
    }));

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin" label="Prehľad" />
          <h1 className="display">Zákazníci</h1>
        </div>
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
              <Link key={c.id} href={`/admin/customers/${c.id}`} className="row row--link" style={{ "--pin": customerColor(c.id) } as React.CSSProperties}>
                <span className="dot" aria-hidden />
                <span className="row__name">
                  <strong>{c.company_name}</strong>
                  <small className="muted">{c.city ?? "—"}</small>
                </span>
                <span className="row__meta">{km != null ? `${num(km)} km${depot ? ` · ${depot.name}` : ""}` : "—"}</span>
                <span className="row__meta">{pieces > 0 ? `${num(pieces)} ks / mes.` : "—"}</span>
                <span className="row__meta">{monthly > 0 ? money(monthly, settings.currency) : ""}</span>
                <CustomerPill status={c.status} />
                <span className="row__go" aria-hidden>
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
