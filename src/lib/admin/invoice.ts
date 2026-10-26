import type { Invoice, InvoiceItem } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

export function invoiceTotals(items: InvoiceItem[], vatRate: number, euSupply: boolean) {
  const subtotal = round(items.reduce((s, i) => s + round(i.qty * i.unit_price), 0));
  const vat = euSupply ? 0 : round((subtotal * vatRate) / 100);
  return { subtotal, vat, total: round(subtotal + vat) };
}

// Unpaid invoices past their due date show as overdue
export function invoiceState(i: Pick<Invoice, "status" | "due_date">, today = new Date().toISOString().slice(0, 10)) {
  return i.status === "issued" && i.due_date < today ? "overdue" : i.status;
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
