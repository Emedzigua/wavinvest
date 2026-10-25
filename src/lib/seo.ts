import type { Metadata } from "next";
import { localeTags, locales, siteUrl, type Locale } from "@/i18n/config";

// hreflang links for every language version of a path ("" = homepage)
export function languageAlternates(path = "") {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeTags[l]] = `${siteUrl}/${l}${path}`;
  languages["x-default"] = `${siteUrl}/en${path}`;
  return languages;
}

export function pageMetadata(
  locale: Locale,
  title: string,
  description: string,
  path = "",
  image?: string,
): Metadata {
  const url = `${siteUrl}/${locale}${path}`;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "WAV Invest",
      locale: localeTags[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeTags[l]),
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
    robots: { index: true, follow: true },
  };
}
