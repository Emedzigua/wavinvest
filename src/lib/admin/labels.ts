import type { CustomerStatus, Product, QuoteStatus, Schedule } from "./types";

export const productLabel: Record<Product | "mixed", string> = {
  epal: "EPAL paleta",
  collars: "Paletový nadstavec",
  mixed: "Palety + nadstavce",
};

export const customerStatusLabel: Record<CustomerStatus, string> = {
  active: "Aktívny",
  inactive: "Neaktívny",
  lost: "Stratený",
};

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  new: "Nový",
  replied: "Odpovedané",
  won: "Získaný",
  lost: "Nezískaný",
};

export const scheduleLabel: Record<Schedule, string> = {
  weekly: "Týždenne",
  biweekly: "Každé 2 týždne",
  monthly: "Mesačne",
};

// ISO weekday numbers: 1 = Monday … 7 = Sunday
export const weekdayShort = ["", "Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
export const weekdayLong = ["", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];

export function scheduleText(c: { schedule: Schedule; weekdays: number[]; month_day: number | null }) {
  if (c.schedule === "monthly") return `${scheduleLabel.monthly} · ${c.month_day ?? 1}.`;
  const days = c.weekdays.map((d) => weekdayShort[d]).join(", ") || "—";
  return `${scheduleLabel[c.schedule]} · ${days}`;
}
