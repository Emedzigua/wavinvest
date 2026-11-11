import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The root layouts are /[lang] and /admin, so a wrong URL has no layout to use
  // Product photos are shrunk in the browser first, so 4 MB leaves plenty of room (Vercel's cap is 4.5 MB)
  experimental: { globalNotFound: true, serverActions: { bodySizeLimit: "4mb" } },
  partialPrefetching: true,
  // Fonts and the logo for invoice PDFs are read from disk at request time
  outputFileTracingIncludes: {
    "/admin/invoices/*/pdf": ["./assets/fonts/**/*", "./assets/brand/logo-dark-on-light.png"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      // Product photos uploaded in the admin
      { protocol: "https", hostname: "gxtxyambdmzbjrlunsju.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
