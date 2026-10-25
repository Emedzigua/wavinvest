"use client";

import type { ReactNode } from "react";

export const OPEN_COOKIES_EVENT = "wav:open-cookies";

export default function CookieSettingsButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="linklike"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIES_EVENT))}
    >
      {children}
    </button>
  );
}
