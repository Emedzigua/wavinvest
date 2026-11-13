"use client";

import Link from "next/link";
import { useActionState } from "react";
import { bookProspectMeeting } from "@/app/admin/actions";

// Books a meeting for the owner straight from a company's page
export default function BookMeeting({ prospectId, today, tomorrow }: { prospectId: string; today: string; tomorrow: string }) {
  const [state, action, pending] = useActionState(bookProspectMeeting, null);
  if (state === "ok") {
    return (
      <p className="muted">
        Stretnutie je v kalendári. <Link href="/admin/meetings">Otvoriť Stretnutia →</Link>
      </p>
    );
  }
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="prospect_id" value={prospectId} />
      <div className="form__row">
        <label className="field">
          <span>Dátum</span>
          <input type="date" name="day" min={today} defaultValue={tomorrow} required />
        </label>
        <label className="field">
          <span>Čas</span>
          <input type="time" name="time" defaultValue="10:00" required />
        </label>
      </div>
      <label className="field">
        <span>Poznámka pre majiteľa</span>
        <input name="note" placeholder="Napr. chcú vzorku palety, 300 ks mesačne" maxLength={500} />
      </label>
      {state && (
        <p className="adm-error" role="alert">
          {state}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark btn--sm" disabled={pending}>
          {pending ? "Ukladám…" : "Naplánovať stretnutie"}
        </button>
      </div>
    </form>
  );
}
