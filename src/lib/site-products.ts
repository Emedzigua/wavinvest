import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";
import { media } from "@/lib/media";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { ProductText, SiteProductRow } from "@/lib/site-products-shared";

export type { ProductText, SiteProductRow } from "@/lib/site-products-shared";

export const SITE_PRODUCTS_TAG = "site-products";

// What the website lists under "What we sell", in one language
export type SiteProduct = {
  slug: string;
  quoteKey: "epal" | "collars" | "mixed";
  image: string | null;
  name: string;
  tagline: string;
  description: string;
  imageAlt: string;
  specs: [string, string][];
};

// Used only if the database can't be reached, so the page never shows an empty list
async function fallback(): Promise<SiteProductRow[]> {
  const dicts = await Promise.all(locales.map(async (l) => [l, await getDictionary(l)] as const));
  return (["epal", "collars"] as const).map((slug, i) => ({
    id: slug,
    slug,
    sort: i * 10,
    active: true,
    quote_key: slug,
    image: media.products[slug],
    content: Object.fromEntries(
      dicts.map(([l, d]) => {
        const item = d.products.items[slug];
        return [l, { name: item.name, tagline: item.tagline, description: item.description, image_alt: item.imageAlt, specs: item.specs as [string, string][] }];
      }),
    ),
  }));
}

// Cached until the admin changes a product (updateTag in the admin actions)
async function activeRows(): Promise<SiteProductRow[]> {
  "use cache";
  cacheTag(SITE_PRODUCTS_TAG);
  cacheLife("max");
  if (!supabaseConfigured) return fallback();
  const { data, error } = await createPublicClient()
    .from("site_products")
    .select("id, slug, sort, active, quote_key, image, content")
    .eq("active", true)
    .order("sort")
    .order("created_at");
  if (error || !data) {
    console.error("site_products could not be read, showing the built-in list", error?.message);
    return fallback();
  }
  return data as SiteProductRow[];
}

// A text missing in this language falls back to English, then Slovak (the owner writes Slovak first)
export function localize(row: SiteProductRow, lang: Locale): SiteProduct {
  const pick = <K extends keyof ProductText>(key: K): ProductText[K] | undefined => {
    for (const l of [lang, "en", "sk"] as const) {
      const v = row.content?.[l]?.[key];
      if (Array.isArray(v) ? v.length : v) return v;
    }
    return undefined;
  };
  return {
    slug: row.slug,
    quoteKey: row.quote_key,
    image: row.image,
    name: pick("name") ?? row.slug,
    tagline: pick("tagline") ?? "",
    description: pick("description") ?? "",
    imageAlt: pick("image_alt") ?? pick("name") ?? "",
    specs: (pick("specs") ?? []) as [string, string][],
  };
}

// A quote for a product without its own price list item is filed as "mixed", with its name in the message
export async function productForQuote(slug: string): Promise<{ quoteKey: SiteProduct["quoteKey"]; name: string | null }> {
  if (slug === "mixed") return { quoteKey: "mixed", name: null };
  const row = (await activeRows()).find((r) => r.slug === slug);
  if (!row) return { quoteKey: "mixed", name: null };
  return { quoteKey: row.quote_key, name: row.quote_key === "mixed" ? localize(row, "sk").name : null };
}

export async function getSiteProducts(lang: Locale): Promise<SiteProduct[]> {
  return (await activeRows()).map((row) => localize(row, lang));
}
