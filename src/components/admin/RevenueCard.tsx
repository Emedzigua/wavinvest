"use client";

import { useState } from "react";
import type { MonthPoint } from "@/lib/admin/schedule";

const H = 140;

// One headline number with a bar per month underneath. Hovering a bar shows
// that month in the headline; the current month is the highlighted bar.
export default function RevenueCard({
  data,
  currency,
  footer,
}: {
  data: MonthPoint[];
  currency: string;
  footer: { label: string; value: string }[];
}) {
  const [active, setActive] = useState(data.length - 1);
  const total = (d: MonthPoint) => d.epal + d.collars;
  const money = (v: number) =>
    new Intl.NumberFormat("sk-SK", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  const point = data[active];
  const prev = data[active - 1];
  const change = prev && total(prev) > 0 ? ((total(point) - total(prev)) / total(prev)) * 100 : null;
  const max = Math.max(...data.map(total), 1);

  return (
    <section className="card rev">
      <div className="rev__head">
        <h2 className="card__title">Obrat</h2>
        <span className="rev__period">{point.current ? "Tento mesiac" : point.label} · bez DPH</span>
      </div>

      <div className="rev__value">
        <strong className="fit">{money(total(point))}</strong>
        {change != null && Math.abs(change) >= 0.05 && (
          <span className={`rev__delta ${change >= 0 ? "is-up" : "is-down"}`}>
            {change >= 0 ? "+" : "−"}
            {Math.abs(change).toLocaleString("sk-SK", { maximumFractionDigits: 1 })} % vs {prev.label.split(" ")[0]}
          </span>
        )}
      </div>

      <div className="rev__bars" style={{ height: H }} onMouseLeave={() => setActive(data.length - 1)}>
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            className={`rev__bar${d.current ? " is-current" : ""}${i === active ? " is-active" : ""}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            aria-label={`${d.label}: ${money(total(d))}`}
          >
            <span style={{ height: `${Math.max((total(d) / max) * 100, total(d) > 0 ? 3 : 0)}%` }} />
            <small>{d.label.split(" ")[0]}</small>
          </button>
        ))}
      </div>

      <dl className="rev__foot">
        {footer.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
