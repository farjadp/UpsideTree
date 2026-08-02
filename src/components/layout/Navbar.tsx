// ============================================================================
// File: upside-tree/src/components/layout/Navbar.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Site-wide navigation header for Upside Tree.
//
//      Desktop layout: Logo (left) | nav links (center-right) | Cart + Lang (right)
//      Mobile layout:  Logo (left) | hamburger menu (right)
//
//      Behavior:
//        - Transparent on page load; transitions to ivory+blur on scroll
//        - Active link highlighted in Gold (#B48635)
//        - Links in Lapis (#1D4E89) per brand spec
//        - Sticky with backdrop-blur (glassmorphism) on scroll
//        - Mobile menu: full-screen overlay, slides in from top
//        - Cart icon shows badge with item count (Phase 2: real cart count)
//
//      Performance:
//        - Scroll listener uses passive: true for smooth 60fps
//        - useCallback prevents unnecessary re-renders
// Env / Identity: Frontend (React Client Component)
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Menu,
  X,
  Search,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Navigation links config
// ------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/collections", label: "Collections" },
  { href: "/about",       label: "About" },
  { href: "/stories",     label: "Stories" },
] as const;

// ------------------------------------------------------------------
// CartBadge — shows item count on cart icon
// Phase 2: connect to cart context for real count
// ------------------------------------------------------------------

function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-1.5",
        "w-5 h-5 rounded-full",
        "bg-pomegranate-500 text-white",
        "text-[10px] font-bold",
        "flex items-center justify-center",
        "leading-none pointer-events-none",
      )}
      aria-label={`${count} item${count > 1 ? "s" : ""} in cart`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ------------------------------------------------------------------
// Navbar Component
// ------------------------------------------------------------------

export function Navbar() {
  const pathname  = usePathname();
  const [scrolled,      setScrolled]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [cartCount /*, setCartCount */]   = useState(0); // Phase 2: real cart

  // Track scroll position for sticky header style
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ============================================================
          Main Navbar
          ============================================================ */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-300",
          // Scrolled state: add background + shadow
          scrolled
            ? "bg-ivory-200/90 backdrop-blur-brand border-b border-ivory-400/60 shadow-brand-sm"
            : "bg-transparent",
        )}
        role="banner"
      >
        <nav
          className="container mx-auto flex items-center justify-between h-[var(--navbar-height)]"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Logo size="nav" />

          {/* Desktop nav links */}
          <ul
            className="hidden md:flex items-center gap-8"
            role="list"
          >
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                ((href as string) !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "font-body text-sm font-medium",
                      "transition-colors duration-150",
                      "relative pb-0.5",
                      // Active: gold color + underline
                      isActive
                        ? "text-gold-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-500 after:rounded-full"
                        : "text-lapis-500 hover:text-lapis-700",
                      // Focus ring
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500 rounded-sm",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right side: search, cart, lang toggle */}
          <div className="flex items-center gap-3">
            {/* Search button — Phase 2: full search UI */}
            <button
              id="nav-search-btn"
              aria-label="Search products"
              className={cn(
                "hidden md:flex p-2 rounded-brand",
                "text-lapis-500 hover:text-lapis-700 hover:bg-lapis-50",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
              )}
            >
              <Search size={18} strokeWidth={1.75} />
            </button>

            {/* Cart icon */}
            <Link
              href="/cart"
              id="nav-cart-btn"
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className={cn(
                "relative p-2 rounded-brand",
                "text-lapis-500 hover:text-lapis-700 hover:bg-lapis-50",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
              )}
            >
              <ShoppingBag size={20} strokeWidth={1.75} />
              <CartBadge count={cartCount} />
            </Link>

            {/* Mobile hamburger */}
            <button
              id="nav-mobile-menu-btn"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={cn(
                "md:hidden p-2 rounded-brand",
                "text-lapis-500 hover:text-lapis-700 hover:bg-lapis-50",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
              )}
            >
              {menuOpen ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
            </button>
          </div>
        </nav>
      </header>

      {/* ============================================================
          Mobile Menu Overlay
          ============================================================ */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className={cn(
            "fixed inset-0 z-40",
            "bg-ivory-200",
            "flex flex-col",
            "pt-[var(--navbar-height)]",
            "animate-fade-in",
          )}
        >
          {/* Mobile nav links */}
          <nav className="container mx-auto flex-1 flex flex-col justify-center gap-2 py-12">
            {NAV_LINKS.map(({ href, label }, i) => {
              const isActive = pathname === href || ((href as string) !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between",
                    "py-5 border-b border-ivory-400",
                    "text-3xl font-display font-medium",
                    "transition-colors duration-150",
                    isActive ? "text-gold-500" : "text-lapis-500 hover:text-lapis-700",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500",
                    "animate-fade-up",
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{label}</span>
                  <span
                    className="text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity text-2xl"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu footer */}
          <div className="container mx-auto pb-8">
            <p className="font-persian text-sm text-ink-400 text-right" lang="fa" dir="rtl">
              درخت وارونه · ریشه در داستان، ساخته برای امروز
            </p>
          </div>
        </div>
      )}
    </>
  );
}
