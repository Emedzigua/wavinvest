"use client";

import { useActionState, useMemo, useState } from "react";
import { saveInvoice } from "@/app/admin/actions";
import { addDays, invoiceTotals } from "@/lib/admin/invoice";
import type { Invoice, InvoiceItem, Party } from "@/lib/admin/types";

export type InvoiceCustomer = Party & { id: string; lines: InvoiceItem[] };

const SLOVAKIA = /^(sk|slovensko|slovakia|slovenská republika)$/i;
const emptyParty: Party = { name: "", street: "", postal_code: "", city: "", country: "", ico: "", dic: "", ic_dph: "" };
const emptyLine = (): InvoiceItem => ({ description: "", qty: 1, unit: "ks", unit_price: 0 });
const today = () => new Date().toISOString().slice(0, 10);

// Goods for a VAT payer outside Slovakia go without VAT (§ 43)
const isEu = (p: Party) => !!p.ic_dph && !!p.country && !SLOVAKIA.test(p.country.trim());

export default function InvoiceForm({
  customers,
  invoice,
  defaultCustomer,
  vatRate,
  dueDays,
  currency,
}: {
  customers: InvoiceCustomer[];
  invoice?: Invoice;
  defaultCustomer?: string;
  vatRate: number;
  dueDays: number;
  currency: string;
}) {
  const initial = customers.find((c) => c.id === (invoice?.customer_id ?? defaultCustomer));
  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? initial?.id ?? "");
  const [buyer, setBuyer] = useState<Party>(invoice?.buyer ?? initial ?? emptyParty);
  const [editBuyer, setEditBuyer] = useState(!invoice && !initial);
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items ?? (initial?.lines.length ? initial.lines : [emptyLine()]),
  );
  const [issue, setIssue] = useState(invoice?.issue_date ?? today());
  const [due, setDue] = useState(invoice?.due_date ?? addDays(today(), dueDays));
  const [vat, setVat] = useState(String(invoice?.vat_rate ?? vatRate));
  const [eu, setEu] = useState(invoice?.eu_supply ?? (initial ? isEu(initial) : false));
  const [error, action, pending] = useActionState(async (_: string | null, form: FormData) => {
    return (await saveInvoice(form)) ?? null;
  }, null);

  const totals = useMemo(() => invoiceTotals(items, Number(vat) || 0, eu), [items, vat, eu]);
  const money = (v: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency }).format(v);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) {
      setBuyer(emptyParty);
      setEditBuyer(true);
      return;
    }
    setBuyer(c);
    setEu(isEu(c));
    setEditBuyer(false);
    const untouched = items.every((i) => !i.description);
    if (untouched && c.lines.length) setItems(c.lines);
  }

  const setItem = (i: number, patch: Partial<InvoiceItem>) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <form action={action} className="inv-form">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <input type="hidden" name="customer_id" value={customerId} />

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Odberateľ</h2>
          {!editBuyer && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditBuyer(true)}>
              Upraviť
            </button>
          )}
        </div>
        <label className="field">
          <span>Zákazník</span>
          <select value={customerId} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">— iný odberateľ —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {editBuyer ? (
          <div className="adm-form">
            <div className="form__row">
              <BuyerField k="name" label="Obchodné meno *" buyer={buyer} setBuyer={setBuyer} required />
              <BuyerField k="street" label="Ulica" buyer={buyer} setBuyer={setBuyer} />
            </div>
            <div className="form__row form__row--3">
              <BuyerField k="postal_code" label="PSČ" buyer={buyer} setBuyer={setBuyer} />
              <BuyerField k="city" label="Mesto" buyer={buyer} setBuyer={setBuyer} />
              <BuyerField k="country" label="Krajina" buyer={buyer} setBuyer={setBuyer} />
            </div>
            <div className="form__row form__row--3">
              <BuyerField k="ico" label="IČO" buyer={buyer} setBuyer={setBuyer} />
              <BuyerField k="dic" label="DIČ" buyer={buyer} setBuyer={setBuyer} />
              <BuyerField k="ic_dph" label="IČ DPH" buyer={buyer} setBuyer={setBuyer} />
            </div>
          </div>
        ) : (
          <>
            {(Object.keys(emptyParty) as (keyof Party)[]).map((k) => (
              <input key={k} type="hidden" name={`buyer_${k}`} value={buyer[k] ?? ""} />
            ))}
            <p className="buyer">
              <strong>{buyer.name}</strong>
              <span className="muted">
                {[buyer.street, [buyer.postal_code, buyer.city].filter(Boolean).join(" "), buyer.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              <span className="muted">
                {[buyer.ico && `IČO ${buyer.ico}`, buyer.dic && `DIČ ${buyer.dic}`, buyer.ic_dph && `IČ DPH ${buyer.ic_dph}`]
                  .filter(Boolean)
                  .join(" · ") || "Bez IČO"}
              </span>
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Položky</h2>
        <div className="lines">
          <div className="lines__row lines__head" aria-hidden>
            <span>Popis</span>
            <span>Množstvo</span>
            <span>MJ</span>
            <span>Cena / MJ</span>
            <span>Spolu</span>
            <span />
          </div>
          {items.map((it, i) => (
            <div key={i} className="lines__row">
              <input
                name="item_description"
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                placeholder="Popis položky"
                aria-label="Popis"
                required
              />
              <input
                name="item_qty"
                type="number"
                step="any"
                min={0}
                value={it.qty}
                onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                aria-label="Množstvo"
              />
              <input
                name="item_unit"
                value={it.unit}
                onChange={(e) => setItem(i, { unit: e.target.value })}
                aria-label="Merná jednotka"
              />
              <input
                name="item_price"
                type="number"
                step="0.01"
                value={it.unit_price}
                onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                aria-label="Cena za jednotku"
              />
              <span className="lines__total">{money(it.qty * it.unit_price)}</span>
              <button
                type="button"
                className="lines__remove"
                onClick={() => setItems((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [emptyLine()]))}
                aria-label="Odstrániť položku"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm rows-edit__add" onClick={() => setItems((l) => [...l, emptyLine()])}>
          + Položka
        </button>
      </section>

      <section className="card inv-form__bottom">
        <div className="adm-form">
          <div className="form__row form__row--3">
            <label className="field">
              <span>Vystavená</span>
              <input
                name="issue_date"
                type="date"
                value={issue}
                onChange={(e) => {
                  setIssue(e.target.value);
                  setDue(addDays(e.target.value, dueDays));
                }}
                required
              />
            </label>
            <label className="field">
              <span>Dodanie</span>
              <input name="delivery_date" type="date" defaultValue={invoice?.delivery_date ?? issue} key={invoice ? "d" : issue} />
            </label>
            <label className="field">
              <span>Splatnosť</span>
              <input name="due_date" type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
            </label>
          </div>
          <div className="form__row">
            <label className="field">
              <span>DPH (%)</span>
              <input name="vat_rate" type="number" step="0.01" value={eu ? "0" : vat} onChange={(e) => setVat(e.target.value)} disabled={eu} />
              {eu && <input type="hidden" name="vat_rate" value={vat} />}
            </label>
            <label className="toggle">
              <input type="checkbox" name="eu_supply" checked={eu} onChange={(e) => setEu(e.target.checked)} />
              <span>Dodanie do EÚ bez DPH</span>
            </label>
          </div>
          <label className="field">
            <span>Poznámka</span>
            <input name="note" defaultValue={invoice?.note ?? ""} placeholder="napr. číslo objednávky" />
          </label>
        </div>

        <div className="inv-sum">
          <div>
            <span>Základ</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div>
            <span>DPH</span>
            <span>{money(totals.vat)}</span>
          </div>
          <div className="inv-sum__total">
            <span>Spolu</span>
            <strong>{money(totals.total)}</strong>
          </div>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--dark btn--block" disabled={pending}>
            {pending ? "Ukladám…" : invoice ? "Uložiť faktúru" : "Vystaviť faktúru"}
          </button>
        </div>
      </section>
    </form>
  );
}

function BuyerField({
  k,
  label,
  buyer,
  setBuyer,
  required,
}: {
  k: keyof Party;
  label: string;
  buyer: Party;
  setBuyer: (p: Party) => void;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={`buyer_${k}`} value={buyer[k] ?? ""} onChange={(e) => setBuyer({ ...buyer, [k]: e.target.value })} required={required} />
    </label>
  );
}
