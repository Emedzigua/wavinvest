"use client";

import { useState, useTransition } from "react";
import { saveMenu } from "@/app/admin/actions";
import { MENU, MENU_PRESETS, type MenuKey } from "@/lib/admin/menu";

// Saves on every change, so the sidebar switches right away
export default function MenuPicker({ initial }: { initial: MenuKey[] }) {
  const [keys, setKeys] = useState<MenuKey[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply(next: MenuKey[]) {
    const previous = keys;
    setKeys(next);
    setError(null);
    start(async () => {
      try {
        await saveMenu(next);
      } catch {
        setKeys(previous);
        setError("Menu sa nepodarilo uložiť. Skúste to znova.");
      }
    });
  }

  const same = (a: MenuKey[], b: MenuKey[]) => a.length === b.length && a.every((k) => b.includes(k));
  const toggle = (k: MenuKey) => apply(keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k]);

  return (
    <div className="adm-form" aria-busy={pending}>
      <div className="seg" role="group" aria-label="Rýchly výber">
        {MENU_PRESETS.map((p) => (
          <button key={p.label} type="button" aria-pressed={same(keys, p.keys)} onClick={() => apply(p.keys)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="outcomes" role="group" aria-label="Položky menu">
        {MENU.map((m) => (
          <label key={m.key} className={`outcome${keys.includes(m.key) ? " is-on" : ""}`}>
            <input type="checkbox" checked={keys.includes(m.key)} onChange={() => toggle(m.key)} />
            {m.label}
          </label>
        ))}
      </div>
      <p className="muted small">Nastavenia zostávajú v menu vždy. Skryté časti fungujú ďalej, len nie sú v menu.</p>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
