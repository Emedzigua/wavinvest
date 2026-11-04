"use client";

import { useEffect, useRef } from "react";
import { LOCALE_COOKIE, localeNames, localeTags, locales, type Locale } from "@/i18n/config";

// Remembers the choice for a year so the auto-detection never overrides it
function choose(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export default function LanguageSwitcher({
  lang,
  label,
  path = "",
}: {
  lang: Locale;
  label: string;
  path?: string;
}) {
  const menu = useRef<HTMLDetailsElement>(null);

  // A click elsewhere or Escape closes the menu
  useEffect(() => {
    const close = (e: Event) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details className="lang" ref={menu}>
      <summary aria-label={label}>
        {lang.toUpperCase()}
        <span className="lang__caret" aria-hidden />
      </summary>
      <ul>
        {locales.map((l) => (
          <li key={l}>
            <a
              href={`/${l}${path}`}
              hrefLang={localeTags[l]}
              lang={localeTags[l]}
              aria-current={l === lang ? "true" : undefined}
              onClick={() => choose(l)}
            >
              <span>{l.toUpperCase()}</span>
              {localeNames[l]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
