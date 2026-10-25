"use client";

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
  return (
    <details className="lang">
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
