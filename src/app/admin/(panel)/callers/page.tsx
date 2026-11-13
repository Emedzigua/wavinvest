import type { Metadata } from "next";
import Link from "next/link";
import { requireDeveloper } from "@/lib/admin/auth";
import { num } from "@/lib/admin/format";
import { countryLabel } from "@/lib/admin/prospects";
import { uiLangLabel, type UiLang } from "@/lib/caller/texts";
import { callerStats, type CallerAct } from "@/lib/caller/stats";

export const metadata: Metadata = { title: "Volajúci" };
// Admin pages are personal and always rendered per request
export const instant = false;

type CallerRow = { user_id: string; login: string; name: string; countries: string[]; language: UiLang; active: boolean };
export default async function CallersPage() {
  const { supabase } = await requireDeveloper();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data } = await supabase.from("callers").select("*").order("active", { ascending: false }).order("name");
  const callers = (data ?? []) as CallerRow[];
  const { data: actData } = callers.length
    ? await supabase
        .from("prospect_activities")
        .select("user_id, outcome, created_at")
        .in("user_id", callers.map((c) => c.user_id))
        .gte("created_at", monthStart.toISOString())
    : { data: [] };
  const acts = (actData ?? []) as CallerAct[];

  return (
    <>
      <header className="adm-head">
        <div>
          <h1 className="display">Volajúci</h1>
          <p className="muted">Ľudia, ktorí volajú firmám z databázy. Každý vidí iba firmy z krajín, ktoré mu priradíte.</p>
        </div>
        <Link href="/admin/callers/new" className="btn btn--dark">
          + Nový volajúci
        </Link>
      </header>

      {callers.length === 0 ? (
        <section className="card">
          <p>Zatiaľ žiadni volajúci.</p>
          <p className="muted small">
            Vytvorte prvého: dostane prihlasovacie meno a heslo a po prihlásení na /admin uvidí jednoduchú obrazovku s firmami na volanie.
          </p>
        </section>
      ) : (
        <div className="card card--flush scroll-x">
          <table className="tbl tbl--rows">
            <thead>
              <tr>
                <th>Volajúci</th>
                <th>Krajiny</th>
                <th className="num">Dnes</th>
                <th className="num">Hovory (mesiac)</th>
                <th className="num">Zastihnutí</th>
                <th className="num">Záujem</th>
                <th className="num">Stretnutia</th>
              </tr>
            </thead>
            <tbody>
              {callers.map((c) => {
                const s = callerStats(acts, c.user_id);
                return (
                  <tr key={c.user_id} className={c.active ? undefined : "is-muted"}>
                    <td>
                      <Link href={`/admin/callers/${c.user_id}`}>
                        <strong>{c.name}</strong>
                      </Link>
                      <small className="muted">
                        {" "}
                        · {c.login} · {uiLangLabel[c.language]}
                        {!c.active && " · vypnutý"}
                      </small>
                    </td>
                    <td className="muted">{c.countries.map((k) => countryLabel[k] ?? k).join(", ")}</td>
                    <td className="num">{num(s.today)}</td>
                    <td className="num">{num(s.month)}</td>
                    <td className="num">{num(s.reached)}</td>
                    <td className="num">{num(s.interested)}</td>
                    <td className="num">{num(s.meetings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Firmy so záujmom a stretnutiami nájdete v Prospektoch v kartách „Záujem“ a „Stretnutia“, aj s menom kontaktnej osoby a počtom paliet.
      </p>
    </>
  );
}
