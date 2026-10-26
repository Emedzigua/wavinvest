"use client";

import { useState } from "react";
import { saveContract } from "@/app/admin/actions";
import { productLabel, scheduleLabel, weekdayShort } from "@/lib/admin/labels";
import type { Contract, Schedule } from "@/lib/admin/types";

export default function ContractForm({
  customerId,
  contract,
  defaults,
  quoteId,
  submitLabel = "Uložiť zmluvu",
}: {
  customerId: string;
  contract?: Contract;
  defaults?: { product?: string; qty?: string; price?: string };
  quoteId?: string;
  submitLabel?: string;
}) {
  const [schedule, setSchedule] = useState<Schedule>(contract?.schedule ?? "weekly");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={saveContract} className="adm-form">
      <input type="hidden" name="customer_id" value={customerId} />
      {contract && <input type="hidden" name="id" value={contract.id} />}
      {quoteId && <input type="hidden" name="quote_id" value={quoteId} />}

      <div className="form__row form__row--3">
        <label className="field">
          <span>Produkt</span>
          <select name="product" defaultValue={contract?.product ?? (defaults?.product === "collars" ? "collars" : "epal")}>
            <option value="epal">{productLabel.epal}</option>
            <option value="collars">{productLabel.collars}</option>
          </select>
        </label>
        <label className="field">
          <span>Ks / mesiac</span>
          <input name="monthly_qty" type="number" min={1} required defaultValue={contract?.monthly_qty ?? defaults?.qty} />
        </label>
        <label className="field">
          <span>Cena / ks bez DPH</span>
          <input
            name="unit_price"
            type="number"
            step="0.01"
            min={0}
            required
            defaultValue={contract?.unit_price ?? defaults?.price}
          />
        </label>
      </div>

      <div className="form__row form__row--3">
        <label className="field">
          <span>Dodávky</span>
          <select name="schedule" value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)}>
            {Object.entries(scheduleLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Platná od</span>
          <input name="start_date" type="date" required defaultValue={contract?.start_date ?? today} />
        </label>
        <label className="field">
          <span>Platná do</span>
          <input name="end_date" type="date" defaultValue={contract?.end_date ?? ""} />
        </label>
      </div>

      {schedule === "monthly" ? (
        <label className="field field--narrow">
          <span>Deň v mesiaci</span>
          <input name="month_day" type="number" min={1} max={31} defaultValue={contract?.month_day ?? 1} />
        </label>
      ) : (
        <fieldset className="days">
          <legend>Dni dodania</legend>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <label key={d}>
              <input type="checkbox" name="weekdays" value={d} defaultChecked={contract?.weekdays.includes(d)} />
              <span>{weekdayShort[d]}</span>
            </label>
          ))}
        </fieldset>
      )}

      {contract && (
        <label className="field field--narrow">
          <span>Zmena platí od</span>
          <input name="effective_from" type="date" defaultValue={today} title="Do tohto dňa ostanú v grafe pôvodné hodnoty" />
        </label>
      )}

      <label className="field">
        <span>Poznámka</span>
        <input name="notes" defaultValue={contract?.notes ?? ""} placeholder="napr. rampa 3" />
      </label>

      <div className="btn-row">
        <button className="btn btn--dark btn--sm">{submitLabel}</button>
      </div>
    </form>
  );
}
