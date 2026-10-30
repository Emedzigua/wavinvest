"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logEmail } from "@/app/admin/actions";

export type Recipient = { email: string; label: string; customer_id: string };

// New email: written here, opened in the mail app, saved to the history
export default function ComposeMail({ recipients, defaultTo = "" }: { recipients: Recipient[]; defaultTo?: string }) {
  const router = useRouter();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const match = recipients.find((r) => r.email === to.trim().toLowerCase());

  return (
    <form
      className="adm-form compose"
      onSubmit={async (e) => {
        e.preventDefault();
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await logEmail({ to, subject, body, customer_id: match?.customer_id });
        setSubject("");
        setBody("");
        router.refresh();
      }}
    >
      <label className="field">
        <span>Komu</span>
        <input type="email" list="mail-recipients" value={to} onChange={(e) => setTo(e.target.value)} required placeholder="e-mail" />
        <datalist id="mail-recipients">
          {recipients.map((r) => (
            <option key={r.email} value={r.email}>
              {r.label}
            </option>
          ))}
        </datalist>
        {match && <small className="muted">{match.label}</small>}
      </label>
      <label className="field">
        <span>Predmet</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </label>
      <label className="field">
        <span>Text</span>
        <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="btn-row">
        <button className="btn btn--dark btn--sm">Otvoriť v e-maile</button>
      </div>
    </form>
  );
}
