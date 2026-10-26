import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { dateTime, num } from "@/lib/admin/format";
import { customerStatusLabel, productLabel } from "@/lib/admin/labels";
import type { Quote } from "@/lib/admin/types";
import { deleteQuote, setQuoteStatus } from "../../../actions";
import QuoteCalculator from "@/components/admin/QuoteCalculator";
import { refreshGeo } from "@/lib/admin/geo";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { QuotePill } from "@/components/admin/StatusPill";

export const metadata: Metadata = { title: "Dopyt" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function QuotePage({ params }: PageProps<"/admin/quotes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, settings] = await Promise.all([
    supabase.from("quotes").select("*, customer:customers(id, company_name, status)").eq("id", id).maybeSingle(),
    getSettings(supabase),
  ]);
  if (!data) notFound();
  // Opening a new request moves it to "Otvorený"
  if (data.status === "new") {
    await supabase.from("quotes").update({ status: "opened" }).eq("id", id);
    data.status = "opened";
  }
  type Row = Quote & { customer: { id: string; company_name: string; status: "active" | "inactive" | "lost" } | null };
  // Distance from the warehouses to the delivery place
  const q = await refreshGeo(supabase, "quotes", data as Row, (data as Row).delivery_location, settings.depots);

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="label">
            <Link href="/admin/quotes">Dopyty</Link>
          </p>
          <h1 className="display">{q.company}</h1>
          <p className="adm-head__meta">
            <QuotePill status={q.status} />
            <span className="muted">prijaté {dateTime(q.created_at)}</span>
          </p>
        </div>
        <div className="btn-row">
          {q.status === "archived" ? (
            <ConfirmButton action={setQuoteStatus.bind(null, q.id, "opened")}>Obnoviť</ConfirmButton>
          ) : (
            <ConfirmButton action={setQuoteStatus.bind(null, q.id, "archived")}>Archivovať</ConfirmButton>
          )}
          <ConfirmButton action={deleteQuote.bind(null, q.id)} message="Naozaj vymazať tento dopyt?">
            Vymazať
          </ConfirmButton>
        </div>
      </header>

      <div className="adm-grid adm-grid--quote">
        <section className="card">
          <h2 className="card__title">Požiadavka</h2>
          <dl className="facts">
            <div>
              <dt>Kontakt</dt>
              <dd>{q.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${q.email}`}>{q.email}</a>
              </dd>
            </div>
            <div>
              <dt>Telefón</dt>
              <dd>{q.phone ? <a href={`tel:${q.phone.replace(/\s/g, "")}`}>{q.phone}</a> : "—"}</dd>
            </div>
            <div>
              <dt>Produkt</dt>
              <dd>{productLabel[q.product]}</dd>
            </div>
            <div>
              <dt>Množstvo</dt>
              <dd>{num(q.quantity)} ks</dd>
            </div>
            <div>
              <dt>Dodanie</dt>
              <dd>{q.delivery_location}</dd>
            </div>
            <div>
              <dt>Jazyk</dt>
              <dd>{q.language.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Zákazník</dt>
              <dd>
                {q.customer ? (
                  <Link href={`/admin/customers/${q.customer.id}`}>
                    {q.customer.company_name} ({customerStatusLabel[q.customer.status].toLowerCase()}) →
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          {q.message && (
            <>
              <h3 className="mini">Správa</h3>
              <p className="pre message">{q.message}</p>
            </>
          )}
        </section>

        <QuoteCalculator quote={q} settings={settings} customerId={q.customer?.id ?? null} />
      </div>
    </>
  );
}
