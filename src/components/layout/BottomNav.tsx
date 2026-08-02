// ============================================================================
// File: upside-tree/src/components/layout/BottomNav.tsx
// Version: 1.0.0 — 2026-08-01
// Why: PWA-style bottom navigation bar for mobile devices.
//      Visible only on screens < md (768px). Hidden on desktop where the
//      top Navbar handles all navigation.
//
//      Design:
//        - Fixed to bottom, respects iOS safe-area-inset-bottom
//        - Ivory background with subtle top border
//        - 5 tabs: Home / Collections / Search / Cart / Account
//        - Active tab: Gold accent + filled icon
//        - Inactive tabs: Lapis blue, outlined icons
//        - Cart tab shows badge for item count
//
//      PWA note: CSS `env(safe-area-inset-bottom)` ensures the nav
//      doesn't overlap the iOS home indicator bar when installed as PWA.
// Env / Identity: Frontend (React Client Component)
// ============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Tab config
// ------------------------------------------------------------------

const TABS = [
  {
    id:     "home",
    href:   "/",
    label:  "Home",
    icon:   Home,
    exact:  true,
  },
  {
    id:     "collections",
    href:   "/collections",
    label:  "Collections",
    icon:   Grid3X3,
    exact:  false,
  },
  {
    id:     "search",
    href:   "/search",
    label:  "Search",
    icon:   Search,
    exact:  false,
  },
  {
    id:     "cart",
    href:   "/cart",
    label:  "Cart",
    icon:   ShoppingBag,
    exact:  false,
  },
  {
    id:     "account",
    href:   "/account",
    label:  "Account",
    icon:   User,
    exact:  false,
  },
] as const;

// ------------------------------------------------------------------
// BottomNav Component
// ------------------------------------------------------------------

export function BottomNav() {
  const pathname   = usePathname();
  const cartCount  = 0; // Phase 2: connect to cart context

  return (
    <nav
      id="bottom-nav"
      className={cn(
        // Only visible on mobile
        "md:hidden",
        // Fixed position respecting safe area
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-ivory-200/95 backdrop-blur-brand",
        "border-t border-ivory-400",
        // Safe area for iOS PWA home indicator
        "pb-[env(safe-area-inset-bottom)]",
        "shadow-[0_-2px_16px_rgba(24,35,31,0.08)]",
      )}
      aria-label="Mobile navigation"
    >
      <ul
        className="flex items-center justify-around h-[56px]"
        role="list"
      >
        {TABS.map(({ id, href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href) && (href as string) !== "/";

          const isCartTab   = id === "cart";
          const iconSize    = 21;

          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                id={`bottom-nav-${id}`}
                aria-label={isCartTab && cartCount > 0 ? `${label}, ${cartCount} items` : label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full",
                  "relative transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-lapis-500 rounded-sm",
                  isActive ? "text-gold-500" : "text-lapis-500",
                )}
              >
                {/* Icon wrapper */}
                <span className="relative">
                  <Icon
                    size={iconSize}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    fill={isActive ? "currentColor" : "none"}
                    className="transition-all duration-150"
                  />

                  {/* Cart badge */}
                  {isCartTab && cartCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1.5 -right-1.5",
                        "w-4 h-4 rounded-full",
                        "bg-pomegranate-500 text-white",
                        "text-[9px] font-bold leading-none",
                        "flex items-center justify-center",
                        "pointer-events-none",
                      )}
                      aria-hidden="true"
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </span>

                {/* Tab label */}
                <span
                  className={cn(
                    "text-[9px] font-medium leading-none tracking-wide",
                    isActive ? "text-gold-500" : "text-ink-400",
                  )}
                >
                  {label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-500"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
