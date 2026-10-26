"use client";

import { useTransition, type ReactNode } from "react";

// Runs a server action after the browser's confirm dialog
export default function ConfirmButton({
  action,
  message,
  className = "btn btn--ghost btn--sm",
  children,
}: {
  action: () => Promise<void>;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (!message || window.confirm(message)) start(() => action());
      }}
    >
      {children}
    </button>
  );
}
