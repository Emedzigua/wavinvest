"use client";

import { useActionState, useState, useTransition } from "react";
import { logCall, skipCompany } from "@/app/admin/call/actions";
import { describe, ui, type CallCompany, type Outcome, type Script, type UiLang } from "@/lib/caller/texts";

const OUTCOMES: Outcome[] = ["no_answer", "call_back", "interested", "meeting", "not_interested", "wrong_number"];
const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");

// One company at a time: who to call, what to say, how it went
export default function CallScreen({
  company: c,
  lang,
  callerName,
  script,
}: {
  company: CallCompany;
  lang: UiLang;
  callerName: string;
  script: Script;
}) {
  const t = ui[lang];
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, action, saving] = useActionState(logCall, null);
  const [skipping, startSkip] = useTransition();
  const otherPhones = (c.web_phones ?? []).filter((n) => n !== c.phone).slice(0, 3);
  const reached = outcome === "interested" || outcome === "meeting" || outcome === "call_back";
  const needsDate = outcome === "call_back" || outcome === "meeting";
  const today = new Date().toISOString().slice(0, 10);
  const errorText = error === "outcome" ? t.pickOutcome : error === "date" ? t.needDate : error ? t.failed : null;

  return (
    <div className="call">
      <section className="call__company">
        <p className="call__meta">
          {t.countries[c.country]}
          {c.call_attempts > 0 && <span> · {t.attempts(c.call_attempts)}</span>}
        </p>
        <h1 className="call__name">{c.name}</h1>
        {c.phone && (
          <a href={tel(c.phone)} className="call__phone">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
              <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
            </svg>
            {c.phone}
          </a>
        )}
        {otherPhones.length > 0 && (
          <p className="call__more">
            {t.otherNumbers}:{" "}
            {otherPhones.map((n) => (
              <a key={n} href={tel(n)}>
                {n}
              </a>
            ))}
          </p>
        )}

        <h2 className="call__h">{t.about}</h2>
        {describe(c, lang).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {c.website && (
          <p>
            {t.website}:{" "}
            <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
              {host(c.website)}
            </a>
          </p>
        )}

        {(c.contact_name || c.contact_phone || c.contact_email) && (
          <>
            <h2 className="call__h">{t.contact}</h2>
            <p>
              {c.contact_name}
              {c.contact_role && ` · ${c.contact_role}`}
            </p>
            {c.contact_phone && (
              <p>
                <a href={tel(c.contact_phone)}>{c.contact_phone}</a>
              </p>
            )}
            {c.contact_email && <p>{c.contact_email}</p>}
          </>
        )}

        {c.history.length > 0 && (
          <>
            <h2 className="call__h">{t.history}</h2>
            <ul className="call__history">
              {c.history.map((h) => (
                <li key={h.at}>
                  <span>{new Date(h.at).toLocaleDateString(lang === "cs" ? "cs-CZ" : lang)}</span>{" "}
                  <strong>{h.outcome ? (t.outcomes[h.outcome as Outcome] ?? h.outcome) : "—"}</strong>
                  {h.note && <span> · {h.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="call__script" aria-label={t.script}>
        <h2 className="call__h">{t.script}</h2>
        {script.steps.map((step) => (
          <div key={step.title} className="call__step">
            <h3>{step.title}</h3>
            {step.lines.map((line) => (
              <p key={line}>„{line.replace("{caller}", callerName)}“</p>
            ))}
          </div>
        ))}
        <details className="call__facts">
          <summary>{script.facts.title}</summary>
          <ul>
            {script.facts.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </section>

      <form action={action} className="call__result">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="outcome" value={outcome ?? ""} />
        <h2 className="call__h">{t.result}</h2>
        <div className="call__outcomes" role="radiogroup" aria-label={t.result}>
          {OUTCOMES.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={outcome === o}
              className={`call__outcome call__outcome--${o}`}
              onClick={() => setOutcome(o)}
            >
              {t.outcomes[o]}
            </button>
          ))}
        </div>
        {outcome && <p className="call__hint">{t.outcomeHints[outcome]}</p>}

        {needsDate && (
          <label className="field">
            <span>{outcome === "meeting" ? t.meetingDate : t.callBackDate}</span>
            <input type="date" name="next_action" min={today} required />
          </label>
        )}

        {reached && (
          <div className="call__fields">
            <label className="field">
              <span>{t.contactName}</span>
              <input name="contact_name" defaultValue={c.contact_name ?? ""} autoComplete="off" />
            </label>
            <label className="field">
              <span>{t.contactRole}</span>
              <input name="contact_role" defaultValue={c.contact_role ?? ""} autoComplete="off" />
            </label>
            <label className="field">
              <span>{t.contactPhone}</span>
              <input name="contact_phone" type="tel" defaultValue={c.contact_phone ?? ""} autoComplete="off" />
            </label>
            <label className="field">
              <span>{t.contactEmail}</span>
              <input name="contact_email" type="email" defaultValue={c.contact_email ?? ""} autoComplete="off" />
            </label>
            <label className="field">
              <span>{t.pallets}</span>
              <input name="pallets" type="number" min={1} inputMode="numeric" defaultValue={c.pallets_per_month ?? ""} />
            </label>
            <label className="field">
              <span>{t.supplier}</span>
              <input name="supplier" defaultValue={c.current_supplier ?? ""} autoComplete="off" />
            </label>
            <label className="call__consent">
              <input type="checkbox" name="email_consent" />
              <span>{t.consent}</span>
            </label>
          </div>
        )}

        {outcome && (
          <label className="field">
            <span>{t.note}</span>
            <textarea name="note" rows={3} placeholder={t.notePlaceholder} />
          </label>
        )}

        {errorText && (
          <p className="adm-error" role="alert">
            {errorText}
          </p>
        )}
        <button className="btn btn--dark call__save" disabled={saving || !outcome}>
          {saving ? t.saving : t.save}
        </button>
        <button
          type="button"
          className="call__skip"
          disabled={skipping}
          onClick={() => startSkip(() => skipCompany(c.id))}
        >
          {t.skip}
        </button>
      </form>
    </div>
  );
}
