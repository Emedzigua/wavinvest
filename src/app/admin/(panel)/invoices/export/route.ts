import { requireAdmin } from "@/lib/admin/auth";
import { quarterOf } from "@/lib/admin/quarters";
import type { Invoice } from "@/lib/admin/types";

// CSV for the accountant: one row per invoice of the chosen year / quarter.
// Semicolons and a BOM so Excel opens it correctly with Slovak characters.
export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const params = new URL(request.url).searchParams;
  const year = Number(params.get("year")) || new Date().getUTCFullYear();
  const quarter = Number(params.get("q")) || 0;

  const { data } = await supabase
    .from("invoices")
    .select("*")
    .gte("issue_date", `${year}-01-01`)
    .lte("issue_date", `${year}-12-31`)
    .order("number");
  const list = ((data ?? []) as Invoice[]).filter((i) => !quarter || quarterOf(i.issue_date) === quarter);

  const n = (v: number) => Number(v).toFixed(2).replace(".", ",");
  const cell = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const status = { issued: "Neuhradená", paid: "Uhradená", cancelled: "Stornovaná" };
  const rows = [
    ["Číslo", "Vystavená", "Dodanie", "Splatnosť", "Odberateľ", "IČO", "DIČ", "IČ DPH", "Krajina", "Základ", "DPH %", "DPH", "Spolu", "Mena", "Dodanie do EÚ", "Stav", "Uhradená"],
    ...list.map((i) => [
      i.number,
      i.issue_date,
      i.delivery_date,
      i.due_date,
      i.buyer.name,
      i.buyer.ico,
      i.buyer.dic,
      i.buyer.ic_dph,
      i.buyer.country,
      n(i.subtotal),
      i.eu_supply ? "0" : n(i.vat_rate),
      n(i.vat),
      n(i.total),
      i.currency,
      i.eu_supply ? "áno" : "nie",
      status[i.status],
      i.paid_at ?? "",
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const name = `faktury-${year}${quarter ? `-Q${quarter}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
