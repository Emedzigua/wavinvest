import "server-only";
import type { Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  pl: () => import("./dictionaries/pl.json").then((m) => m.default),
  cz: () => import("./dictionaries/cz.json").then((m) => m.default),
  sk: () => import("./dictionaries/sk.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
