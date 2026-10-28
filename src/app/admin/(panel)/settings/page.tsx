import type { Metadata } from "next";
import type { ReactNode } from "react";
import BackButton from "@/components/admin/BackButton";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { money, num } from "@/lib/admin/format";
import { saveBilling, saveDepots, savePrices, saveTiers } from "../../actions";
import LockedForm from "@/components/admin/LockedForm";
import TierRows from "@/components/admin/TierRows";
import DepotRows from "@/components/admin/DepotRows";
import PasswordForm from "@/components/admin/PasswordForm";
import PushToggle from "@/components/admin/PushToggle";

export const metadata: Metadata = { title: "Nastavenia" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();
  const [s, { data: push }, { count: devices }] = await Promise.all([
    getSettings(supabase),
    supabase.rpc("push_config_admin"),
    supabase.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);
  const b = s.billing;
  const cur = s.currency;
  const billingMissing = [!b.ico && "IČO", !b.iban && "IBAN"].filter(Boolean).join(" a ");

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin" label="Prehľad" />
          <h1 className="display">Nastavenia</h1>
        </div>
      </header>

      <div className="acc-list">
        <Section title="Ceny" summary={`EPAL ${money(s.price_epal, cur)} · Nadstavec ${money(s.price_collars, cur)} · DPH ${num(s.vat_rate)} %`}>
          <LockedForm action={savePrices}>
            <div className="form__row form__row--4">
              <label className="field">
                <span>EPAL paleta / ks</span>
                <input name="price_epal" type="number" step="0.01" min={0} defaultValue={s.price_epal} required />
              </label>
              <label className="field">
                <span>Nadstavec / ks</span>
                <input name="price_collars" type="number" step="0.01" min={0} defaultValue={s.price_collars} required />
              </label>
              <label className="field">
                <span>DPH (%)</span>
                <input name="vat_rate" type="number" step="0.01" min={0} max={100} defaultValue={s.vat_rate} required />
              </label>
              <label className="field">
                <span>Mena</span>
                <select name="currency" defaultValue={s.currency}>
                  <option value="EUR">EUR</option>
                  <option value="CZK">CZK</option>
                  <option value="PLN">PLN</option>
                </select>
              </label>
            </div>
            <p className="muted small">Ceny bez DPH a bez dopravy.</p>
          </LockedForm>
        </Section>

        <Section
          title="Množstevné zľavy"
          summary={
            s.discount_tiers.length
              ? s.discount_tiers.map((t) => `od ${num(t.min_qty)} ks −${num(t.percent)} %`).join(" · ")
              : "Žiadne"
          }
        >
          <LockedForm action={saveTiers}>
            <TierRows key={JSON.stringify(s.discount_tiers)} tiers={s.discount_tiers} />
          </LockedForm>
        </Section>

        <Section title="Sklady a doprava" summary={s.depots.map((d) => d.name).join(" · ")}>
          <LockedForm action={saveDepots}>
            <DepotRows key={JSON.stringify(s.depots)} depots={s.depots} />
            <label className="field field--narrow">
              <span>Návrh dopravy za km ({cur})</span>
              <input name="transport_per_km" type="number" step="0.01" min={0} defaultValue={s.transport_per_km} />
            </label>
          </LockedForm>
        </Section>

        <Section
          title="Fakturačné údaje"
          summary={billingMissing ? `Chýba ${billingMissing}` : `${b.name} · IČO ${b.ico}`}
          warn={!!billingMissing}
        >
          <LockedForm action={saveBilling}>
            <div className="form__row">
              <Field name="name" label="Obchodné meno" value={b.name} required />
              <Field name="register" label="Zápis v registri" value={b.register} placeholder="OR OS Košice, odd. Sro, vl. č. …" />
            </div>
            <div className="form__row form__row--4">
              <Field name="street" label="Ulica" value={b.street} />
              <Field name="postal_code" label="PSČ" value={b.postal_code} />
              <Field name="city" label="Mesto" value={b.city} />
              <Field name="country" label="Krajina" value={b.country} />
            </div>
            <div className="form__row form__row--3">
              <Field name="ico" label="IČO" value={b.ico} />
              <Field name="dic" label="DIČ" value={b.dic} />
              <Field name="ic_dph" label="IČ DPH" value={b.ic_dph} />
            </div>
            <div className="form__row form__row--4">
              <Field name="iban" label="IBAN" value={b.iban} />
              <Field name="swift" label="SWIFT" value={b.swift} />
              <Field name="bank" label="Banka" value={b.bank} />
              <Field name="due_days" label="Splatnosť (dni)" value={String(b.due_days)} type="number" />
            </div>
            <div className="form__row form__row--3">
              <Field name="email" label="E-mail" value={b.email} />
              <Field name="phone" label="Telefón" value={b.phone} />
              <Field name="note" label="Poznámka pod faktúrou" value={b.note} />
            </div>
          </LockedForm>
        </Section>

        <Section
          title="Upozornenia na telefón"
          summary={devices ? `Zapnuté na ${devices} ${devices === 1 ? "zariadení" : "zariadeniach"}` : "Vypnuté"}
        >
          <p className="muted small">Pri novom dopyte z webu príde upozornenie na telefón alebo počítač.</p>
          {push?.public_key ? <PushToggle publicKey={push.public_key} /> : <p className="muted">Nie je nastavené.</p>}
        </Section>

        <Section title="Heslo" summary={user.email}>
          <PasswordForm />
        </Section>
      </div>
    </>
  );
}

function Section({ title, summary, warn, children }: { title: string; summary: string; warn?: boolean; children: ReactNode }) {
  return (
    <details className="acc">
      <summary>
        <span className="acc__title">{title}</span>
        <span className={`acc__summary${warn ? " is-warn" : ""}`}>{summary}</span>
        <span className="row__icon" aria-hidden />
      </summary>
      <div className="acc__body">{children}</div>
    </details>
  );
}

function Field({
  name,
  label,
  value,
  ...input
}: { name: string; label: string; value: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} defaultValue={value} {...input} />
    </label>
  );
}
