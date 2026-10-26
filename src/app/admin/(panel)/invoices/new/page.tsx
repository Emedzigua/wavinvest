import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { invoiceCustomers } from "@/lib/admin/invoice-data";
import InvoiceForm from "@/components/admin/InvoiceForm";

export const metadata: Metadata = { title: "Nová faktúra" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function NewInvoicePage({ searchParams }: PageProps<"/admin/invoices/new">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [settings, customers] = await Promise.all([getSettings(supabase), invoiceCustomers(supabase)]);
  const incomplete = !settings.billing.iban || !settings.billing.ico;

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="label">
            <Link href="/admin/invoices">Faktúry</Link>
          </p>
          <h1 className="display">Nová faktúra</h1>
        </div>
      </header>
      {incomplete && (
        <p className="alert alert--warn">
          <span>
            Doplňte IČO a IBAN vo <Link href="/admin/settings">fakturačných údajoch</Link>.
          </span>
        </p>
      )}
      <InvoiceForm
        customers={customers}
        defaultCustomer={typeof sp.customer === "string" ? sp.customer : undefined}
        vatRate={settings.vat_rate}
        dueDays={settings.billing.due_days}
        currency={settings.currency}
      />
    </>
  );
}
