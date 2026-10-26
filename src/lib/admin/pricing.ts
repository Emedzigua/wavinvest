import type { Product, Settings } from "./types";

export type Line = { product: Product; qty: number };

export type Calculation = {
  lines: (Line & { unitPrice: number; total: number })[];
  qty: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  goods: number;
  transport: number;
  net: number;
  vat: number;
  gross: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function unitPrice(product: Product, s: Settings) {
  return Number(product === "epal" ? s.price_epal : s.price_collars);
}

// Highest tier whose minimum the total quantity reaches
export function discountFor(qty: number, s: Settings) {
  return s.discount_tiers
    .filter((t) => qty >= t.min_qty)
    .reduce((best, t) => Math.max(best, Number(t.percent)), 0);
}

// The discount is based on the total pieces and applies to the goods only;
// transport is added on top before VAT.
export function calculate(input: Line[], s: Settings, transport = 0): Calculation {
  const lines = input
    .filter((l) => l.qty > 0)
    .map((l) => {
      const price = unitPrice(l.product, s);
      return { ...l, unitPrice: price, total: round(price * l.qty) };
    });
  const qty = lines.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = round(lines.reduce((sum, l) => sum + l.total, 0));
  const discountPercent = discountFor(qty, s);
  const discount = round((subtotal * discountPercent) / 100);
  const goods = round(subtotal - discount);
  const net = round(goods + transport);
  const vat = round((net * Number(s.vat_rate)) / 100);
  return { lines, qty, subtotal, discountPercent, discount, goods, transport, net, vat, gross: round(net + vat) };
}
