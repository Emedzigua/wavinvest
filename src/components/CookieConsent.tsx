"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { OPEN_COOKIES_EVENT } from "./CookieSettingsButton";

const COOKIE = "wav_consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Consent = { analytics: boolean };

function readConsent(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.split("=")[1]));
  } catch {
    return null;
  }
}

function writeConsent(consent: Consent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE}=${value}; path=/; max-age=15552000; samesite=lax`; // 180 days
}

export default function CookieConsent({ dict, lang }: { dict: Dictionary["cookies"]; lang: Locale }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    // Reading a cookie is only possible after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(saved);
    if (!saved) setOpen(true);
    const reopen = () => {
      setAnalytics(readConsent()?.analytics ?? false);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIES_EVENT, reopen);
  }, []);

  const save = (next: Consent) => {
    writeConsent(next);
    setConsent(next);
    setOpen(false);
    setDetails(false);
  };

  return (
    <>
      {GA_ID && consent?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {open && (
        <div className="cookies" role="dialog" aria-modal="false" aria-labelledby="cookies-title">
          <p className="label label--light" id="cookies-title">
            {dict.title}
          </p>
          <p className="cookies__text">
            {dict.text} <a href={`/${lang}/privacy`}>{dict.policy}</a>
          </p>

          {details && (
            <div className="cookies__options">
              <label className="toggle">
                <input type="checkbox" checked disabled />
                <span className="toggle__ui" aria-hidden />
                <span>
                  <strong>{dict.necessary}</strong>
                  <small>{dict.necessaryText}</small>
                </span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
                <span className="toggle__ui" aria-hidden />
                <span>
                  <strong>{dict.analytics}</strong>
                  <small>{dict.analyticsText}</small>
                </span>
              </label>
            </div>
          )}

          <div className="cookies__actions">
            {details ? (
              <button type="button" className="btn btn--ghost-light btn--sm" onClick={() => save({ analytics })}>
                {dict.save}
              </button>
            ) : (
              <button type="button" className="btn btn--ghost-light btn--sm" onClick={() => setDetails(true)}>
                {dict.customize}
              </button>
            )}
            <button type="button" className="btn btn--ghost-light btn--sm" onClick={() => save({ analytics: false })}>
              {dict.reject}
            </button>
            <button type="button" className="btn btn--light btn--sm" onClick={() => save({ analytics: true })}>
              {dict.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
