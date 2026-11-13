"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMeeting } from "@/app/admin/actions";
import { dayKey, timeOf, type Meeting } from "@/lib/admin/meetings";

// A meeting typed in by hand, or an existing one being changed
export default function MeetingForm({ meeting, day, cancelHref }: { meeting?: Meeting; day: string; cancelHref: string }) {
  const [error, action, pending] = useActionState(saveMeeting, null);
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="id" value={meeting?.id ?? ""} />
      <div className="form__row">
        <label className="field">
          <span>Firma / názov</span>
          <input name="title" defaultValue={meeting?.title ?? ""} required maxLength={200} />
        </label>
        <label className="field">
          <span>Adresa</span>
          <input name="address" defaultValue={meeting?.address ?? ""} placeholder="Ulica, mesto, krajina" maxLength={300} />
        </label>
      </div>
      <div className="form__row form__row--3">
        <label className="field">
          <span>Dátum</span>
          <input type="date" name="day" defaultValue={meeting ? dayKey(meeting.starts_at) : day} required />
        </label>
        <label className="field">
          <span>Čas</span>
          <input type="time" name="time" defaultValue={meeting ? timeOf(meeting.starts_at) : "10:00"} required />
        </label>
        <label className="field">
          <span>Dĺžka (min)</span>
          <input type="number" name="duration" min={15} max={480} step={15} defaultValue={meeting?.duration_min ?? 60} />
        </label>
      </div>
      <div className="form__row">
        <label className="field">
          <span>Kontaktná osoba</span>
          <input name="contact_name" defaultValue={meeting?.contact_name ?? ""} maxLength={120} />
        </label>
        <label className="field">
          <span>Telefón</span>
          <input name="contact_phone" type="tel" defaultValue={meeting?.contact_phone ?? ""} maxLength={50} />
        </label>
      </div>
      <label className="field">
        <span>Poznámka</span>
        <textarea name="notes" rows={2} defaultValue={meeting?.notes ?? ""} maxLength={2000} />
      </label>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark" disabled={pending}>
          {pending ? "Ukladám…" : meeting ? "Uložiť zmeny" : "Pridať stretnutie"}
        </button>
        <Link href={cancelHref} className="btn btn--ghost">
          Zrušiť
        </Link>
      </div>
    </form>
  );
}
