import type { Contract } from "./types";

// Contracts count towards revenue between their start and (optional) end date
export function isRunning(c: Pick<Contract, "start_date" | "end_date">, today = new Date()) {
  const day = today.toISOString().slice(0, 10);
  return c.start_date <= day && (!c.end_date || c.end_date >= day);
}

export function monthlyValue(c: Pick<Contract, "monthly_qty" | "unit_price">) {
  return c.monthly_qty * Number(c.unit_price);
}

function isoWeekday(d: Date) {
  return ((d.getUTCDay() + 6) % 7) + 1;
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - isoWeekday(t));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Whether a delivery for this contract falls on the given day
export function deliversOn(c: Contract, d: Date) {
  if (!isRunning(c, d)) return false;
  if (c.schedule === "monthly") {
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return d.getUTCDate() === Math.min(c.month_day ?? 1, last);
  }
  if (!c.weekdays.includes(isoWeekday(d))) return false;
  if (c.schedule === "biweekly") {
    return (isoWeek(d) - isoWeek(new Date(c.start_date))) % 2 === 0;
  }
  return true;
}

// Rough pieces per delivery, from the monthly volume
export function perDelivery(c: Contract) {
  const perMonth =
    c.schedule === "monthly" ? 1 : (c.weekdays.length || 1) * (c.schedule === "weekly" ? 52 / 12 : 26 / 12);
  return Math.round(c.monthly_qty / perMonth);
}

// Monday … Sunday of the week containing `today`, as UTC dates
export function weekDays(today = new Date()) {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  base.setUTCDate(base.getUTCDate() - (isoWeekday(base) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return d;
  });
}

export type MonthPoint = { key: string; label: string; current: boolean; epal: number; collars: number; epalQty: number; collarsQty: number };

const monthNames = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];

// Revenue and pieces per month for the last `count` months (ending this month).
// A contract that runs only part of a month counts for that share of the month.
export function monthlyHistory(contracts: Contract[], count = 12, today = new Date()): MonthPoint[] {
  const day = 86400000;
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (count - 1 - i), 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const days = end.getUTCDate();
    const point: MonthPoint = {
      key: start.toISOString().slice(0, 7),
      label: `${monthNames[start.getUTCMonth()]} ${String(start.getUTCFullYear()).slice(2)}`,
      current: i === count - 1,
      epal: 0,
      collars: 0,
      epalQty: 0,
      collarsQty: 0,
    };
    for (const c of contracts) {
      const from = Math.max(start.getTime(), Date.parse(c.start_date));
      const to = Math.min(end.getTime(), c.end_date ? Date.parse(c.end_date) : Infinity);
      if (to < from) continue;
      const share = (Math.round((to - from) / day) + 1) / days;
      point[c.product] += monthlyValue(c) * share;
      point[c.product === "epal" ? "epalQty" : "collarsQty"] += c.monthly_qty * share;
    }
    return point;
  });
}

// Monday of the week containing the given ISO date (or today)
export function weekStart(iso?: string) {
  const d = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date();
  return weekDays(d)[0];
}
