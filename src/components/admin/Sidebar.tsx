import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  LineChart,
  Megaphone,
  FileText,
  Share2,
  Paintbrush,
  Settings,
  Folder,
  Image,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Collections", href: "/admin/collections", icon: Folder },
  { name: "Media", href: "/admin/media", icon: Image },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Analytics", href: "/admin/analytics", icon: LineChart },
  { name: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { name: "Content", href: "/admin/content", icon: FileText },
  { name: "Channels", href: "/admin/channels", icon: Share2 },
  { name: "Makers", href: "/admin/makers", icon: Paintbrush },
  { name: "Logs", href: "/admin/logs", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[260px] h-[calc(100vh-2rem)] fixed left-4 top-4 z-40 hidden lg:flex flex-col rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center justify-center h-20 shrink-0 px-6 font-display font-bold text-2xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-ivory-100 to-gold-400 border-b border-white/5">
        Upside Tree
      </div>
      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        <nav className="space-y-2 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-out overflow-hidden",
                  isActive
                    ? "text-white shadow-[0_0_20px_rgba(29,78,137,0.3)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-lapis-600/80 to-lapis-500/20 opacity-100" />
                )}
                <item.icon
                  className={cn(
                    "mr-3 shrink-0 h-5 w-5 transition-transform duration-300 relative z-10",
                    isActive ? "text-gold-300 scale-110" : "text-slate-500 group-hover:text-gold-200 group-hover:scale-110"
                  )}
                  aria-hidden="true"
                />
                <span className="relative z-10">{item.name}</span>
                
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gold-400 rounded-r-full shadow-[0_0_10px_rgba(180,134,53,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
