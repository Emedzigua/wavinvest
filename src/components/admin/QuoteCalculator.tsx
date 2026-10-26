"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markReplied } from "@/app/admin/actions";
import { calculate } from "@/lib/admin/pricing";
import { quoteEmail } from "@/lib/admin/email-templates";
import { money, num } from "@/lib/admin/format";
import { productLabel } from "@/lib/admin/labels";
import type { Quote, Settings } from "@/lib/admin/types";
import { localeNames, locales } from "@/i18n/config";

export default function QuoteCalculator({
  quote,
  settings,
  customerId,
}: {
  quote: Quote;
  settings: Settings;
  customerId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [epal, setEpal] = useState(quote.product === "collars" ? 0 : quote.quantity);
  const [collars, setCollars] = useState(quote.product === "epal" ? 0 : quote.quantity);

  // Nearest warehouse first
  const nearest = useMemo(() => {
    const known = settings.depots.filter((d) => quote.distances?.[d.id]);
    return known.sort((a, b) => quote.distances![a.id].km - quote.distances![b.id].km)[0] ?? settings.depots[0];
  }, [settings.depots, quote.distances]);
  const [depotId, setDepotId] = useState(nearest?.id ?? "");
  const km = quote.distances?.[depotId]?.km ?? null;
  const suggestion = km != null && settings.transport_per_km > 0 ? Math.round(km * settings.transport_per_km * 100) / 100 : null;

  const [transport, setTransport] = useState("");
  const transportValue = Number(transport.replace(",", "."));
  const transportMissing = transport.trim() === "" || !Number.isFinite(transportValue) || transportValue < 0;

  const [language, setLanguage] = useState(quote.language);
  const [edited, setEdited] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const calc = useMemo(
    () =>
      calculate(
        [
          { product: "epal", qty: epal },
          { product: "collars", qty: collars },
        ],
        settings,
        transportMissing ? 0 : transportValue,
      ),
    [epal, collars, settings, transportMissing, transportValue],
  );
  const generated = useMemo(
    () =>
      quoteEmail({
        language,
        name: quote.name,
        location: quote.delivery_location,
        calc,
        currency: settings.currency,
        vatRate: settings.vat_rate,
        transportMissing,
      }),
    [language, quote, calc, settings, transportMissing],
  );
  const email = edited ?? generated;
  const cur = settings.currency;
  const noPrices = settings.price_epal === 0 && settings.price_collars === 0;

  function openMail() {
    if (transportMissing && !window.confirm("Cena dopravy nie je vyplnená. Otvoriť e-mail aj tak?")) return;
    const href = `mailto:${quote.email}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = href;
    start(() => markReplied(quote.id));
  }

  async function copy() {
    await navigator.clipboard.writeText(email.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Opens the contract form; saving it moves this request to the archive
  function won() {
    start(() => {
      if (!customerId) return;
      const main = calc.lines[0];
      const params = new URLSearchParams({ contract: "new", quote: quote.id });
      if (main) {
        params.set("product", main.product);
        params.set("qty", String(main.qty));
        params.set("price", (main.unitPrice * (1 - calc.discountPercent / 100)).toFixed(2));
      }
      router.push(`/admin/customers/${customerId}?${params}#contracts`);
    });
  }

  return (
    <section className="card calc">
      <div className="card__head">
        <h2 className="card__title">Kalkulácia</h2>
        <Link href="/admin/settings" className="btn btn--ghost btn--sm">
          Cenník
        </Link>
      </div>
      {noPrices && <p className="alert alert--bad">Cenník nie je vyplnený — najprv zadajte ceny v Nastaveniach.</p>}

      <div className="form__row">
        <label className="field">
          <span>{productLabel.epal} (ks)</span>
          <input type="number" min={0} value={epal} onChange={(e) => setEpal(Math.max(0, Number(e.target.value)))} />
        </label>
        <label className="field">
          <span>{productLabel.collars} (ks)</span>
          <input type="number" min={0} value={collars} onChange={(e) => setCollars(Math.max(0, Number(e.target.value)))} />
        </label>
      </div>

      <div className="form__row">
        <label className="field">
          <span>Sklad</span>
          <select value={depotId} onChange={(e) => setDepotId(e.target.value)}>
            {settings.depots.map((d) => {
              const x = quote.distances?.[d.id];
              return (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {x ? ` — ${num(x.km)} km${x.road ? "" : " (vzdušne)"}` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label className={`field${transportMissing ? " field--attention" : ""}`}>
          <span>Doprava ({cur})</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={transport}
            placeholder="Doplniť"
            onChange={(e) => setTransport(e.target.value)}
          />
        </label>
      </div>

      {transportMissing ? (
        <div className="alert alert--warn" role="status">
          <span>
            <strong>Doplňte cenu dopravy</strong>
            {km != null && <span className="muted"> · {num(km)} km</span>}
          </span>
          {suggestion != null && (
            <button type="button" className="btn btn--dark btn--sm" onClick={() => setTransport(String(suggestion))}>
              Použiť {money(suggestion, cur)}
            </button>
          )}
        </div>
      ) : null}

      <table className="tbl calc__tbl">
        <tbody>
          {calc.lines.map((l) => (
            <tr key={l.product}>
              <td>
                {productLabel[l.product]}
                <small className="muted">
                  {" "}
                  {num(l.qty)} × {money(l.unitPrice, cur)}
                </small>
              </td>
              <td className="num">{money(l.total, cur)}</td>
            </tr>
          ))}
          {calc.discountPercent > 0 && (
            <tr>
              <td>
                Zľava {num(calc.discountPercent)} %
              </td>
              <td className="num">−{money(calc.discount, cur)}</td>
            </tr>
          )}
          <tr className={transportMissing ? "is-missing" : ""}>
            <td>
              Doprava{km != null && <small className="muted"> · {num(km)} km</small>}
            </td>
            <td className="num">{transportMissing ? "—" : money(calc.transport, cur)}</td>
          </tr>
          <tr className="calc__net">
            <td>Cena bez DPH</td>
            <td className="num">{money(calc.net, cur)}</td>
          </tr>
          <tr>
            <td>DPH {num(settings.vat_rate)} %</td>
            <td className="num">{money(calc.vat, cur)}</td>
          </tr>
          <tr className="calc__gross">
            <td>Cena s DPH</td>
            <td className="num">{money(calc.gross, cur)}</td>
          </tr>
        </tbody>
      </table>

      <div className="calc__mail">
        <div className="card__head">
          <h3 className="mini">Odpoveď</h3>
          <label className="field field--inline">
            <span>Jazyk</span>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setEdited(null);
              }}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Predmet</span>
          <input value={email.subject} onChange={(e) => setEdited({ ...email, subject: e.target.value })} />
        </label>
        <label className="field">
          <span>Text</span>
          <textarea rows={18} value={email.body} onChange={(e) => setEdited({ ...email, body: e.target.value })} />
        </label>
        {edited && (
          <button type="button" className="linkish" onClick={() => setEdited(null)}>
            Obnoviť text podľa kalkulácie
          </button>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--dark" onClick={openMail}>
            Otvoriť v e-maile
          </button>
          <button type="button" className="btn btn--ghost" onClick={copy}>
            {copied ? "Skopírované ✓" : "Kopírovať text"}
          </button>
        </div>
      </div>

      {quote.status !== "archived" && customerId && (
        <div className="calc__won">
          <p>Zákazník súhlasil?</p>
          <button type="button" className="btn btn--dark btn--sm" onClick={won} disabled={pending}>
            Vytvoriť zmluvu
          </button>
        </div>
      )}
    </section>
  );
}
