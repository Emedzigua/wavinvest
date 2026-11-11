// Shared by the website and the admin (no server-only imports here)

export const PRODUCT_LANGS = ["sk", "en", "de", "pl", "cz"] as const;
export type ProductLang = (typeof PRODUCT_LANGS)[number];

export const productLangLabel: Record<ProductLang, string> = {
  sk: "Slovensky",
  en: "Anglicky",
  de: "Nemecky",
  pl: "Poľsky",
  cz: "Česky",
};

export type ProductText = {
  name?: string;
  tagline?: string;
  description?: string;
  image_alt?: string;
  specs?: [string, string][];
};

export type SiteProductRow = {
  id: string;
  slug: string;
  sort: number;
  active: boolean;
  quote_key: "epal" | "collars" | "mixed";
  image: string | null;
  content: Partial<Record<ProductLang, ProductText>>;
};

export const quoteKeyLabel: Record<SiteProductRow["quote_key"], string> = {
  epal: "EPAL paleta (cena z cenníka)",
  collars: "Paletový nadstavec (cena z cenníka)",
  mixed: "Iný produkt (cena v ponuke)",
};
