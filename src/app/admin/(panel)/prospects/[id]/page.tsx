import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/admin/BackButton";
import CallLogger from "@/components/admin/CallLogger";
import ConfirmButton from "@/components/admin/ConfirmButton";
import LockedForm from "@/components/admin/LockedForm";
import MapView from "@/components/admin/MapView";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/data";
import { date, dateTime, num } from "@/lib/admin/format";
import {
  countryLabel,
  depotName,
  OUTCOMES,
  prospectStatusLabel,
  sectorLabel,
  signalLabel,
  statusColor,
  webStatusLabel,
  type Activity,
  type Outcome,
  type Prospect,
} from "@/lib/admin/prospects";
import { convertProspect, saveProspect, setProspectStatus } from "../../../actions";

export const metadata: Metadata = { title: "Prospekt" };
// Admin pages are personal and always rendered per request
export const instant = false;

const kindLabel = { call: "Hovor", visit: "Návšteva", email: "E-mail", note: "Poznámka" };

export default async function ProspectPage({ params }: PageProps<"/admin/prospects/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, { data: acts }, settings] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase.from("prospect_activities").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
    getSettings(supabase),
  ]);
  if (!data) notFound();
  const p = data as Prospect;
  const activities = (acts ?? []) as Activity[];
  const address = [p.street, [p.postal_code, p.city].filter(Boolean).join(" "), countryLabel[p.country]].filter(Boolean).join(", ");
  const search = `https://www.google.com/search?q=${encodeURIComponent(`${p.name} ${p.city ?? countryLabel[p.country]}`)}`;
  const route = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
  const otherPhones = (p.web_phones ?? []).filter((n) => n !== p.phone);
  const emails = [p.email, ...(p.web_emails ?? [])].filter((e, i, all): e is string => !!e && all.indexOf(e) === i);

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/prospects" label="Prospekty" />
          <h1 className="display">{p.name}</h1>
          <p className="adm-head__meta">
            <span className="pill" style={{ color: statusColor[p.status] }}>
              {prospectStatusLabel[p.status]}
            </span>
            <span>{countryLabel[p.country]}</span>
            <span className="muted">{sectorLabel[p.sector] ?? p.sector}</span>
            {p.distance_km != null && (
              <span className="muted">
                {num(p.distance_km)} km z {depotName[p.nearest_depot ?? ""]}
              </span>
            )}
            {p.next_action && <span>Ďalší krok: {date(p.next_action)}</span>}
          </p>
        </div>
        <div className="btn-row">
          {p.customer_id ? (
            <Link href={`/admin/customers/${p.customer_id}`} className="btn btn--dark">
              Zákazník →
            </Link>
          ) : (
            <ConfirmButton
              action={convertProspect.bind(null, p.id)}
              message={`Vytvoriť zákazníka „${p.name}“?`}
              className="btn btn--dark"
            >
              Urobiť zákazníkom
            </ConfirmButton>
          )}
          {p.status !== "not_interested" && !p.customer_id && (
            <ConfirmButton action={setProspectStatus.bind(null, p.id, "not_interested")} className="btn btn--ghost">
              Bez záujmu
            </ConfirmButton>
          )}
        </div>
      </header>

      <div className="adm-grid">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Zavolať</h2>
            <a href={search} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Hľadať firmu ↗
            </a>
          </div>
          <dl className="call-facts">
            <div>
              <dt>Telefón</dt>
              <dd>
                {p.phone ? <a href={tel(p.phone)}>{p.phone}</a> : <span className="muted">Doplňte po vyhľadaní</span>}
                {otherPhones.length > 0 && (
                  <span className="also">
                    {otherPhones.map((n) => (
                      <a key={n} href={tel(n)}>
                        {n}
                      </a>
                    ))}
                  </span>
                )}
              </dd>
            </div>
            {emails.length > 0 && (
              <div>
                <dt>E-mail</dt>
                <dd className="also also--stack">
                  {emails.map((e) => (
                    <a key={e} href={`mailto:${e}`}>
                      {e}
                    </a>
                  ))}
                </dd>
              </div>
            )}
            {p.contact_name && (
              <div>
                <dt>Kontakt</dt>
                <dd>
                  {p.contact_name}
                  {p.contact_role && <span className="muted"> · {p.contact_role}</span>}
                  {p.contact_phone && (
                    <>
                      {" · "}
                      <a href={`tel:${p.contact_phone.replace(/\s/g, "")}`}>{p.contact_phone}</a>
                    </>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt>Web</dt>
              <dd>
                {p.website ? (
                  <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer">
                    {p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
            </div>
            {p.web_checked_at && (
              <div>
                <dt>Z webu</dt>
                <dd>
                  {p.web_status && webStatusLabel[p.web_status] ? (
                    <span className="muted">{webStatusLabel[p.web_status]}</span>
                  ) : (
                    <span className="tags">
                      {(p.web_signals ?? []).map((s) => (
                        <span key={s} className={`tag${s === "palety" ? " tag--strong" : ""}`}>
                          {signalLabel[s] ?? s}
                        </span>
                      ))}
                    </span>
                  )}
                  {p.web_contact_url && (
                    <>
                      {" "}
                      <a href={p.web_contact_url} target="_blank" rel="noreferrer">
                        Kontakty na webe ↗
                      </a>
                    </>
                  )}
                  <small className="muted"> · čítané {date(p.web_checked_at)}</small>
                </dd>
              </div>
            )}
            <div>
              <dt>Adresa</dt>
              <dd>
                {address}{" "}
                <a href={route} target="_blank" rel="noreferrer">
                  Trasa ↗
                </a>
              </dd>
            </div>
          </dl>
          <h3 className="mini">Zaznamenať</h3>
          <CallLogger prospectId={p.id} />
        </section>

        <section className="card card--flush">
          <MapView
            pins={[{ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sub: address, color: statusColor[p.status] }]}
            depots={settings.depots}
            height={460}
          />
        </section>
      </div>

      <div className="adm-grid">
        <section className="card">
          <h2 className="card__title">História</h2>
          {activities.length === 0 ? (
            <p className="muted">Zatiaľ žiadny kontakt.</p>
          ) : (
            <ul className="timeline">
              {activities.map((a) => (
                <li key={a.id}>
                  <time className="muted">{dateTime(a.created_at)}</time>
                  <span>
                    <strong>{kindLabel[a.kind]}</strong>
                    {a.outcome && ` · ${OUTCOMES[a.outcome as Outcome]?.label ?? a.outcome}`}
                  </span>
                  {a.note && <p className="pre">{a.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <LockedForm action={saveProspect} title="Údaje">
            <input type="hidden" name="id" value={p.id} />
            <div className="form__row">
              <Field name="contact_name" label="Kontaktná osoba" initial={p.contact_name} />
              <Field name="contact_role" label="Pozícia" initial={p.contact_role} placeholder="nákup, sklad, logistika" />
            </div>
            <div className="form__row">
              <Field name="contact_phone" label="Telefón osoby" initial={p.contact_phone} />
              <Field name="contact_email" label="E-mail osoby" initial={p.contact_email} />
            </div>
            <div className="form__row form__row--3">
              <Field name="phone" label="Telefón firmy" initial={p.phone} />
              <Field name="email" label="E-mail firmy" initial={p.email} />
              <Field name="website" label="Web" initial={p.website} />
            </div>
            <div className="form__row form__row--3">
              <Field name="street" label="Ulica" initial={p.street} />
              <Field name="postal_code" label="PSČ" initial={p.postal_code} />
              <Field name="city" label="Mesto" initial={p.city} />
            </div>
            <div className="form__row">
              <Field name="next_action" label="Ďalší krok" initial={p.next_action} type="date" />
            </div>
            <label className="field">
              <span>Poznámky</span>
              <textarea name="notes" rows={3} defaultValue={p.notes ?? ""} />
            </label>
          </LockedForm>
        </section>
      </div>
    </>
  );
}

function Field({
  name,
  label,
  initial,
  ...input
}: { name: string; label: string; initial: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} defaultValue={initial ?? ""} {...input} />
    </label>
  );
}
