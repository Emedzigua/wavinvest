import type { MetadataRoute } from "next";
import { siteUrl } from "@/i18n/config";
import { adminEnabled } from "@/lib/features";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", ...(adminEnabled && { disallow: "/admin" }) },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
