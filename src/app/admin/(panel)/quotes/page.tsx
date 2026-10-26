import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, num } from "@/lib/admin/format";
import { productLabel, quoteStatusLabel } from "@/lib/admin/labels";
import type { Quote, QuoteStatus } from "@/lib/admin/types";
import { QuotePill } from "@/components/admin/StatusPill";

export const metadata: Metadata = { title: "Dopyty" };
// Admin pages are personal and always rendered per request
export const instant = false;

const FILTERS: (QuoteStatus | "all")[] = ["all", "new", "replied", "won", "lost"];

export default async function QuotesPage({ searchParams }: PageProps<"/admin/quotes">) {
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as QuoteStatus) ? (sp.status as QuoteStatus | "all") : "all";
  const { supabase } = await requireAdmin();
  let query = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(300);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const quotes = (data ?? []) as Quote[];

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Dopyty</h1>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/quotes" : `/admin/quotes?status=${f}`}
              aria-current={status === f ? "page" : undefined}
            >
              {f === "all" ? "Všetky" : quoteStatusLabel[f]}
            </Link>
          ))}
        </nav>
      </div>

      {quotes.length === 0 ? (
        <p className="card muted">Žiadne dopyty.</p>
      ) : (
        <div className="card card--flush scroll-x">
          <table className="tbl tbl--rows">
            <thead>
              <tr>
                <th>Prijaté</th>
                <th>Firma</th>
                <th>Produkt</th>
                <th className="num">Množstvo</th>
                <th>Dodanie</th>
                <th>Jazyk</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className={q.status === "new" ? "is-new" : ""}>
                  <td className="nowrap">{dateTime(q.created_at)}</td>
                  <td>
                    <Link href={`/admin/quotes/${q.id}`} className="stretch">
                      <strong>{q.company}</strong>
                    </Link>
                    <small className="muted"> · {q.name}</small>
                  </td>
                  <td>{productLabel[q.product]}</td>
                  <td className="num">{num(q.quantity)} ks</td>
                  <td>{q.delivery_location}</td>
                  <td>{q.language.toUpperCase()}</td>
                  <td>
                    <QuotePill status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
