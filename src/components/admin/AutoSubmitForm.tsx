"use client";

import type { ReactNode } from "react";

// GET filter form that applies itself when a select changes
export default function AutoSubmitForm({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <form
      className={className}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
