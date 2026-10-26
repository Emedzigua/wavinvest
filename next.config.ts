import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Fonts for invoice PDFs are read from disk at request time
  outputFileTracingIncludes: {
    "/admin/invoices/*/pdf": ["./assets/fonts/**/*"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com" }],
  },
};

export default nextConfig;
