import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/admin/BackButton";
import CallerFields from "@/components/admin/CallerFields";
import ConfirmButton from "@/components/admin/ConfirmButton";
import LockedForm from "@/components/admin/LockedForm";
import { requireDeveloper } from "@/lib/admin/auth";
import { dateTime, num } from "@/lib/admin/format";
import { OUTCOMES, type Outcome } from "@/lib/admin/prospects";
import type { UiLang } from "@/lib/caller/texts";
import { setCallerActive, setCallerPassword, updateCaller } from "../../../actions";
import { callerStats } from "@/lib/caller/stats";

export const metadata: Metadata = { title: "Volajúci" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function CallerPage({ params }: PageProps<"/admin/callers/[id]">) {
  const { id } = await params;
  const { supabase } = await requireDeveloper();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [{ data: caller }, { data: monthActs }, { data: recent }] = await Promise.all([
    supabase.from("callers").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("prospect_activities").select("user_id, outcome, created_at").eq("user_id", id).gte("created_at", monthStart.toISOString()),
    supabase
      .from("prospect_activities")
      .select("id, outcome, note, created_at, prospect:prospects(id, name, country)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!caller) notFound();
  const s = callerStats(monthActs ?? [], id);
  const calls = (recent ?? []) as unknown as {
    id: string;
    outcome: string | null;
    note: string | null;
    created_at: string;
    prospect: { id: string; name: string; country: string } | null;
  }[];

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/callers" label="Volajúci" />
          <h1 className="display">{caller.name}</h1>
          <p className="adm-head__meta">
            <span>Prihlasovacie meno: {caller.login}</span>
            {!caller.active && <span className="pill">Vypnutý</span>}
          </p>
        </div>
        <ConfirmButton
          action={setCallerActive.bind(null, id, !caller.active)}
          message={caller.active ? `Vypnúť ${caller.name}? Nebude sa môcť prihlásiť.` : undefined}
          className="btn btn--ghost"
        >
          {caller.active ? "Vypnúť prístup" : "Zapnúť prístup"}
        </ConfirmButton>
      </header>

      <dl className="stats-row card">
        {[
          ["Dnes", s.today],
          ["Hovory tento mesiac", s.month],
          ["Zastihnutí", s.reached],
          ["Záujem", s.interested],
          ["Stretnutia", s.meetings],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{num(value as number)}</dd>
          </div>
        ))}
      </dl>

      <div className="adm-grid">
        <section className="card">
          <LockedForm action={updateCaller} title="Údaje">
            <input type="hidden" name="id" value={id} />
            <CallerFields name={caller.name} countries={caller.countries} language={caller.language as UiLang} />
          </LockedForm>
        </section>
        <section className="card">
          <LockedForm action={setCallerPassword} title="Nové heslo" saveLabel="Nastaviť heslo">
            <input type="hidden" name="id" value={id} />
            <label className="field">
              <span>Nové heslo (aspoň 8 znakov)</span>
              <input name="password" minLength={8} required autoComplete="new-password" />
            </label>
          </LockedForm>
        </section>
      </div>

      <section className="card">
        <h2 className="card__title">Posledné hovory</h2>
        {calls.length === 0 ? (
          <p className="muted">Zatiaľ žiadne hovory.</p>
        ) : (
          <ul className="timeline">
            {calls.map((a) => (
              <li key={a.id}>
                <span className="muted small">{dateTime(a.created_at)}</span>{" "}
                {a.prospect ? <Link href={`/admin/prospects/${a.prospect.id}`}>{a.prospect.name}</Link> : "—"}
                {" · "}
                <strong>{a.outcome ? (OUTCOMES[a.outcome as Outcome]?.label ?? a.outcome) : "Poznámka"}</strong>
                {a.note && <span className="muted"> · {a.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
