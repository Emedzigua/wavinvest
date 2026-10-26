import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { date } from "@/lib/admin/format";
import { invoiceState } from "@/lib/admin/invoice";
import { invoiceStatusLabel } from "@/lib/admin/labels";
import type { Invoice } from "@/lib/admin/types";
import AutoSubmitForm from "@/components/admin/AutoSubmitForm";

export const metadata: Metadata = { title: "Faktúry" };
// Admin pages are personal and always rendered per request
export const instant = false;

const FILTERS = ["all", "issued", "overdue", "paid", "cancelled"] as const;
const tabLabel = { all: "Všetky", issued: "Neuhradené", overdue: "Po splatnosti", paid: "Uhradené", cancelled: "Stornované" };
type Filter = (typeof FILTERS)[number];

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  const sp = await searchParams;
  const status: Filter = FILTERS.includes(sp.status as Filter) ? (sp.status as Filter) : "all";
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("invoices").select("*").order("number", { ascending: false });
  const all = (data ?? []) as Invoice[];

  // Months that have invoices, newest first, for the month picker
  const months = [...new Set(all.map((i) => i.issue_date.slice(0, 7)))];
  const monthName = (m: string) =>
    new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00Z`));

  const list = all.filter(
    (i) =>
      (!month || i.issue_date.startsWith(month)) &&
      (status === "all" || invoiceState(i) === status || (status === "issued" && invoiceState(i) === "overdue")) &&
      (!q || i.number.includes(q) || i.buyer.name.toLowerCase().includes(q)),
  );
  const live = list.filter((i) => i.status !== "cancelled");
  const sum = (xs: Invoice[]) => xs.reduce((s, i) => s + Number(i.total), 0);
  const money = (v: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(v);
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(month && { month }), ...(status !== "all" && { status }), ...(q && { q }), ...patch });
    for (const [k, v] of [...p]) if (!v || v === "all") p.delete(k);
    return `/admin/invoices${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Faktúry</h1>
        <Link href="/admin/invoices/new" className="btn btn--dark">
          + Nová faktúra
        </Link>
      </header>

      <section className="sums">
        <div className="card">
          <span>Vystavené</span>
          <strong className="fit">{money(sum(live))}</strong>
        </div>
        <div className="card">
          <span>Uhradené</span>
          <strong className="fit">{money(sum(live.filter((i) => i.status === "paid")))}</strong>
        </div>
        <div className="card">
          <span>Čaká na úhradu</span>
          <strong className="fit">{money(sum(live.filter((i) => i.status === "issued")))}</strong>
        </div>
      </section>

      <div className="toolbar">
        <nav className="tabs" aria-label="Stav">
          {FILTERS.map((f) => (
            <Link key={f} href={link({ status: f })} aria-current={status === f ? "page" : undefined}>
              {tabLabel[f]}
            </Link>
          ))}
        </nav>
        <AutoSubmitForm className="filters">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <select name="month" defaultValue={month} aria-label="Mesiac" className="pill-select">
            <option value="">Všetky mesiace</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Hľadať…" aria-label="Hľadať číslo alebo odberateľa" className="search__input" />
        </AutoSubmitForm>
      </div>

      {list.length === 0 ? (
        <p className="card muted">Žiadne faktúry.</p>
      ) : (
        <div className="card card--flush scroll-x">
          <table className="tbl tbl--rows">
            <thead>
              <tr>
                <th>Číslo</th>
                <th>Odberateľ</th>
                <th>Vystavená</th>
                <th>Splatná</th>
                <th className="num">Suma</th>
                <th>Stav</th>
                <th aria-label="PDF" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const state = invoiceState(i);
                return (
                  <tr key={i.id} className={state === "cancelled" ? "is-muted" : ""}>
                    <td className="nowrap">
                      <Link href={`/admin/invoices/${i.id}`} className="stretch">
                        <strong>{i.number}</strong>
                      </Link>
                    </td>
                    <td>{i.buyer.name}</td>
                    <td className="nowrap muted">{date(i.issue_date)}</td>
                    <td className="nowrap muted">{date(i.due_date)}</td>
                    <td className="num">{money(Number(i.total))}</td>
                    <td>
                      <span className={`pill pill--i-${state}`}>{invoiceStatusLabel[state]}</span>
                    </td>
                    <td className="num">
                      <a href={`/admin/invoices/${i.id}/pdf?download`} className="pdf-link" aria-label={`Stiahnuť PDF ${i.number}`}>
                        PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>{list.length} faktúr</td>
                <td className="num">{money(sum(live))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
