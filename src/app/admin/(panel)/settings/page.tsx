import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { saveBilling, saveSettings } from "../../actions";
import LockedForm from "@/components/admin/LockedForm";
import TierRows from "@/components/admin/TierRows";
import DepotRows from "@/components/admin/DepotRows";
import PasswordForm from "@/components/admin/PasswordForm";

export const metadata: Metadata = { title: "Nastavenia" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();
  const s = await getSettings(supabase);
  const b = s.billing;

  return (
    <>
      <header className="adm-head">
        <h1 className="display">Nastavenia</h1>
      </header>

      <section className="card">
        <LockedForm action={saveSettings} title="Cenník">
          <div className="form-section">
            <h3 className="mini">Cena za kus · bez DPH a dopravy</h3>
            <div className="form__row form__row--4">
              <label className="field">
                <span>EPAL paleta</span>
                <input name="price_epal" type="number" step="0.01" min={0} defaultValue={s.price_epal} required />
              </label>
              <label className="field">
                <span>Paletový nadstavec</span>
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
          </div>

          <div className="form-section">
            <h3 className="mini">Množstevné zľavy · podľa počtu kusov v ponuke</h3>
            <TierRows key={JSON.stringify(s.discount_tiers)} tiers={s.discount_tiers} />
          </div>

          <div className="form-section">
            <h3 className="mini">Sklady · od nich sa počítajú kilometre</h3>
            <DepotRows key={JSON.stringify(s.depots)} depots={s.depots} />
            <label className="field field--narrow">
              <span>Návrh dopravy za km ({s.currency})</span>
              <input name="transport_per_km" type="number" step="0.01" min={0} defaultValue={s.transport_per_km} />
            </label>
          </div>
        </LockedForm>
      </section>

      <section className="card">
        <LockedForm action={saveBilling} title="Fakturačné údaje">
          <div className="form-section">
            <h3 className="mini">Firma</h3>
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
          </div>
          <div className="form-section">
            <h3 className="mini">Platba</h3>
            <div className="form__row form__row--4">
              <Field name="iban" label="IBAN" value={b.iban} />
              <Field name="swift" label="SWIFT" value={b.swift} />
              <Field name="bank" label="Banka" value={b.bank} />
              <Field name="due_days" label="Splatnosť (dni)" value={String(b.due_days)} type="number" />
            </div>
          </div>
          <div className="form-section">
            <h3 className="mini">Kontakt na faktúre</h3>
            <div className="form__row form__row--3">
              <Field name="email" label="E-mail" value={b.email} />
              <Field name="phone" label="Telefón" value={b.phone} />
              <Field name="note" label="Poznámka pod faktúrou" value={b.note} />
            </div>
          </div>
        </LockedForm>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Heslo</h2>
          <span className="muted small">{user.email}</span>
        </div>
        <PasswordForm />
      </section>
    </>
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
