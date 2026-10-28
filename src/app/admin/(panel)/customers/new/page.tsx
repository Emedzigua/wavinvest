import BackButton from "@/components/admin/BackButton";
import type { Metadata } from "next";
import { saveCustomer } from "../../../actions";
import CustomerFields from "@/components/admin/CustomerFields";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Nový zákazník" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function NewCustomerPage() {
  const { supabase } = await requireAdmin();
  const settings = await getSettings(supabase);
  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/customers" label="Zákazníci" />
          <h1 className="display">Nový zákazník</h1>
        </div>
      </header>
      <form action={async (form) => { "use server"; await saveCustomer(form); }} className="card adm-form">
        <CustomerFields depots={settings.depots} />
        <h2 className="card__title">Kontaktná osoba</h2>
        <div className="form__row">
          <label className="field">
            <span>Meno a priezvisko</span>
            <input name="contact_name" />
          </label>
          <label className="field">
            <span>Pozícia</span>
            <input name="contact_role" placeholder="napr. nákup, sklad" />
          </label>
        </div>
        <div className="form__row">
          <label className="field">
            <span>Telefón</span>
            <input name="contact_phone" type="tel" />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="contact_email" type="email" />
          </label>
        </div>
        <div className="btn-row">
          <button className="btn btn--dark">Uložiť zákazníka</button>
        </div>
      </form>
    </>
  );
}
