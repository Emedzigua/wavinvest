"use client";

import { useState, useTransition } from "react";
import { deleteMeeting, setMeetingStatus } from "@/app/admin/actions";
import type { Meeting } from "@/lib/admin/meetings";

// After the visit: mark it done with a line on how it went, or cancel it
export default function MeetingResult({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const set = (status: Meeting["status"], result?: string) =>
    start(async () => {
      const form = new FormData();
      form.set("id", meeting.id);
      form.set("status", status);
      if (result) form.set("result", result);
      await setMeetingStatus(form);
      setOpen(false);
    });

  if (meeting.status !== "planned") {
    return (
      <div className="btn-row">
        <button type="button" className="meet__link" disabled={pending} onClick={() => set("planned")}>
          Vrátiť medzi naplánované
        </button>
        <button
          type="button"
          className="meet__link"
          disabled={pending}
          onClick={() => window.confirm(`Natrvalo vymazať stretnutie „${meeting.title}“?`) && start(() => deleteMeeting(meeting.id))}
        >
          Vymazať
        </button>
      </div>
    );
  }

  return open ? (
    <form
      className="adm-form meet__done"
      action={(form) => set("done", String(form.get("result") ?? ""))}
    >
      <label className="field">
        <span>Ako stretnutie dopadlo?</span>
        <textarea name="result" rows={2} placeholder="Napr. objednajú 300 paliet mesačne, ponuka do piatku" autoFocus />
      </label>
      <div className="btn-row">
        <button className="btn btn--dark btn--sm" disabled={pending}>
          Uložiť ako hotové
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          Späť
        </button>
      </div>
    </form>
  ) : (
    <div className="btn-row">
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
        Hotovo
      </button>
      <button
        type="button"
        className="meet__link"
        disabled={pending}
        onClick={() => window.confirm(`Zrušiť stretnutie „${meeting.title}“?`) && set("cancelled")}
      >
        Zrušiť stretnutie
      </button>
    </div>
  );
}
