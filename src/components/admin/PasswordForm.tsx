"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/admin/actions";

export default function PasswordForm() {
  const [result, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="adm-form adm-form--narrow">
      <label className="field">
        <span>Aktuálne heslo</span>
        <input name="current" type="password" autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>Nové heslo</span>
        <input name="next" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label className="field">
        <span>Nové heslo znova</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      {result === "ok" ? (
        <p className="adm-ok" role="status">Heslo bolo zmenené.</p>
      ) : (
        result && <p className="adm-error" role="alert">{result}</p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark btn--sm" disabled={pending}>
          Zmeniť heslo
        </button>
      </div>
    </form>
  );
}
