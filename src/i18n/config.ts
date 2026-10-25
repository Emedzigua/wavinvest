export const locales = ["en", "de", "pl", "cz", "sk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  pl: "Polski",
  cz: "Čeština",
  sk: "Slovenčina",
};

// BCP 47 tags used for <html lang>, hreflang and Open Graph.
// The Czech URL is /cz, but the official language code search engines expect is "cs".
export const localeTags: Record<Locale, string> = {
  en: "en",
  de: "de",
  pl: "pl",
  cz: "cs",
  sk: "sk",
};

// Visitor country (ISO 3166-1 alpha-2) → site language
export const countryLocale: Record<string, Locale> = {
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  LU: "de",
  PL: "pl",
  CZ: "cz",
  SK: "sk",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wavinvest.eu"
).replace(/\/$/, "");
