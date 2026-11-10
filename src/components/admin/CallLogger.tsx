"use client";

import { useActionState, useState } from "react";
import { logProspectActivity } from "@/app/admin/actions";
import { OUTCOMES, type Outcome } from "@/lib/admin/prospects";

// One tap for what happened on the call, a date when it matters, an optional note
export default function CallLogger({ prospectId }: { prospectId: string }) {
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [kind, setKind] = useState("call");
  const [version, setVersion] = useState(0);
  const [error, action, pending] = useActionState(async (_: string | null, form: FormData) => {
    const result = await logProspectActivity(form);
    if (typeof result === "string") return result;
    setOutcome("");
    setVersion((v) => v + 1);
    return null;
  }, null);
  const needsDate = outcome === "call_back" || outcome === "meeting";

  return (
    <form action={action} className="adm-form" key={version}>
      <input type="hidden" name="prospect_id" value={prospectId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="seg" role="group" aria-label="Typ">
        {[
          ["call", "Hovor"],
          ["visit", "Návšteva"],
          ["note", "Poznámka"],
        ].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {l}
          </button>
        ))}
      </div>
      {kind !== "note" && (
        <div className="outcomes" role="radiogroup" aria-label="Výsledok">
          {(Object.keys(OUTCOMES) as Outcome[]).map((o) => (
            <label key={o} className={`outcome${outcome === o ? " is-on" : ""}`}>
              <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} />
              {OUTCOMES[o].label}
            </label>
          ))}
        </div>
      )}
      {needsDate && (
        <label className="field field--narrow">
          <span>{outcome === "meeting" ? "Dátum stretnutia" : "Zavolať znova"}</span>
          <input type="date" name="next_action" required />
        </label>
      )}
      <label className="field">
        <span>Poznámka</span>
        <textarea name="note" rows={3} placeholder="Kto zdvihol, čo povedal, koľko paliet mesačne…" />
      </label>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark btn--sm" disabled={pending}>
          {pending ? "Ukladám…" : "Uložiť"}
        </button>
      </div>
    </form>
  );
}
