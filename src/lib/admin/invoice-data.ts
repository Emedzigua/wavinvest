import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceCustomer } from "@/components/admin/InvoiceForm";
import { isRunning } from "./schedule";
import type { Contract, Customer } from "./types";

const lineName = { epal: "Nové EPAL palety 1200 × 800 mm", collars: "Nové paletové nadstavce" } as const;

// Customers for the invoice form, each with lines suggested from its running contracts
export async function invoiceCustomers(supabase: SupabaseClient): Promise<InvoiceCustomer[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, company_name, street, postal_code, city, country, ico, dic, ic_dph, contracts(*)")
    .order("company_name");
  const month = new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(new Date());
  return ((data ?? []) as (Customer & { contracts: Contract[] })[]).map((c) => ({
    id: c.id,
    name: c.company_name,
    street: c.street ?? "",
    postal_code: c.postal_code ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
    ico: c.ico ?? "",
    dic: c.dic ?? "",
    ic_dph: c.ic_dph ?? "",
    lines: c.contracts
      .filter((k) => isRunning(k))
      .map((k) => ({ description: `${lineName[k.product]} – ${month}`, qty: k.monthly_qty, unit: "ks", unit_price: Number(k.unit_price) })),
  }));
}
