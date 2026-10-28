import Link from "next/link";
import BackButton from "@/components/admin/BackButton";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { date } from "@/lib/admin/format";
import { invoiceState } from "@/lib/admin/invoice";
import { invoiceStatusLabel } from "@/lib/admin/labels";
import type { Invoice } from "@/lib/admin/types";
import { setInvoiceStatus } from "../../../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";

export const metadata: Metadata = { title: "Faktúra" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function InvoicePage({ params }: PageProps<"/admin/invoices/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("invoices").select("*, customer:customers(contacts(email))").eq("id", id).maybeSingle();
  if (!data) notFound();
  const inv = data as Invoice & { customer: { contacts: { email: string | null }[] } | null };
  const state = invoiceState(inv);
  const money = (v: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: inv.currency }).format(v);

  const to = inv.customer?.contacts.find((c) => c.email)?.email ?? "";
  const mail = `mailto:${to}?subject=${encodeURIComponent(`Faktúra ${inv.number} – ${inv.seller.name}`)}&body=${encodeURIComponent(
    `Dobrý deň,\n\nv prílohe posielame faktúru č. ${inv.number} na sumu ${money(Number(inv.total))} so splatnosťou ${date(inv.due_date)}.\n\nS pozdravom\n${inv.seller.name}`,
  )}`;

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/invoices" label="Faktúry" />
          <h1 className="display">{inv.number}</h1>
          <p className="adm-head__meta">
            <span className={`pill pill--i-${state}`}>{invoiceStatusLabel[state]}</span>
            <span>{inv.buyer.name}</span>
            <strong>{money(Number(inv.total))}</strong>
          </p>
        </div>
        <div className="btn-row">
          <a href={`/admin/invoices/${inv.id}/pdf?download`} className="btn btn--dark">
            Stiahnuť PDF
          </a>
          <a href={mail} className="btn btn--ghost">
            E-mail
          </a>
        </div>
      </header>

      <div className="inv-view">
        <iframe src={`/admin/invoices/${inv.id}/pdf`} title={`Faktúra ${inv.number}`} className="inv-view__pdf" />

        <aside className="card inv-view__side">
          <dl className="facts facts--single">
            <div>
              <dt>Vystavená</dt>
              <dd>{date(inv.issue_date)}</dd>
            </div>
            <div>
              <dt>Splatná</dt>
              <dd>{date(inv.due_date)}</dd>
            </div>
            {inv.paid_at && (
              <div>
                <dt>Uhradená</dt>
                <dd>{date(inv.paid_at)}</dd>
              </div>
            )}
            {inv.customer_id && (
              <div>
                <dt>Zákazník</dt>
                <dd>
                  <Link href={`/admin/customers/${inv.customer_id}`}>{inv.buyer.name} →</Link>
                </dd>
              </div>
            )}
          </dl>

          <div className="inv-view__actions">
            {inv.status === "issued" && (
              <ConfirmButton action={setInvoiceStatus.bind(null, inv.id, "paid")} className="btn btn--dark btn--block">
                Označiť ako uhradenú
              </ConfirmButton>
            )}
            {inv.status === "paid" && (
              <ConfirmButton action={setInvoiceStatus.bind(null, inv.id, "issued")} className="btn btn--ghost btn--block">
                Zrušiť úhradu
              </ConfirmButton>
            )}
            {inv.status !== "cancelled" ? (
              <>
                <Link href={`/admin/invoices/${inv.id}/edit`} className="btn btn--ghost btn--block">
                  Upraviť
                </Link>
                <ConfirmButton
                  action={setInvoiceStatus.bind(null, inv.id, "cancelled")}
                  message={`Stornovať faktúru ${inv.number}?`}
                  className="btn btn--ghost btn--block"
                >
                  Stornovať
                </ConfirmButton>
              </>
            ) : (
              <ConfirmButton action={setInvoiceStatus.bind(null, inv.id, "issued")} className="btn btn--ghost btn--block">
                Obnoviť
              </ConfirmButton>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
