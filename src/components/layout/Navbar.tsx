// ============================================================================
// File: upside-tree/src/components/layout/Navbar.tsx
// Version: 1.1.0 — 2026-08-24
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
//        - Desktop "Collections" mega menu: 5 main categories + subcategory columns
//        - Mobile menu: full-screen overlay, accordion by main category
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
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";

type NavSubcategory = {
  id: string;
  slug: string;
  name_en: string;
};

type NavCategory = {
  id: string;
  slug: string;
  name_en: string;
  children: NavSubcategory[];
};

// ------------------------------------------------------------------
// Navigation links config
// ------------------------------------------------------------------

const NAV_LINKS = [
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
  const [categories,    setCategories]    = useState<NavCategory[]>([]);
  const [activeMain,    setActiveMain]    = useState<number | null>(null);

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

  useEffect(() => {
    fetch("/api/admin/collections?tree=1")
      .then((response) => response.json())
      .then((data) => {
        const tree = (data.tree || [])
          .filter((category: any) => category.status === "active")
          .map((category: any) => ({
            id: category.id,
            slug: category.slug,
            name_en: category.name_en,
            children: (category.children || []).map((child: any) => ({
              id: child.id,
              slug: child.slug,
              name_en: child.name_en,
            })),
          }));
        setCategories(tree);
      })
      .catch(() => setCategories([]));
  }, []);

  const isCollectionsActive = pathname.startsWith("/collections");

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
            {/* Collections Mega Menu */}
            <li
              className="relative group"
              onMouseEnter={() => setActiveMain((prev) => (prev === null ? 0 : prev))}
              onMouseLeave={() => setActiveMain(null)}
            >
              <button
                className={cn(
                  "font-body text-sm font-medium flex items-center gap-1",
                  "transition-colors duration-150",
                  "relative pb-0.5",
                  isCollectionsActive
                    ? "text-gold-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-500 after:rounded-full"
                    : "text-lapis-500 hover:text-lapis-700",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lapis-500 rounded-sm cursor-pointer"
                )}
              >
                Collections <ChevronDown size={14} />
              </button>

              {/* Mega menu dropdown */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 top-full",
                  "w-[780px] lg:w-[920px]",
                  "bg-ivory-200/95 backdrop-blur-brand border border-ivory-400 shadow-brand-lg rounded-brand-xl",
                  "overflow-hidden transition-all duration-200 origin-top",
                  activeMain !== null
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 scale-[0.98] -translate-y-2 pointer-events-none"
                )}
              >
                {categories.length > 0 ? (
                  <div className="flex">
                    {/* Left: main category tabs */}
                    <div className="w-44 border-r border-ivory-400/60 p-2 bg-ivory-300/50">
                      {categories.map((category, i) => (
                        <Link
                          key={category.id}
                          href={`/collections/${category.slug}`}
                          onMouseEnter={() => setActiveMain(i)}
                          className={cn(
                            "block w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                            activeMain === i
                              ? "bg-ivory-100 text-gold-600"
                              : "text-ink-500 hover:bg-ivory-100 hover:text-lapis-600"
                          )}
                        >
                          {category.name_en}
                        </Link>
                      ))}
                    </div>

                    {/* Right: subcategory grid */}
                    <div className="flex-1 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-display text-lg text-lapis-500">
                          {categories[activeMain ?? 0]?.name_en}
                        </span>
                        <Link
                          href={`/collections/${categories[activeMain ?? 0]?.slug}`}
                          className="text-xs font-medium text-gold-500 hover:text-gold-600 flex items-center gap-0.5"
                        >
                          View all <ChevronRight size={12} />
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-h-[320px] overflow-y-auto pr-2">
                        {(categories[activeMain ?? 0]?.children || []).map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/collections/${sub.slug}`}
                            className="text-sm text-ink-500 hover:text-gold-600 py-1 transition-colors"
                          >
                            {sub.name_en}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-sm text-ink-400">
                    No collections yet.
                  </div>
                )}
              </div>
            </li>

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
            <CurrencySwitcher className="hidden md:inline-flex" />
            {/* Search */}
            <Link
              href="/search"
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
            </Link>

            {/* Account */}
            <Link
              href="/account"
              aria-label="Account"
              className={cn(
                "hidden md:flex p-2 rounded-brand",
                "text-lapis-500 hover:text-lapis-700 hover:bg-lapis-50",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
              )}
            >
              <User size={18} strokeWidth={1.75} />
            </Link>

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
          <nav className="container mx-auto flex-1 flex flex-col overflow-y-auto gap-2 py-8">
            <Link
              href="/collections"
              className={cn(
                "group flex items-center justify-between",
                "py-4 border-b border-ivory-400",
                "text-2xl font-display font-medium",
                "transition-colors duration-150",
                pathname === "/collections" ? "text-gold-500" : "text-lapis-500 hover:text-lapis-700",
                "animate-fade-up",
              )}
            >
              All Collections
            </Link>

            <div className="flex flex-col border-b border-ivory-400 pb-4 animate-fade-up">
              {categories.map((category) => (
                <div key={category.id} className="py-2">
                  <Link
                    href={`/collections/${category.slug}`}
                    className={cn(
                      "block text-lg font-display text-lapis-500 hover:text-lapis-700 transition-colors py-2"
                    )}
                  >
                    {category.name_en}
                  </Link>
                  <div className="pl-4 grid grid-cols-2 gap-x-4">
                    {category.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/collections/${sub.slug}`}
                        className="py-1.5 text-sm text-ink-500 hover:text-gold-600"
                      >
                        {sub.name_en}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {NAV_LINKS.map(({ href, label }, i) => {
              const isActive = pathname === href || ((href as string) !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between",
                    "py-4 border-b border-ivory-400",
                    "text-2xl font-display font-medium",
                    "transition-colors duration-150",
                    isActive ? "text-gold-500" : "text-lapis-500 hover:text-lapis-700",
                    "animate-fade-up",
                  )}
                  style={{ animationDelay: `${(i + 1) * 60}ms` }}
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
