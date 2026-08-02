// ============================================================================
// File: upside-tree/src/components/brand/BilingualText.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Core bilingual (EN/FA) toggle component used across the entire store.
//      Renders English or Persian text for any given content pair.
//
//      Design decisions:
//        - State is local per-component — no global language context in Phase 1.
//          This avoids re-rendering the whole page on toggle and keeps the
//          experience contextual (product card toggles independently).
//        - Phase 2: lift language state to a React context + localStorage
//          persistence so the user's preference is remembered site-wide.
//        - Persian text always renders with dir="rtl" and font-persian.
//          The toggle button repositions to the correct side for RTL.
//        - Crossfade animation (opacity) instead of slide to avoid
//          layout shift when text length differs between languages.
//        - The toggle button is visually minimal — just EN/FA labels.
//
//      Accessibility:
//        - lang attribute changes on the text container for screen readers
//        - aria-label on toggle button announces the action
// Env / Identity: Frontend (React Client Component)
// ============================================================================

"use client";

import { useState, useCallback, type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Language = "en" | "fa";

interface BilingualTextProps {
  /** English content */
  en: ReactNode;
  /** Persian / Farsi content */
  fa: ReactNode;
  /** Starting language (defaults to "en") */
  defaultLang?: Language;
  /** Additional classes for the outer container */
  className?: string;
  /** Show/hide the toggle button */
  showToggle?: boolean;
  /** Additional classes for the text wrapper */
  textClassName?: string;
}

// ------------------------------------------------------------------
// BilingualText Component
// ------------------------------------------------------------------

export function BilingualText({
  en,
  fa,
  defaultLang  = "en",
  className,
  showToggle   = true,
  textClassName,
}: BilingualTextProps) {
  const [lang, setLang] = useState<Language>(defaultLang);
  const [animating, setAnimating] = useState(false);

  const toggle = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setLang((prev) => (prev === "en" ? "fa" : "en"));
      setAnimating(false);
    }, 150); // Half of the opacity transition
  }, []);

  const isFa  = lang === "fa";
  const isEn  = lang === "en";

  return (
    <div className={cn("relative", className)}>
      {/* Text content */}
      <div
        lang={isFa ? "fa" : "en"}
        dir={isFa ? "rtl" : "ltr"}
        className={cn(
          "transition-opacity duration-300",
          animating ? "opacity-0" : "opacity-100",
          isFa && "font-persian text-right",
          textClassName
        )}
      >
        {isFa ? fa : en}
      </div>

      {/* Toggle button */}
      {showToggle && (
        <button
          onClick={toggle}
          aria-label={
            isFa
              ? "Switch to English"
              : "نمایش متن فارسی"
          }
          className={cn(
            "mt-2 flex items-center gap-1.5",
            "text-xs font-body font-medium tracking-wide",
            "text-turquoise-500 hover:text-lapis-500",
            "transition-colors duration-150",
            "cursor-pointer focus-visible:outline-none",
            "focus-visible:ring-1 focus-visible:ring-turquoise-500 rounded-sm",
            // RTL: toggle button aligns right when in Persian mode
            isFa ? "flex-row-reverse ml-auto" : "mr-auto",
          )}
        >
          {/* Language indicator dots */}
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              isEn ? "bg-turquoise-500" : "bg-ink-200"
            )}
            aria-hidden="true"
          />
          <span className={cn(isEn ? "text-turquoise-500" : "text-ink-400")}>EN</span>
          <span className="text-ink-300" aria-hidden="true">|</span>
          <span className={cn(isFa ? "text-turquoise-500" : "text-ink-400")}>FA</span>
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              isFa ? "bg-turquoise-500" : "bg-ink-200"
            )}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// PersianOnly — Renders Persian text with proper RTL styling
// For content that is always in Persian (no toggle needed)
// ------------------------------------------------------------------
interface PersianOnlyProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function PersianOnly({
  children,
  className,
  as: Tag = "span",
}: PersianOnlyProps) {
  return (
    <Tag
      lang="fa"
      dir="rtl"
      className={cn("font-persian text-right", className)}
    >
      {children}
    </Tag>
  );
}
