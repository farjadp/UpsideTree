"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

interface BrandingSettingsResponse {
  settings?: {
    branding?: {
      logo_light?: string;
      logo_dark?: string;
    };
  };
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
  const [customLogoUrl, setCustomLogoUrl] = useState<string>("");
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

  useEffect(() => {
    let isMounted = true;

    const loadBranding = async () => {
      try {
        const response = await fetch("/api/admin/settings?namespace=branding&is_public=true", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data: BrandingSettingsResponse = await response.json();
        const branding = data.settings?.branding;
        const nextLogo = inverted ? branding?.logo_dark || branding?.logo_light : branding?.logo_light || branding?.logo_dark;

        if (isMounted) {
          setCustomLogoUrl(nextLogo || "");
        }
      } catch {
        if (isMounted) {
          setCustomLogoUrl("");
        }
      }
    };

    loadBranding();

    return () => {
      isMounted = false;
    };
  }, [inverted]);

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
      {customLogoUrl ? (
        <img
          src={customLogoUrl}
          alt="Upside Tree"
          className={cn(
            "w-auto object-contain",
            size === "hero" ? "h-20 max-w-[300px]" : size === "footer" ? "h-10 max-w-[180px]" : "h-9 max-w-[180px]"
          )}
        />
      ) : (
        <>
          <UpsideTreeMark
            size={sizeConfig.markSize}
            color={brandColor}
            gold={goldColor}
          />

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
        </>
      )}
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
