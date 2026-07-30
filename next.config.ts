import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    // Dev-only: without an explicit Cache-Control, browsers fall back to
    // heuristic caching for /_next/* chunk responses. Firefox's heuristic
    // is more aggressive than Chrome's, so after a dev-server code change
    // it can keep serving a stale chunk (e.g. the Dynamic wallet SDK)
    // against the new page state until the cache is cleared by hand.
    // Forcing revalidation only in dev avoids touching production, where
    // Next's own content-hashed asset caching is already correct.
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/_next/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
