import BackButton from "@/components/admin/BackButton";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { invoiceCustomers } from "@/lib/admin/invoice-data";
import type { Invoice } from "@/lib/admin/types";
import InvoiceForm from "@/components/admin/InvoiceForm";

export const metadata: Metadata = { title: "Upraviť faktúru" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function EditInvoicePage({ params }: PageProps<"/admin/invoices/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, settings, customers] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    getSettings(supabase),
    invoiceCustomers(supabase),
  ]);
  if (!data) notFound();
  const invoice = data as Invoice;

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href={`/admin/invoices/${id}`} label={`Faktúra ${invoice.number}`} />
          <h1 className="display">Upraviť</h1>
        </div>
      </header>
      <InvoiceForm
        customers={customers}
        invoice={invoice}
        vatRate={settings.vat_rate}
        dueDays={settings.billing.due_days}
        currency={invoice.currency}
      />
    </>
  );
}
