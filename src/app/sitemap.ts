import type { MetadataRoute } from "next";
import { locales, siteUrl } from "@/i18n/config";
import { languageAlternates } from "@/lib/seo";

const pages = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap(({ path, priority, changeFrequency }) =>
    locales.map((l) => ({
      url: `${siteUrl}/${l}${path}`,
      changeFrequency,
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
