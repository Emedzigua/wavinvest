"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Remembers the previous admin page, so the back arrow knows whether
// "back" means the parent page.
export default function PathTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = useRef<string | null>(null);

  useEffect(() => {
    const url = `${pathname}${search.size ? `?${search}` : ""}`;
    try {
      if (current.current && current.current !== url) sessionStorage.setItem("wav:prev-path", current.current);
      // Fresh page load: the previous page is whatever the browser came from
      if (!current.current) {
        const ref = document.referrer && new URL(document.referrer);
        sessionStorage.setItem("wav:prev-path", ref && ref.origin === location.origin ? ref.pathname + ref.search : "");
      }
    } catch {}
    current.current = url;
  }, [pathname, search]);

  return null;
}
