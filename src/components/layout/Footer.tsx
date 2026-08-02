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
import { ExternalLink, Link2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Footer data
// ------------------------------------------------------------------

const FOOTER_NAV = {
  shop: [
    { href: "/collections/roots",          label: "Roots" },
    { href: "/collections/words",          label: "Words" },
    { href: "/collections/rituals",        label: "Rituals" },
    { href: "/collections/made-by-hand",   label: "Made by Hand" },
    { href: "/collections/limited-stories",label: "Limited Stories" },
  ],
  company: [
    { href: "/about",   label: "About Us" },
    { href: "/stories", label: "Stories" },
    { href: "/contact", label: "Contact" },
  ],
  info: [
    { href: "/shipping",  label: "Shipping & Returns" },
    { href: "/sizing",    label: "Size Guide" },
    { href: "/care",      label: "Care Instructions" },
    { href: "/faq",       label: "FAQ" },
  ],
};

const SOCIAL_LINKS = [
  {
    href:  "https://instagram.com/upsidertree",
    label: "Follow us on Instagram",
    icon:  Link2,
    id:    "footer-instagram",
  },
  {
    href:  "https://youtube.com/@upsidertree",
    label: "Watch on YouTube",
    icon:  ExternalLink,
    id:    "footer-youtube",
  },
];

// ------------------------------------------------------------------
// Footer Component
// ------------------------------------------------------------------

export function Footer() {
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
              className="text-sm font-persian text-ink-400 text-right"
              lang="fa"
              dir="rtl"
            >
              ریشه در داستان، ساخته برای امروز
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon, id }) => (
                <a
                  key={id}
                  id={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={cn(
                    "p-2 rounded-brand",
                    "text-ink-400 hover:text-lapis-500 hover:bg-ivory-400",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </a>
              ))}
            </div>
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
              {FOOTER_NAV.company.map(({ href, label }) => (
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

            {/* Newsletter — Phase 2 placeholder */}
            <div className="mt-8">
              <p className="text-xs text-ink-400 font-body mb-2 font-medium">
                New collections & cultural notes
              </p>
              <div className="flex gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  placeholder="your@email.com"
                  disabled
                  aria-label="Newsletter email (coming soon)"
                  className={cn(
                    "flex-1 px-3 py-2 text-sm",
                    "bg-ivory-200 border border-ivory-500",
                    "rounded-brand text-ink-400 placeholder:text-ink-300",
                    "opacity-60 cursor-not-allowed",
                    "focus-visible:outline-none",
                  )}
                />
                <button
                  id="footer-newsletter-btn"
                  disabled
                  aria-label="Subscribe to newsletter (coming soon)"
                  className={cn(
                    "px-3 py-2 rounded-brand text-sm",
                    "bg-pomegranate-500 text-white",
                    "opacity-60 cursor-not-allowed",
                    "font-body font-medium",
                  )}
                >
                  Join
                </button>
              </div>
            </div>
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
            {/* Multi-currency label — Phase 2: real selector */}
            <span className="text-xs text-ink-400 border border-ivory-500 rounded px-2 py-0.5">
              CAD $
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
