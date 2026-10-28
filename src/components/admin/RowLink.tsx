"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

// Table row that opens `href` when clicked anywhere (links and buttons inside
// keep working on their own). The first cell still holds a real link.
export default function RowLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={`row-link${className ? ` ${className}` : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
        else router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
