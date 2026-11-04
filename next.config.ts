import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The root layouts are /[lang] and /admin, so a wrong URL has no layout to use
  experimental: { globalNotFound: true },
  partialPrefetching: true,
  // Fonts and the logo for invoice PDFs are read from disk at request time
  outputFileTracingIncludes: {
    "/admin/invoices/*/pdf": ["./assets/fonts/**/*", "./assets/brand/logo-dark-on-light.png"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com" }],
  },
};

export default nextConfig;
