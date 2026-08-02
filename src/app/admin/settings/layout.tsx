"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings2,
  Palette,
  Menu,
  Megaphone,
  Search,
  Bot,
  CreditCard,
  Truck,
  Mail,
  Receipt,
  Blocks,
  Shield,
  Forward,
  Code2,
  Wrench
} from "lucide-react";

const settingsNavigation = [
  { name: "General", href: "/admin/settings", icon: Settings2 },
  { name: "Branding", href: "/admin/settings/branding", icon: Palette },
  { name: "Navigation & Menus", href: "/admin/settings/navigation", icon: Menu },
  { name: "Announcements", href: "/admin/settings/announcements", icon: Megaphone },
  { name: "SEO", href: "/admin/settings/seo", icon: Search },
  { name: "AIO", href: "/admin/settings/aio", icon: Bot },
  { name: "Payments", href: "/admin/settings/payments", icon: CreditCard },
  { name: "Shipping", href: "/admin/settings/shipping", icon: Truck },
  { name: "Email", href: "/admin/settings/email", icon: Mail },
  { name: "Taxes", href: "/admin/settings/taxes", icon: Receipt },
  { name: "Integrations", href: "/admin/settings/integrations", icon: Blocks },
  { name: "Security", href: "/admin/settings/security", icon: Shield },
  { name: "Redirects", href: "/admin/settings/redirects", icon: Forward },
  { name: "Custom Scripts", href: "/admin/settings/scripts", icon: Code2 },
  { name: "Advanced", href: "/admin/settings/advanced", icon: Wrench },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Settings Sidebar */}
      <aside className="lg:w-64 shrink-0">
        <div className="sticky top-6">
          <h1 className="text-2xl font-bold font-display text-white mb-6">Settings</h1>
          <nav className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 mr-3 h-5 w-5",
                      isActive ? "text-gold-400" : "text-slate-500 group-hover:text-gold-300"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Settings Content */}
      <div className="flex-1 min-w-0 max-w-4xl bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
