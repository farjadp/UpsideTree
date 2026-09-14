// ============================================================================
// File: upside-tree/src/components/layout/Footer.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Site-wide footer for Upside Tree.
//      Contains: logo + tagline, nav links, collection links, social links,
//      newsletter placeholder (Phase 2), and copyright.
//      Persian brand name renders in Vazirmatn with RTL.
//      Design: minimal, ivory background, ink-toned text, gold accents.
// Env / Identity: Frontend (React Server Component)
// ============================================================================

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Footer data
// ------------------------------------------------------------------

const FOOTER_NAV = {
  // Live catalog paths only — a footer link that 404s ends the visit.
  shop: [
    { href: "/collections/home-and-living-canvas", label: "Wall Art & Canvas" },
    { href: "/collections/accessories-jewelry",    label: "Jewelry & Keepsakes" },
    { href: "/collections/home-and-living-mugs",   label: "Mugs & Drinkware" },
    { href: "/collections",                        label: "All Collections" },
    { href: "/search",                             label: "Search" },
  ],
  company: [
    { href: "/about",   label: "About Us" },
    { href: "/stories", label: "Stories" },
    { href: "/contact", label: "Contact" },
  ],
  info: [
    { href: "/how-to-buy", label: "How to Buy" },
    { href: "/shipping",  label: "Shipping & Returns" },
    { href: "/sizing",    label: "Size Guide" },
    { href: "/care",      label: "Care Instructions" },
    { href: "/faq",       label: "FAQ" },
  ],
};

// ------------------------------------------------------------------
// Footer Component
// ------------------------------------------------------------------

export function Footer({ givingEnabled = false }: { givingEnabled?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "bg-ivory-300 border-t border-ivory-400",
        "mt-20", // Top margin to separate from last page section
      )}
      role="contentinfo"
    >
      {/* Persian border motif — decorative top accent */}
      <div className="container mx-auto pt-1 opacity-30 overflow-hidden">
        <PersianMotif motif="border" size={24} color="#1D4E89" />
      </div>

      {/* Main footer grid */}
      <div className="container mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* Brand column — spans 4 of 12 columns */}
          <div className="md:col-span-4 flex flex-col gap-6">
            <Logo size="footer" />

            <p className="text-sm text-ink-400 leading-relaxed max-w-xs font-body">
              Contemporary objects rooted in Iranian heritage.
              Made for everyday life, made to last.
            </p>

            {/* Persian tagline */}
            <p
              className="text-sm font-persian text-ink-400 text-left"
              lang="fa"
              dir="rtl"
            >
              ریشه در داستان، ساخته برای امروز
            </p>

          </div>

          {/* Spacer on md */}
          <div className="hidden md:block md:col-span-1" />

          {/* Shop links */}
          <div className="md:col-span-2">
            <h3 className="font-display text-sm font-semibold text-ink-500 mb-4 tracking-wide uppercase">
              Shop
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {FOOTER_NAV.shop.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "text-sm text-ink-400 hover:text-lapis-500",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500 rounded-sm",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div className="md:col-span-2">
            <h3 className="font-display text-sm font-semibold text-ink-500 mb-4 tracking-wide uppercase">
              Brand
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {[...FOOTER_NAV.company, ...(givingEnabled ? [{ href: "/giving", label: "Giving" }] : [])].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "text-sm text-ink-400 hover:text-lapis-500",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500 rounded-sm",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold text-ink-500 mb-4 tracking-wide uppercase">
              Support
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {FOOTER_NAV.info.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "text-sm text-ink-400 hover:text-lapis-500",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500 rounded-sm",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="container mx-auto pb-6">
        <div className="border-t border-ivory-500 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-400 font-body">
            © {currentYear} Upside Tree. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-ink-400 hover:text-lapis-500 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-ink-400 hover:text-lapis-500 transition-colors">
              Terms
            </Link>
            <Link href="/disclaimer" className="text-xs text-ink-400 hover:text-lapis-500 transition-colors">
              Disclaimer
            </Link>
            <CurrencySwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
