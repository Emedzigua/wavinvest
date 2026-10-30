import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { date, money, num } from "@/lib/admin/format";
import { invoiceState } from "@/lib/admin/invoice";
import { productLabel, weekdayLong } from "@/lib/admin/labels";
import { deliversOn, isRunning, monthlyHistory, monthlyValue, perDelivery } from "@/lib/admin/schedule";
import type { Contract, Customer, Invoice, Quote } from "@/lib/admin/types";
import RevenueCard from "@/components/admin/RevenueCard";

export const metadata: Metadata = { title: "Prehľad" };
// Admin pages are personal and always rendered per request
export const instant = false;

type Row = Contract & { customer: Pick<Customer, "id" | "company_name" | "city"> };
type InvoiceRow = Pick<Invoice, "id" | "number" | "issue_date" | "due_date" | "total" | "status" | "paid_at" | "created_at" | "buyer">;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const compactMoney = (v: number, currency: string) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);
const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);

  const [{ data: contracts }, { data: quotes }, { data: invoices }, settings, { data: stats }, { data: mails }] = await Promise.all([
    supabase.from("contracts").select("*, customer:customers(id, company_name, city)"),
    supabase.from("quotes").select("id, company, quantity, status, created_at, replied_at").order("created_at", { ascending: false }).limit(200),
    supabase
      .from("invoices")
      .select("id, number, issue_date, due_date, total, status, paid_at, created_at, buyer")
      .order("created_at", { ascending: false })
      .limit(500),
    getSettings(supabase),
    supabase.rpc("visitor_stats", { p_days: 30 }),
    supabase
      .from("emails")
      .select("id, to_email, subject, created_at, customer:customers(company_name)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);
  const recentMail = (mails ?? []) as unknown as { id: string; to_email: string; subject: string; created_at: string; customer: { company_name: string } | null }[];

  const all = (contracts ?? []) as Row[];
  const allQuotes = (quotes ?? []) as Pick<Quote, "id" | "company" | "quantity" | "status" | "created_at" | "replied_at">[];
  const allInvoices = (invoices ?? []) as InvoiceRow[];
  const cur = settings.currency;
  const running = all.filter((k) => isRunning(k, today));

  const monthly = running.reduce((s, k) => s + monthlyValue(k), 0);
  const epal = running.filter((k) => k.product === "epal").reduce((s, k) => s + k.monthly_qty, 0);
  const collars = running.filter((k) => k.product === "collars").reduce((s, k) => s + k.monthly_qty, 0);
  const customers = new Set(running.map((k) => k.customer_id)).size;
  const history = monthlyHistory(all, 12, today);
  const newQuotes = allQuotes.filter((q) => q.status === "new");

  // Upcoming deliveries: next 14 days, only days that have something
  const upcoming = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    const items = all
      .filter((k) => deliversOn(k, d))
      .map((k) => ({ k, qty: perDelivery(k) }))
      .sort((a, b) => b.qty - a.qty);
    return { d, i, items, qty: items.reduce((s, x) => s + x.qty, 0) };
  }).filter((day) => day.items.length > 0);
  const dayName = (d: Date, i: number) =>
    i === 0 ? "Dnes" : i === 1 ? "Zajtra" : weekdayLong[((d.getUTCDay() + 6) % 7) + 1];

  // Invoices this month
  const month = iso(today).slice(0, 7);
  const live = allInvoices.filter((i) => i.status !== "cancelled");
  const thisMonth = live.filter((i) => i.issue_date.startsWith(month));
  const waiting = live.filter((i) => i.status === "issued");
  const overdue = waiting.filter((i) => invoiceState(i) === "overdue");
  const sum = (xs: InvoiceRow[]) => xs.reduce((s, i) => s + Number(i.total), 0);

  // Follow-ups: one short line each, most urgent first
  const in30 = new Date(today);
  in30.setUTCDate(in30.getUTCDate() + 30);
  const todo = [
    ...overdue.map((i) => ({ key: `i${i.id}`, href: `/admin/invoices/${i.id}`, title: i.buyer.name, text: `Faktúra ${i.number} po splatnosti`, tone: "bad" })),
    ...allQuotes
      .filter((q) => q.status === "replied" && q.replied_at && q.replied_at < fiveDaysAgo.toISOString())
      .map((q) => ({ key: `q${q.id}`, href: `/admin/quotes/${q.id}`, title: q.company, text: `Bez odpovede od ${date(q.replied_at!)}`, tone: "warn" })),
    ...all
      .filter((k) => k.end_date && k.end_date >= iso(today) && k.end_date <= iso(in30))
      .map((k) => ({ key: `c${k.id}`, href: `/admin/customers/${k.customer.id}`, title: k.customer.company_name, text: `Zmluva končí ${date(k.end_date!)}`, tone: "info" })),
  ];

  // Recent activity, newest first
  const activity = [
    ...allQuotes.map((q) => ({ at: q.created_at, href: `/admin/quotes/${q.id}`, title: q.company, text: `Nový dopyt · ${num(q.quantity)} ks` })),
    ...allInvoices.map((i) => ({ at: i.created_at, href: `/admin/invoices/${i.id}`, title: i.buyer.name, text: `Faktúra ${i.number} vystavená` })),
    ...allInvoices
      .filter((i) => i.paid_at)
      .map((i) => ({ at: `${i.paid_at}T12:00:00Z`, href: `/admin/invoices/${i.id}`, title: i.buyer.name, text: `Faktúra ${i.number} uhradená` })),
    ...all.map((k) => ({ at: k.created_at, href: `/admin/customers/${k.customer.id}`, title: k.customer.company_name, text: `Nová zmluva · ${productLabel[k.product]}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Prehľad</h1>
        <p className="visits" title={`${num(stats?.views ?? 0)} zobrazení stránok`}>
          <strong>{num(stats?.visitors ?? 0)}</strong> návštevníkov webu za 30 dní
        </p>
      </header>

      {newQuotes.length > 0 && (
        <Link href="/admin/quotes?status=new" className="alert-new">
          <span className="alert-new__count">{newQuotes.length}</span>
          <span className="alert-new__text">
            <strong>{plural(newQuotes.length, "Nový dopyt", "Nové dopyty", "Nových dopytov")}</strong>
            <span>{newQuotes.slice(0, 3).map((q) => q.company).join(", ")}{newQuotes.length > 3 ? " …" : ""}</span>
          </span>
          <span className="alert-new__go">Otvoriť →</span>
        </Link>
      )}

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
          <Link href="/admin/invoices?status=issued" className={`card stat${overdue.length ? " stat--alert" : ""}`}>
            <span>Čaká na úhradu</span>
            <strong className="fit fit--money">{compactMoney(sum(waiting), cur)}</strong>
            <small>{overdue.length ? `${overdue.length} po splatnosti` : `${waiting.length} ${plural(waiting.length, "faktúra", "faktúry", "faktúr")}`}</small>
          </Link>
        </div>
      </div>

      {todo.length > 0 && (
        <section className="card">
          <h2 className="card__title">Na riešenie</h2>
          <ul className="todo">
            {todo.map((t) => (
              <li key={t.key} className={`todo--${t.tone}`}>
                <Link href={t.href}>
                  <strong>{t.title}</strong>
                  <span>{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Najbližšie dodávky</h2>
          <span className="muted small">14 dní</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">Žiadne dodávky v najbližších dvoch týždňoch.</p>
        ) : (
          <div className="next">
            {upcoming.map(({ d, i, items, qty }) => (
              <div key={iso(d)} className={`next__day${i === 0 ? " is-today" : ""}`}>
                <div className="next__date">
                  <strong>{dayName(d, i)}</strong>
                  <span>{date(d).slice(0, -5)}</span>
                </div>
                <ul className="next__list">
                  {items.map(({ k, qty }) => (
                    <li key={k.id}>
                      <Link href={`/admin/customers/${k.customer.id}`}>{k.customer.company_name}</Link>
                      <span className="muted">{productLabel[k.product]}</span>
                      <span className="next__qty">{num(qty)} ks</span>
                    </li>
                  ))}
                </ul>
                <span className="next__total">{num(qty)} ks</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="adm-grid adm-grid--3">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Pošta</h2>
            <Link href="/admin/mail" className="btn btn--ghost btn--sm">
              Otvoriť
            </Link>
          </div>
          {recentMail.length === 0 ? (
            <p className="muted">Schránka zatiaľ nie je pripojená. Odoslané e-maily z administrácie sa zobrazia tu.</p>
          ) : (
            <ul className="activity">
              {recentMail.map((m) => (
                <li key={m.id}>
                  <Link href="/admin/mail">
                    <span>
                      <strong>{m.customer?.company_name ?? m.to_email}</strong> <span className="muted">· {m.subject}</span>
                    </span>
                    <time className="muted">{date(m.created_at)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/mail" className="btn btn--dark btn--sm mail-new">
            Napísať e-mail
          </Link>
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Faktúry tento mesiac</h2>
            <Link href="/admin/invoices" className="btn btn--ghost btn--sm">
              Všetky
            </Link>
          </div>
          <dl className="mini-stats">
            <div>
              <dt>Vystavené</dt>
              <dd>{money(sum(thisMonth), cur)}</dd>
            </div>
            <div>
              <dt>Uhradené</dt>
              <dd>{money(sum(thisMonth.filter((i) => i.status === "paid")), cur)}</dd>
            </div>
            <div>
              <dt>Počet</dt>
              <dd>{thisMonth.length}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="card__title">Posledná aktivita</h2>
          {activity.length === 0 ? (
            <p className="muted">Zatiaľ nič.</p>
          ) : (
            <ul className="activity">
              {activity.map((a) => (
                <li key={a.href + a.text}>
                  <Link href={a.href}>
                    <span>
                      <strong>{a.title}</strong> <span className="muted">· {a.text}</span>
                    </span>
                    <time className="muted">{date(a.at)}</time>
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
