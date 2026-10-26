import type { Customer, Depot } from "@/lib/admin/types";
import { customerStatusLabel } from "@/lib/admin/labels";

export default function CustomerFields({ c, depots }: { c?: Customer; depots: Depot[] }) {
  return (
    <>
      <div className="form__row">
        <label className="field">
          <span>Názov firmy *</span>
          <input name="company_name" defaultValue={c?.company_name} required />
        </label>
        <label className="field">
          <span>Stav</span>
          <select name="status" defaultValue={c?.status ?? "active"}>
            {Object.entries(customerStatusLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Ulica a číslo</span>
        <input name="street" defaultValue={c?.street ?? ""} autoComplete="off" />
      </label>
      <div className="form__row form__row--3">
        <label className="field">
          <span>PSČ</span>
          <input name="postal_code" defaultValue={c?.postal_code ?? ""} />
        </label>
        <label className="field">
          <span>Mesto</span>
          <input name="city" defaultValue={c?.city ?? ""} />
        </label>
        <label className="field">
          <span>Krajina</span>
          <input name="country" defaultValue={c?.country ?? ""} placeholder="Slovensko" />
        </label>
      </div>
      <label className="field">
        <span>Expedičný sklad</span>
        <select name="depot" defaultValue={c?.depot ?? depots[0]?.id}>
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Poznámky</span>
        <textarea name="notes" rows={3} defaultValue={c?.notes ?? ""} />
      </label>
    </>
  );
}
