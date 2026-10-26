"use client";

import { useState } from "react";
import type { Depot } from "@/lib/admin/types";

export default function DepotRows({ depots }: { depots: Depot[] }) {
  const [rows, setRows] = useState(() => depots.map((d) => ({ ...d, key: d.id })));
  const add = () => setRows((r) => [...r, { key: String(Date.now()), id: "", name: "", address: "", lat: 0, lng: 0 }]);
  const remove = (key: string) => setRows((r) => r.filter((x) => x.key !== key));

  return (
    <div className="rows-edit">
      {rows.map((r) => (
        <div key={r.key} className="rows-edit__row rows-edit__row--depot">
          <input type="hidden" name="depot_id" value={r.id} />
          <label className="field">
            <span>Sklad</span>
            <input name="depot_name" defaultValue={r.name} required />
          </label>
          <label className="field">
            <span>Adresa</span>
            <input name="depot_address" defaultValue={r.address} required />
          </label>
          <button type="button" className="btn btn--ghost btn--sm rows-edit__remove" onClick={() => remove(r.key)}>
            Odstrániť
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm rows-edit__add" onClick={add}>
        + Pridať sklad
      </button>
    </div>
  );
}
