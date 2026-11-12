"use client";

import { useActionState } from "react";
import { createCaller } from "@/app/admin/actions";
import CallerFields from "./CallerFields";

export default function NewCallerForm({ suggestedPassword }: { suggestedPassword: string }) {
  const [error, action, pending] = useActionState(createCaller, null);
  return (
    <form action={action} className="adm-form card">
      <CallerFields />
      <div className="form__row">
        <label className="field">
          <span>Prihlasovacie meno</span>
          <input name="login" required pattern="[a-z0-9._\-]{2,32}" autoCapitalize="none" spellCheck={false} placeholder="napr. anna" />
        </label>
        <label className="field">
          <span>Heslo</span>
          <input name="password" defaultValue={suggestedPassword} minLength={8} required autoComplete="new-password" />
        </label>
      </div>
      <p className="muted small">
        Malé písmená bez diakritiky. Volajúci sa prihlási na stránke /admin týmto menom a heslom. Heslo si poznačte a odovzdajte mu ho.
      </p>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark" disabled={pending}>
          {pending ? "Vytváram…" : "Vytvoriť volajúceho"}
        </button>
      </div>
    </form>
  );
}
