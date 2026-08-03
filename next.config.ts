// ============================================================================
// File: upside-tree/next.config.ts
// Version: 1.2.0 — 2026-08-03
// Why: Next.js 16 configuration. next-pwa uses webpack plugins internally,
//      so the project must build with the explicit `--webpack` CLI flag for
//      stable local and Vercel production builds.
//
//      PWA caching strategy (Workbox):
//        - Fonts / static assets: cache-first
//        - API routes: network-first with 5s timeout
//        - Collection pages: stale-while-revalidate
//
//      Image configuration:
//        - AVIF + WebP output formats
//        - Responsive deviceSizes for next/image optimization
//        - Supabase/Printful CDN domains added in Phase 2
//
//      Security headers applied to all routes.
// Env / Identity: Build-time (Next.js 16 + Turbopack)
// ============================================================================

import type { NextConfig } from "next";

// We import withPWA but keep it conditional to avoid Turbopack conflicts.
// In development: PWA disabled (no service worker interference).
// In production: PWA enabled with Workbox caching strategies.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest:       "public",
  disable:    process.env.NODE_ENV === "development",
  register:   true,
  skipWaiting: true,
  // Workbox runtime caching strategies
  runtimeCaching: [
    {
      // Google Fonts — cache-first (fonts rarely change)
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler:    "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Local product images — cache-first
      urlPattern: /\/images\/.*/i,
      handler:    "CacheFirst",
      options: {
        cacheName: "product-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // API routes — network-first (fresh product data)
      urlPattern: /^\/api\/.*/i,
      handler:    "NetworkFirst",
      options: {
        cacheName:             "api-cache",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Collection pages — stale-while-revalidate (fast + fresh)
      urlPattern: /^\/collections\/.*/i,
      handler:    "StaleWhileRevalidate",
      options: {
        cacheName: "collection-pages",
        expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes:  [64, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "files.cdn.printful.com" },
    ],
  },

  reactStrictMode: true,

  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
