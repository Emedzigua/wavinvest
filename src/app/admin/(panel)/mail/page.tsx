import Link from "next/link";
import type { Metadata } from "next";
import BackButton from "@/components/admin/BackButton";
import ComposeMail, { type Recipient } from "@/components/admin/ComposeMail";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Pošta" };
// Admin pages are personal and always rendered per request
export const instant = false;

type Email = {
  id: string;
  direction: "out" | "in";
  to_email: string | null;
  from_email: string | null;
  subject: string;
  body: string;
  created_at: string;
  customer: { id: string; company_name: string } | null;
  quote_id: string | null;
  invoice_id: string | null;
};

export default async function MailPage({ searchParams }: PageProps<"/admin/mail">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("emails")
    .select("id, direction, to_email, from_email, subject, body, created_at, quote_id, invoice_id, customer:customers(id, company_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) {
    const safe = q.replace(/[%,()]/g, "");
    query = query.or(`subject.ilike.%${safe}%,to_email.ilike.%${safe}%,body.ilike.%${safe}%`);
  }
  const [{ data }, { data: contacts }] = await Promise.all([
    query,
    supabase.from("contacts").select("email, name, customer:customers(id, company_name)").not("email", "is", null),
  ]);
  const emails = (data ?? []) as unknown as Email[];
  const recipients: Recipient[] = ((contacts ?? []) as unknown as { email: string; name: string; customer: { id: string; company_name: string } }[]).map(
    (c) => ({ email: c.email, label: `${c.name} · ${c.customer.company_name}`, customer_id: c.customer.id }),
  );

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin" label="Prehľad" />
          <h1 className="display">Pošta</h1>
        </div>
        <span className="pill">Schránka nepripojená</span>
      </header>

      <div className="mail">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Odoslané z administrácie</h2>
            <form className="search">
              <input name="q" defaultValue={q} placeholder="Hľadať…" aria-label="Hľadať v e-mailoch" />
            </form>
          </div>
          {emails.length === 0 ? (
            <p className="muted">
              {q ? "Nič sa nenašlo." : "Zatiaľ prázdne. E-maily z dopytov, faktúr a z tejto stránky sa uložia sem."}
            </p>
          ) : (
            <ul className="mail__list">
              {emails.map((m) => (
                <li key={m.id}>
                  <details>
                    <summary>
                      <span className="mail__who">
                        <strong>{m.customer?.company_name ?? m.to_email}</strong>
                        <span className="muted">{m.subject || "(bez predmetu)"}</span>
                      </span>
                      <time className="muted">{dateTime(m.created_at)}</time>
                    </summary>
                    <div className="mail__body">
                      <p className="muted small">Komu: {m.to_email}</p>
                      <p className="pre">{m.body}</p>
                      <p className="btn-row">
                        {m.customer && (
                          <Link href={`/admin/customers/${m.customer.id}`} className="btn btn--ghost btn--sm">
                            Zákazník
                          </Link>
                        )}
                        {m.quote_id && (
                          <Link href={`/admin/quotes/${m.quote_id}`} className="btn btn--ghost btn--sm">
                            Dopyt
                          </Link>
                        )}
                        {m.invoice_id && (
                          <Link href={`/admin/invoices/${m.invoice_id}`} className="btn btn--ghost btn--sm">
                            Faktúra
                          </Link>
                        )}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="card">
          <h2 className="card__title">Nový e-mail</h2>
          <ComposeMail recipients={recipients} defaultTo={typeof sp.to === "string" ? sp.to : ""} />
          <p className="muted small">
            Otvorí sa vo vašej e-mailovej aplikácii. Po pripojení schránky info@wavinvest.eu sa budú e-maily posielať a prijímať
            priamo tu.
          </p>
        </aside>
      </div>
    </>
  );
}
