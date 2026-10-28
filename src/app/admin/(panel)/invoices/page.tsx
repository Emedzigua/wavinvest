import Link from "next/link";
import type { Metadata } from "next";
import BackButton from "@/components/admin/BackButton";
import AutoSubmitForm from "@/components/admin/AutoSubmitForm";
import RowLink from "@/components/admin/RowLink";
import { requireAdmin } from "@/lib/admin/auth";
import { date } from "@/lib/admin/format";
import { invoiceState } from "@/lib/admin/invoice";
import { invoiceStatusLabel } from "@/lib/admin/labels";
import { quarterMonths, quarterOf, taxTotals } from "@/lib/admin/quarters";
import type { Invoice } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Faktúry" };
// Admin pages are personal and always rendered per request
export const instant = false;

const STATUSES = ["all", "issued", "overdue", "paid", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const statusLabel = { all: "Všetky stavy", issued: "Neuhradené", overdue: "Po splatnosti", paid: "Uhradené", cancelled: "Stornované" };

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("invoices").select("*").order("number", { ascending: false });
  const all = (data ?? []) as Invoice[];

  const thisYear = new Date().getUTCFullYear();
  const years = [...new Set([thisYear, ...all.map((i) => Number(i.issue_date.slice(0, 4)))])].sort((a, b) => b - a);
  const year = years.includes(Number(sp.year)) ? Number(sp.year) : thisYear;
  const quarter = ["1", "2", "3", "4"].includes(String(sp.q)) ? Number(sp.q) : 0;
  const status: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : "all";
  const q = typeof sp.q2 === "string" ? sp.q2.trim().toLowerCase() : "";

  const inYear = all.filter((i) => Number(i.issue_date.slice(0, 4)) === year);
  const list = inYear.filter(
    (i) =>
      (!quarter || quarterOf(i.issue_date) === quarter) &&
      (status === "all" || invoiceState(i) === status || (status === "issued" && invoiceState(i) === "overdue")) &&
      (!q || i.number.includes(q) || i.buyer.name.toLowerCase().includes(q)),
  );
  const groups = [4, 3, 2, 1]
    .map((n) => ({ n, items: list.filter((i) => quarterOf(i.issue_date) === n) }))
    .filter((g) => g.items.length > 0);

  const totals = taxTotals(list);
  const waiting = list.filter((i) => i.status === "issued").reduce((s, i) => s + Number(i.total), 0);
  const money = (v: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(v);
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ year: String(year), ...(quarter && { q: String(quarter) }), ...(status !== "all" && { status }), ...(q && { q2: q }), ...patch });
    for (const [k, v] of [...p]) if (!v || v === "0" || v === "all") p.delete(k);
    return `/admin/invoices?${p}`;
  };
  const exportHref = `/admin/invoices/export?year=${year}${quarter ? `&q=${quarter}` : ""}`;

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin" label="Prehľad" />
          <h1 className="display">Faktúry</h1>
        </div>
        <div className="btn-row">
          <a href={exportHref} className="btn btn--ghost">
            Export pre účtovníka
          </a>
          <Link href="/admin/invoices/new" className="btn btn--dark">
            + Nová faktúra
          </Link>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Štvrťrok">
          {[0, 1, 2, 3, 4].map((n) => (
            <Link key={n} href={link({ q: String(n) })} aria-current={quarter === n ? "page" : undefined}>
              {n === 0 ? `Celý rok ${year}` : `Q${n}`}
            </Link>
          ))}
        </nav>
        <AutoSubmitForm className="filters">
          {quarter > 0 && <input type="hidden" name="q" value={quarter} />}
          <select name="year" defaultValue={year} aria-label="Rok" className="pill-select">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} aria-label="Stav" className="pill-select">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
          <input name="q2" defaultValue={q} placeholder="Hľadať…" aria-label="Hľadať číslo alebo odberateľa" className="search__input" />
        </AutoSubmitForm>
      </div>

      <section className="sums sums--4">
        <div className="card">
          <span>Základ dane</span>
          <strong className="fit">{money(totals.base)}</strong>
        </div>
        <div className="card">
          <span>DPH</span>
          <strong className="fit">{money(totals.vat)}</strong>
        </div>
        <div className="card">
          <span>Spolu s DPH</span>
          <strong className="fit">{money(totals.total)}</strong>
        </div>
        <div className="card">
          <span>Čaká na úhradu</span>
          <strong className="fit">{money(waiting)}</strong>
        </div>
      </section>

      {groups.length === 0 ? (
        <p className="card muted">Žiadne faktúry v tomto období.</p>
      ) : (
        groups.map((g) => {
          const t = taxTotals(g.items);
          return (
            <section key={g.n} className="card card--flush quarter">
              <header className="quarter__head">
                <div>
                  <h2 className="card__title">
                    Q{g.n} {year}
                  </h2>
                  <span className="muted small">{quarterMonths[g.n]}</span>
                </div>
                <dl className="quarter__sums">
                  <div>
                    <dt>Základ</dt>
                    <dd>{money(t.base)}</dd>
                  </div>
                  <div>
                    <dt>DPH</dt>
                    <dd>{money(t.vat)}</dd>
                  </div>
                  <div>
                    <dt>Spolu</dt>
                    <dd>{money(t.total)}</dd>
                  </div>
                </dl>
              </header>
              <div className="scroll-x">
                <table className="tbl tbl--rows">
                  <thead>
                    <tr>
                      <th>Číslo</th>
                      <th>Odberateľ</th>
                      <th>Vystavená</th>
                      <th>Splatná</th>
                      <th className="num">Základ</th>
                      <th className="num">Spolu</th>
                      <th>Stav</th>
                      <th aria-label="PDF" />
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((i) => {
                      const state = invoiceState(i);
                      return (
                        <RowLink key={i.id} href={`/admin/invoices/${i.id}`} className={state === "cancelled" ? "is-muted" : ""}>
                          <td className="nowrap">
                            <Link href={`/admin/invoices/${i.id}`}>
                              <strong>{i.number}</strong>
                            </Link>
                          </td>
                          <td>{i.buyer.name}</td>
                          <td className="nowrap muted">{date(i.issue_date)}</td>
                          <td className="nowrap muted">{date(i.due_date)}</td>
                          <td className="num">{money(Number(i.subtotal))}</td>
                          <td className="num">{money(Number(i.total))}</td>
                          <td>
                            <span className={`pill pill--i-${state}`}>{invoiceStatusLabel[state]}</span>
                          </td>
                          <td className="num">
                            <a href={`/admin/invoices/${i.id}/pdf?download`} className="pdf-link" aria-label={`Stiahnuť PDF ${i.number}`}>
                              PDF
                            </a>
                          </td>
                        </RowLink>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
