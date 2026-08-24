"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Gift, ShoppingBag, Settings, LogOut, MapPin, Heart, LifeBuoy } from "lucide-react";
import { signOutToHome } from "@/app/admin/login/actions";

const navigation = [
  { name: "My Profile", href: "/account", icon: User, exact: true },
  { name: "My Orders", href: "/account/orders", icon: ShoppingBag },
  { name: "Addresses", href: "/account/addresses", icon: MapPin },
  { name: "Wishlist", href: "/account/wishlist", icon: Heart },
  { name: "Loyalty Points", href: "/account/loyalty", icon: Gift },
  { name: "Support", href: "/account/support", icon: LifeBuoy },
  { name: "Settings", href: "/account/settings", icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // print:* strips the account chrome so /account/orders/<id>/invoice
    // prints as a clean standalone document.
    <div className="min-h-screen bg-[#F4EFE3] text-[#18231F] font-sans print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 print:max-w-none print:p-0">
        <h1 className="text-3xl font-serif font-bold text-[#18231F] mb-8 text-center md:text-left print:hidden">
          My Account <span className="text-gray-400 font-sans text-xl ml-2 font-normal">حساب کاربری من</span>
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 print:hidden">
            <nav className="space-y-1">
              {navigation.map((item) => {
                // Only "/account" needs an exact match — every other entry
                // has detail routes beneath it that should keep the parent
                // highlighted (e.g. /account/orders/<id>).
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-[#18231F] text-[#F4EFE3] shadow-md"
                        : "text-gray-600 hover:bg-white/50 hover:text-[#18231F]"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 shrink-0 h-5 w-5",
                        isActive ? "text-[#F4EFE3]" : "text-gray-400 group-hover:text-[#18231F]"
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}

              <div className="pt-8">
                <form action={signOutToHome}>
                  <button
                    type="submit"
                    className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    <LogOut className="mr-3 shrink-0 h-5 w-5 text-red-400 group-hover:text-red-600" />
                    Sign out
                  </button>
                </form>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white rounded-2xl shadow-sm border border-[#18231F]/5 p-6 md:p-10 min-h-[500px] print:min-h-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
