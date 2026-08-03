// ============================================================================
// File: upside-tree/src/app/layout.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Root layout for the entire Upside Tree application.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default:  "Upside Tree | Rooted in Story. Made for Now.",
    template: "%s | Upside Tree",
  },
  description:
    "Contemporary Persian cultural products — graphic tees, fine ceramics, prints, and objects rooted in four thousand years of Iranian heritage.",
  keywords: [
    "Persian cultural products",
    "Iranian heritage brand",
    "Persian graphic tee",
    "Nowruz gifts",
    "Pomegranate motif",
    "Cypress tree symbol",
    "Persian diaspora",
    "Upside Tree",
  ],
  authors: [{ name: "Upside Tree Studio" }],
  creator: "Upside Tree Studio",
  publisher: "Upside Tree",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),

  openGraph: {
    type:        "website",
    locale:      "en_US",
    alternateLocale: ["fa_IR"],
    url:         "/",
    title:       "Upside Tree | Rooted in Story. Made for Now.",
    description: "Contemporary objects rooted in Iranian heritage — worn, gifted, and displayed with meaning.",
    siteName:    "Upside Tree",
    images: [
      {
        url:    "/images/og-image.png",
        width:  1200,
        height: 630,
        alt:    "Upside Tree — Contemporary Iranian Cultural Brand",
      },
    ],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "Upside Tree | Rooted in Story. Made for Now.",
    description: "Contemporary Iranian cultural objects.",
    images:      ["/images/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EFE3" },
    { media: "(prefers-color-scheme: dark)",  color: "#18231F" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans scroll-smooth")}
      data-scroll-behavior="smooth"
    >
      <head>
        <meta name="apple-mobile-web-app-capable"        content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"          content="Upside Tree" />
        <meta name="mobile-web-app-capable"              content="yes" />
        <meta name="format-detection"                    content="telephone=no" />

        <Script
          id="speculation-rules"
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prefetch: [
                {
                  tag: "upside-tree-prefetch",
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: "/cart" } },
                      { not: { href_matches: "/checkout*" } },
                      { not: { href_matches: "/api/*" } },
                      { not: { href_matches: "/account*" } },
                    ],
                  },
                  eagerness: "moderate",
                },
              ],
            }),
          }}
        />
      </head>

      <body className="bg-ivory-200 text-ink-500 font-body antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-pomegranate-500 focus:text-white focus:rounded-brand focus:shadow-md"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
