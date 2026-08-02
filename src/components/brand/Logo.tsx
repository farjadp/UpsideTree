// ============================================================================
// File: upside-tree/src/components/brand/Logo.tsx
// Version: 1.0.0 — 2026-08-01
// Why: SVG brand logo for Upside Tree (درخت وارونه).
//      The "upside tree" concept — an inverted cypress — is rendered as a
//      geometric SVG that works at any size and exports crisp on all devices.
//
//      The mark: a stylized inverted cypress silhouette (roots pointing up)
//      built from geometric shapes aligned with Persian architectural patterns.
//
//      Sizes:
//        nav  — 36px height, horizontal layout (mark + wordmark)
//        hero — 80px height, stacked layout (mark above wordmark)
//
//      Colors: Uses CSS variables so it inherits brand theme correctly.
//      No external image dependency — works offline (PWA).
// Env / Identity: Frontend (React Server Component — no client state)
// ============================================================================

import Link from "next/link";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface LogoProps {
  /** Size variant of the logo */
  size?:      "nav" | "hero" | "footer";
  /** Wrap in a home link */
  asLink?:    boolean;
  /** Override classes on the wrapper */
  className?: string;
  /** For dark backgrounds, invert colors */
  inverted?:  boolean;
}

// ------------------------------------------------------------------
// Upside Tree SVG Mark — inverted cypress geometric symbol
// ------------------------------------------------------------------

function UpsideTreeMark({
  size  = 36,
  color = "#1D4E89",
  gold  = "#B48635",
}: {
  size?:  number;
  color?: string;
  gold?:  string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/*
        Inverted Cypress Symbol:
        - Triangle pointing DOWN (roots at top, reaching upward = upside tree)
        - Horizontal base bar = ground line (inverted — at top)
        - Thin trunk extending downward
        The geometric simplicity echoes Achaemenid relief carving.
      */}

      {/* Top ground bar — the "roots" visible at top */}
      <rect x="8" y="6" width="32" height="3" rx="1.5" fill={color} />

      {/* Main trunk — descends from center */}
      <rect x="22.5" y="9" width="3" height="10" fill={color} />

      {/* Upper foliage triangle (largest) */}
      <polygon
        points="24,14 10,32 38,32"
        fill={color}
        opacity="0.9"
      />

      {/* Middle foliage triangle (smaller, overlapping) */}
      <polygon
        points="24,22 13,36 35,36"
        fill={color}
      />

      {/* Bottom foliage triangle (smallest tip) */}
      <polygon
        points="24,28 16,40 32,40"
        fill={color}
      />

      {/* Gold accent — single pomegranate seed / dot at tip */}
      <circle cx="24" cy="43" r="2.5" fill={gold} />
    </svg>
  );
}

// ------------------------------------------------------------------
// Logo Component
// ------------------------------------------------------------------

export function Logo({
  size     = "nav",
  asLink   = true,
  className,
  inverted = false,
}: LogoProps) {
  const brandColor = inverted ? "#F4EFE3" : "#1D4E89";
  const goldColor  = "#B48635"; // Gold is always the same

  const sizeConfig = {
    nav: {
      markSize:     32,
      layout:       "flex-row items-center gap-2.5",
      nameSize:     "text-lg",
      persianSize:  "text-[10px]",
    },
    hero: {
      markSize:     64,
      layout:       "flex-col items-center gap-3",
      nameSize:     "text-3xl",
      persianSize:  "text-sm",
    },
    footer: {
      markSize:     28,
      layout:       "flex-row items-center gap-2",
      nameSize:     "text-base",
      persianSize:  "text-[9px]",
    },
  }[size];

  const logoContent = (
    <div
      className={cn(
        "inline-flex",
        sizeConfig.layout,
        className
      )}
      role={asLink ? undefined : "img"}
      aria-label="Upside Tree — درخت وارونه"
    >
      {/* Mark */}
      <UpsideTreeMark
        size={sizeConfig.markSize}
        color={brandColor}
        gold={goldColor}
      />

      {/* Wordmark */}
      <div className={cn(
        "flex flex-col",
        size === "hero" ? "items-center" : "items-start"
      )}>
        <span
          className={cn(
            "font-display font-semibold leading-none tracking-tight",
            sizeConfig.nameSize,
            inverted ? "text-ivory-200" : "text-lapis-500"
          )}
        >
          Upside Tree
        </span>
        <span
          className={cn(
            "font-persian leading-none mt-0.5 tracking-wide",
            sizeConfig.persianSize,
            inverted ? "text-gold-200" : "text-gold-500"
          )}
          lang="fa"
          dir="rtl"
        >
          درخت وارونه
        </span>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-lapis-500 focus-visible:ring-offset-2",
          "rounded-sm"
        )}
        aria-label="Upside Tree — Go to homepage"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
