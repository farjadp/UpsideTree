// ============================================================================
// File: upside-tree/tailwind.config.ts
// Version: 1.0.0 — 2026-08-01
// Why: Extends Tailwind CSS with the complete Upside Tree brand design token
//      system. All brand colors, fonts, spacing, and animation tokens are
//      defined here so every component references semantic names (e.g.
//      `text-lapis`, `bg-ivory`) instead of raw hex values.
//      COLOR RULE: 60% ivory / 30% lapis or ink / 10% accent max.
// Env / Identity: Frontend build-time (Next.js / Tailwind CSS)
// ============================================================================

import type { Config } from "tailwindcss";

const config: Config = {
  // ------------------------------------------------------------------
  // Content: All files Tailwind should scan for class names
  // ------------------------------------------------------------------
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      // ----------------------------------------------------------------
      // Brand Color Palette
      // Achaemenid Lapis — primary brand blue
      // Matte Gold — details, highlights, active states
      // Pomegranate Red — CTAs, key actions (use sparingly: 10% rule)
      // Warm Ivory — main background (60%)
      // Ink Black — all body text
      // Ancient Turquoise — interactive elements, links
      // ----------------------------------------------------------------
      colors: {
        lapis: {
          DEFAULT: "#1D4E89",
          50:  "#EEF3FB",
          100: "#D5E3F4",
          200: "#ABCAE8",
          300: "#81B1DC",
          400: "#5798D0",
          500: "#1D4E89", // Primary
          600: "#1A4679",
          700: "#163C69",
          800: "#123258",
          900: "#0E2848",
        },
        gold: {
          DEFAULT: "#B48635",
          50:  "#FBF6EC",
          100: "#F4E8CC",
          200: "#E9D099",
          300: "#DEB966",
          400: "#C99E4C",
          500: "#B48635", // Primary accent
          600: "#9A7229",
          700: "#7F5E1E",
          800: "#654A14",
          900: "#4A360A",
        },
        pomegranate: {
          DEFAULT: "#8C2F39",
          50:  "#FAECED",
          100: "#F2CECE",
          200: "#E59D9D",
          300: "#D86C6C",
          400: "#C44C52",
          500: "#8C2F39", // Primary CTA
          600: "#7A2832",
          700: "#68212A",
          800: "#561A22",
          900: "#44131A",
        },
        ivory: {
          DEFAULT: "#F4EFE3",
          50:  "#FDFCFA",
          100: "#F9F6F0",
          200: "#F4EFE3", // Main background
          300: "#EDE4D0",
          400: "#E5D9BD",
          500: "#DCCCAA",
          600: "#C9B487",
          700: "#B59C64",
          800: "#927C47",
          900: "#6E5E35",
        },
        ink: {
          DEFAULT: "#18231F",
          50:  "#E8ECEA",
          100: "#C8D2CE",
          200: "#98A89E",
          300: "#687E72",
          400: "#3D544A",
          500: "#18231F", // Body text
          600: "#151F1B",
          700: "#111A17",
          800: "#0D1513",
          900: "#0A100E",
        },
        turquoise: {
          DEFAULT: "#1F8A8A",
          50:  "#E8F5F5",
          100: "#C5E7E7",
          200: "#8BCECE",
          300: "#51B5B5",
          400: "#2F9F9F",
          500: "#1F8A8A", // Interactive elements
          600: "#1A7878",
          700: "#156666",
          800: "#105454",
          900: "#0B4242",
        },
      },

      // ----------------------------------------------------------------
      // Typography
      // Display: Cormorant Garamond — cultural weight, editorial feel
      // Body/UI: Inter — clean, modern, readable
      // Persian: Vazirmatn — RTL-ready, designed for Farsi
      // ----------------------------------------------------------------
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        persian: ["var(--font-vazirmatn)", "Tahoma", "sans-serif"],
        ui:      ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      // ----------------------------------------------------------------
      // Font Size scale — display-first approach
      // ----------------------------------------------------------------
      fontSize: {
        "display-2xl": ["clamp(3rem, 6vw, 5rem)", { lineHeight: "1.1" }],
        "display-xl":  ["clamp(2.25rem, 4vw, 3.75rem)", { lineHeight: "1.1" }],
        "display-lg":  ["clamp(1.875rem, 3vw, 3rem)", { lineHeight: "1.15" }],
        "display-md":  ["clamp(1.5rem, 2.5vw, 2.25rem)", { lineHeight: "1.2" }],
        "display-sm":  ["clamp(1.25rem, 2vw, 1.875rem)", { lineHeight: "1.25" }],
      },

      // ----------------------------------------------------------------
      // Spacing — generous breathing room per brand design rules
      // ----------------------------------------------------------------
      spacing: {
        "18":  "4.5rem",
        "22":  "5.5rem",
        "26":  "6.5rem",
        "30":  "7.5rem",
        "34":  "8.5rem",
        "section": "6rem",    // Standard vertical section gap
        "section-lg": "10rem", // Large section gap (hero)
      },

      // ----------------------------------------------------------------
      // Border radius — rounded but not bubbly
      // ----------------------------------------------------------------
      borderRadius: {
        "brand": "0.5rem",     // Standard card radius
        "brand-lg": "0.75rem", // Large card radius
        "brand-xl": "1rem",    // Hero/feature card
      },

      // ----------------------------------------------------------------
      // Animation
      // ----------------------------------------------------------------
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up":         "fade-up 0.6s ease-out forwards",
        "fade-up-slow":    "fade-up 0.9s ease-out forwards",
        "fade-in":         "fade-in 0.5s ease-out forwards",
        "slide-in-right":  "slide-in-right 0.6s ease-out forwards",
        "scale-in":        "scale-in 0.4s ease-out forwards",
        "shimmer":         "shimmer 2s linear infinite",
      },

      // ----------------------------------------------------------------
      // Backdrop blur — used for sticky nav glassmorphism effect
      // ----------------------------------------------------------------
      backdropBlur: {
        "brand": "12px",
      },

      // ----------------------------------------------------------------
      // Box shadow — subtle, warm-toned shadows
      // ----------------------------------------------------------------
      boxShadow: {
        "brand-sm": "0 2px 8px rgba(24, 35, 31, 0.06)",
        "brand":    "0 4px 16px rgba(24, 35, 31, 0.08)",
        "brand-lg": "0 8px 32px rgba(24, 35, 31, 0.12)",
        "brand-xl": "0 16px 48px rgba(24, 35, 31, 0.16)",
        "gold-sm":  "0 2px 8px rgba(180, 134, 53, 0.15)",
      },

      // ----------------------------------------------------------------
      // Aspect ratios — product photography dimensions
      // ----------------------------------------------------------------
      aspectRatio: {
        "product":    "3 / 4",  // Portrait product cards
        "collection": "4 / 3",  // Landscape collection cards
        "hero":       "16 / 9", // Hero sections
        "square":     "1 / 1",  // Square thumbnails
      },

      // ----------------------------------------------------------------
      // Max widths
      // ----------------------------------------------------------------
      maxWidth: {
        "brand-prose": "640px", // Brand story / manifesto text
        "brand-card":  "360px", // Product card max width
      },

      // ----------------------------------------------------------------
      // Container — centered with generous padding
      // ----------------------------------------------------------------
      container: {
        center: true,
        padding: {
          DEFAULT: "1.25rem",
          sm:      "1.5rem",
          md:      "2rem",
          lg:      "2.5rem",
          xl:      "3rem",
          "2xl":   "4rem",
        },
      },
    },
  },

  plugins: [],
};

export default config;
