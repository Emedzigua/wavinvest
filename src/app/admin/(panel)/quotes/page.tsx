import Link from "next/link";
import type { Metadata } from "next";
import BackButton from "@/components/admin/BackButton";
import RowLink from "@/components/admin/RowLink";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, num } from "@/lib/admin/format";
import { productLabel } from "@/lib/admin/labels";
import type { Quote, QuoteStatus } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Dopyty" };
// Admin pages are personal and always rendered per request
export const instant = false;

const TABS: QuoteStatus[] = ["new", "opened", "replied", "archived"];
const tabLabel: Record<QuoteStatus, string> = { new: "Nové", opened: "Otvorené", replied: "Odpovedané", archived: "Archív" };

export default async function QuotesPage({ searchParams }: PageProps<"/admin/quotes">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(500);
  const all = (data ?? []) as Quote[];
  const counts = Object.fromEntries(TABS.map((t) => [t, all.filter((q) => q.status === t).length])) as Record<QuoteStatus, number>;

  // Without a choice, open the first category that has something in it
  const status = TABS.includes(sp.status as QuoteStatus)
    ? (sp.status as QuoteStatus)
    : (TABS.find((t) => t !== "archived" && counts[t] > 0) ?? "new");
  const quotes = all.filter((q) => q.status === status);

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin" label="Prehľad" />
          <h1 className="display">Dopyty</h1>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Kategória">
          {TABS.map((t) => (
            <Link key={t} href={`/admin/quotes?status=${t}`} aria-current={status === t ? "page" : undefined}>
              {tabLabel[t]}
              {counts[t] > 0 && <span className="tabs__count">{counts[t]}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {quotes.length === 0 ? (
        <p className="card muted">Prázdne.</p>
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
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <RowLink key={q.id} href={`/admin/quotes/${q.id}`} className={q.status === "new" ? "is-new" : ""}>
                  <td className="nowrap muted">{dateTime(q.created_at)}</td>
                  <td>
                    <Link href={`/admin/quotes/${q.id}`}>
                      <strong>{q.company}</strong>
                    </Link>
                    <small className="muted"> · {q.name}</small>
                  </td>
                  <td>{productLabel[q.product]}</td>
                  <td className="num">{num(q.quantity)} ks</td>
                  <td>{q.delivery_location}</td>
                </RowLink>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
