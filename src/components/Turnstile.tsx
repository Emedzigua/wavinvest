"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile: a free, privacy-friendly captcha. Most people never
// see a puzzle; the widget adds a hidden "cf-turnstile-response" field to the form.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;
function load() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve(window.turnstile!);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

export default function Turnstile({
  language,
  theme = "auto",
  resetKey = 0,
}: {
  language?: string;
  theme?: "light" | "dark" | "auto";
  // Change this number to get a fresh token (each token works only once)
  resetKey?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let cancelled = false;
    load().then((api) => {
      if (cancelled || !el.current) return;
      id.current = api.render(el.current, { sitekey: SITE_KEY, language: language ?? "auto", theme, size: "flexible" });
    });
    return () => {
      cancelled = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [language, theme]);

  useEffect(() => {
    if (resetKey && id.current) window.turnstile?.reset(id.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={el} className="turnstile" />;
}
