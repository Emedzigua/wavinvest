"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Anonymous page-view counter for the admin statistics (no cookies)
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path: pathname });
    if (!navigator.sendBeacon?.("/api/v", new Blob([body], { type: "application/json" }))) {
      fetch("/api/v", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  }, [pathname]);
  return null;
}
