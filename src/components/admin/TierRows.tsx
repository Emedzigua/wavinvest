"use client";

import { useState } from "react";
import type { DiscountTier } from "@/lib/admin/types";

export default function TierRows({ tiers }: { tiers: DiscountTier[] }) {
  const [rows, setRows] = useState(() =>
    tiers.map((t, i) => ({ key: i, min_qty: String(t.min_qty), percent: String(t.percent) })),
  );
  const add = () => setRows((r) => [...r, { key: Date.now(), min_qty: "", percent: "" }]);
  const remove = (key: number) => setRows((r) => r.filter((x) => x.key !== key));

  return (
    <div className="rows-edit">
      {rows.length === 0 && <p className="muted small">Žiadne množstevné zľavy.</p>}
      {rows.map((r) => (
        <div key={r.key} className="rows-edit__row">
          <label className="field">
            <span>Od (ks)</span>
            <input name="tier_min" type="number" min={1} defaultValue={r.min_qty} required />
          </label>
          <label className="field">
            <span>Zľava (%)</span>
            <input name="tier_pct" type="number" step="0.1" min={0.1} max={99} defaultValue={r.percent} required />
          </label>
          <button type="button" className="btn btn--ghost btn--sm rows-edit__remove" onClick={() => remove(r.key)}>
            Odstrániť
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm rows-edit__add" onClick={add}>
        + Pridať zľavu
      </button>
    </div>
  );
}
