import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { date, money, num } from "@/lib/admin/format";
import { productLabel, weekdayLong } from "@/lib/admin/labels";
import { deliversOn, isRunning, monthlyHistory, monthlyValue, perDelivery, weekDays, weekStart } from "@/lib/admin/schedule";
import type { Contract, Customer, Quote } from "@/lib/admin/types";
import { QuotePill } from "@/components/admin/StatusPill";
import RevenueCard from "@/components/admin/RevenueCard";

export const metadata: Metadata = { title: "Prehľad" };
// Admin pages are personal and always rendered per request
export const instant = false;

type Row = Contract & { customer: Pick<Customer, "id" | "company_name" | "city" | "depot" | "distances"> };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const compactMoney = (v: number, currency: string) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: contracts }, { data: quotes }, { count: newCount }, settings] = await Promise.all([
    supabase.from("contracts").select("*, customer:customers(id, company_name, city, depot, distances)"),
    supabase
      .from("quotes")
      .select("id, company, product, quantity, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new"),
    getSettings(supabase),
  ]);

  const all = (contracts ?? []) as Row[];
  const today = new Date();
  const running = all.filter((k) => isRunning(k, today));
  const cur = settings.currency;

  const monthly = running.reduce((s, k) => s + monthlyValue(k), 0);
  const epal = running.filter((k) => k.product === "epal").reduce((s, k) => s + k.monthly_qty, 0);
  const collars = running.filter((k) => k.product === "collars").reduce((s, k) => s + k.monthly_qty, 0);
  const customers = new Set(running.map((k) => k.customer_id)).size;
  const history = monthlyHistory(all, 12, today);

  // Revenue per customer
  const byCustomer = [...Map.groupBy(running, (k) => k.customer_id).values()]
    .map((list) => ({
      customer: list[0].customer,
      epal: list.filter((k) => k.product === "epal").reduce((s, k) => s + k.monthly_qty, 0),
      collars: list.filter((k) => k.product === "collars").reduce((s, k) => s + k.monthly_qty, 0),
      monthly: list.reduce((s, k) => s + monthlyValue(k), 0),
    }))
    .sort((a, b) => b.monthly - a.monthly);

  // Deliveries of the selected week, one row per delivery
  const monday = weekStart(typeof sp.week === "string" ? sp.week : undefined);
  const prev = new Date(monday);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const next = new Date(monday);
  next.setUTCDate(next.getUTCDate() + 7);
  const days = weekDays(monday).map((d) => {
    const items = all
      .filter((k) => deliversOn(k, d))
      .map((k) => ({ k, qty: perDelivery(k) }))
      .sort((a, b) => a.k.customer.company_name.localeCompare(b.k.customer.company_name, "sk"));
    return { d, items, qty: items.reduce((s, x) => s + x.qty, 0) };
  });
  const isThisWeek = iso(monday) === iso(weekStart());
  const depotName = (id: string) => settings.depots.find((d) => d.id === id)?.name ?? id;

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Prehľad</h1>
      </header>

      <div className="dash">
        <RevenueCard
          data={history}
          currency={cur}
          footer={[
            { label: "Ročne", value: compactMoney(monthly * 12, cur) },
            { label: "Palety", value: `${num(epal)} ks` },
            { label: "Nadstavce", value: `${num(collars)} ks` },
          ]}
        />
        <div className="dash__side">
          <Link href="/admin/customers?status=active" className="card stat">
            <span>Aktívni zákazníci</span>
            <strong className="fit">{customers}</strong>
          </Link>
          <Link href="/admin/quotes?status=new" className={`card stat${(newCount ?? 0) > 0 ? " stat--alert" : ""}`}>
            <span>Nové dopyty</span>
            <strong className="fit">{newCount ?? 0}</strong>
          </Link>
        </div>
      </div>

      <section className="card" id="deliveries">
        <div className="card__head">
          <h2 className="card__title">
            Dodávky <span className="muted">{date(monday)} – {date(weekDays(monday)[6])}</span>
          </h2>
          <nav className="seg" aria-label="Týždeň">
            <Link href={`/admin?week=${iso(prev)}#deliveries`} aria-label="Predchádzajúci týždeň">←</Link>
            <Link href="/admin#deliveries" aria-current={isThisWeek ? "page" : undefined}>Tento týždeň</Link>
            <Link href={`/admin?week=${iso(next)}#deliveries`} aria-label="Ďalší týždeň">→</Link>
          </nav>
        </div>

        <div className="agenda">
          {days.map(({ d, items, qty }) => {
            const dow = ((d.getUTCDay() + 6) % 7) + 1;
            const isToday = iso(d) === iso(today);
            return (
              <div key={iso(d)} className={`agenda__day${isToday ? " is-today" : ""}${items.length === 0 ? " is-empty" : ""}`}>
                <div className="agenda__date">
                  <strong>{weekdayLong[dow]}</strong>
                  <span>{isToday ? "Dnes" : date(d).slice(0, -5)}</span>
                  {items.length > 0 && <em>{num(qty)} ks</em>}
                </div>
                {items.length === 0 ? (
                  <p className="agenda__none">—</p>
                ) : (
                  <div className="agenda__list">
                    <table className="tbl tbl--compact">
                      <tbody>
                        {items.map(({ k, qty }) => {
                          const km = k.customer.distances?.[k.customer.depot]?.km;
                          return (
                            <tr key={k.id}>
                              <td>
                                <Link href={`/admin/customers/${k.customer.id}`}>{k.customer.company_name}</Link>
                              </td>
                              <td className="muted">{k.customer.city ?? ""}</td>
                              <td>{productLabel[k.product]}</td>
                              <td className="num">{num(qty)} ks</td>
                              <td className="num muted">
                                {km != null ? `${num(km)} km · ${depotName(k.customer.depot)}` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="adm-grid">
        <section className="card">
          <h2 className="card__title">Zákazníci</h2>
          {byCustomer.length === 0 ? (
            <p className="muted">Zatiaľ žiadne zmluvy.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Zákazník</th>
                  <th className="num">Palety</th>
                  <th className="num">Nadstavce</th>
                  <th className="num">Mesačne</th>
                </tr>
              </thead>
              <tbody>
                {byCustomer.map((r) => (
                  <tr key={r.customer.id}>
                    <td>
                      <Link href={`/admin/customers/${r.customer.id}`}>{r.customer.company_name}</Link>
                    </td>
                    <td className="num">{num(r.epal)}</td>
                    <td className="num">{num(r.collars)}</td>
                    <td className="num">{money(r.monthly, cur)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Spolu</td>
                  <td className="num">{num(epal)}</td>
                  <td className="num">{num(collars)}</td>
                  <td className="num">{money(monthly, cur)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section className="card">
          <h2 className="card__title">Dopyty</h2>
          {(quotes ?? []).length === 0 ? (
            <p className="muted">Zatiaľ žiadne dopyty.</p>
          ) : (
            <ul className="list">
              {(quotes as Quote[]).map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/quotes/${q.id}`}>
                    <span>
                      <strong>{q.company}</strong>
                      <small className="muted">
                        {productLabel[q.product]} · {num(q.quantity)} ks · {date(q.created_at)}
                      </small>
                    </span>
                    <QuotePill status={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
