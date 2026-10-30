"use client";

import type { ReactNode } from "react";
import { logEmail, type EmailDraft } from "@/app/admin/actions";

// Opens the email in the mail app and records it in Pošta
export default function MailtoButton({ draft, className, children }: { draft: EmailDraft; className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={`mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
      onClick={() => {
        void logEmail(draft);
      }}
    >
      {children}
    </a>
  );
}
