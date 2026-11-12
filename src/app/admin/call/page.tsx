import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import CallScreen from "@/components/caller/CallScreen";
import { requireCaller } from "@/lib/admin/auth";
import { callLangOf, scripts, ui, type CallCompany } from "@/lib/caller/texts";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Volania" };
// Personal and always fresh
export const instant = false;

export default async function CallPage() {
  const { supabase, caller } = await requireCaller();
  const [{ data: company }, { data: today }] = await Promise.all([supabase.rpc("caller_next"), supabase.rpc("caller_today")]);
  const t = ui[caller.language];
  const c = company as CallCompany | null;

  return (
    <div className="caller" lang={caller.language === "cs" ? "cs" : caller.language}>
      <header className="caller__bar">
        <Logo on="dark" />
        <span className="caller__who">
          <strong>{caller.name}</strong>
          <span>{t.today(today ?? 0)}</span>
        </span>
        <form action={signOut}>
          <button className="btn btn--ghost-light btn--sm">{t.logout}</button>
        </form>
      </header>
      <main className="caller__main">
        {c ? (
          <CallScreen
            key={c.id}
            company={c}
            lang={caller.language}
            callerName={caller.name.split(" ")[0]}
            script={scripts[callLangOf[c.country] ?? "en"]}
          />
        ) : (
          <section className="caller__empty">
            <h1>{t.empty}</h1>
            <p>{t.emptyHint}</p>
            <Link href="/admin/call" className="btn btn--dark">
              {t.refresh}
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
