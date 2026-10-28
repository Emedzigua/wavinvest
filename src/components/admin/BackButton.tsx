"use client";

import { useRouter } from "next/navigation";

const KEY = "wav:prev-path";

// Always goes exactly one level up (detail → list → overview). When the
// previous page was that parent (e.g. a filtered list), it returns to it
// with filters and scroll kept; it never walks further back in history.
export default function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <a
      href={href}
      className="back"
      onClick={(e) => {
        e.preventDefault();
        let prev = "";
        try {
          prev = sessionStorage.getItem(KEY) ?? "";
        } catch {}
        const parent = new URL(href, location.origin).pathname;
        if (prev && new URL(prev, location.origin).pathname === parent) router.back();
        else router.push(href);
      }}
    >
      <span className="back__icon" aria-hidden>
        ←
      </span>
      {label}
    </a>
  );
}
