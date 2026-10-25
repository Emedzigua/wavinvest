import { NextResponse, type NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import {
  countryLocale,
  defaultLocale,
  hasLocale,
  LOCALE_COOKIE,
  localeTags,
  locales,
  type Locale,
} from "@/i18n/config";

// Order of preference:
// 1. a language the visitor picked earlier (cookie)
// 2. the visitor's country (set by Vercel / Cloudflare / your CDN)
// 3. the browser's Accept-Language header
// 4. English
function detectLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  const country = (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code") ??
    ""
  ).toUpperCase();
  if (countryLocale[country]) return countryLocale[country];

  const accept = request.headers.get("accept-language") ?? undefined;
  const languages = new Negotiator({
    headers: { "accept-language": accept },
  }).languages();
  try {
    // Browsers send "cs" for Czech, so match on language tags, then map back
    const tag = match(languages, locales.map((l) => localeTags[l]), localeTags[defaultLocale]);
    return locales.find((l) => localeTags[l] === tag) ?? defaultLocale;
  } catch {
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Skip Next internals, API routes and any file with an extension
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
