export const quarterOf = (iso: string) => Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1;

export const quarterMonths = ["", "január – marec", "apríl – jún", "júl – september", "október – december"];

// Tax totals of non-cancelled invoices
export function taxTotals(list: { status: string; subtotal: number; vat: number; total: number }[]) {
  const live = list.filter((i) => i.status !== "cancelled");
  const sum = (k: "subtotal" | "vat" | "total") => live.reduce((s, i) => s + Number(i[k]), 0);
  return { base: sum("subtotal"), vat: sum("vat"), total: sum("total"), count: live.length };
}
