"use client";

import { useState, useTransition, type ReactNode } from "react";

// Shows saved values read-only; fields unlock only after clicking "Upraviť",
// so nothing changes by accident. The action may return an error message.
export default function LockedForm({
  action,
  title,
  children,
  saveLabel = "Uložiť zmeny",
}: {
  action: (form: FormData) => Promise<string | void>;
  title?: ReactNode;
  children: ReactNode;
  saveLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Remounting the fields restores the saved values (also rows added in edit mode)
  const [version, setVersion] = useState(0);

  function cancel() {
    setVersion((v) => v + 1);
    setError(null);
    setEditing(false);
  }

  return (
    <form
      className={`locked adm-form${editing ? " is-editing" : ""}`}
      action={(form) =>
        start(async () => {
          const result = await action(form);
          if (typeof result === "string") return setError(result);
          setError(null);
          setEditing(false);
          setVersion((v) => v + 1);
        })
      }
    >
      <div className={`card__head${title ? "" : " card__head--end"}`}>
        {title && <h2 className="card__title">{title}</h2>}
        {!editing && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
            Upraviť
          </button>
        )}
      </div>
      <fieldset key={version} className="locked__fields" disabled={!editing || pending}>
        {children}
      </fieldset>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <div className="btn-row">
          <button className="btn btn--dark btn--sm" disabled={pending}>
            {pending ? "Ukladám…" : saveLabel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={cancel} disabled={pending}>
            Zrušiť
          </button>
        </div>
      )}
    </form>
  );
}
