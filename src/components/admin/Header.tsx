import { Bell, Search, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-4 z-30 flex items-center justify-between h-20 px-6 mx-4 mb-8 bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-4 flex-1">
        <button className="p-2 text-slate-400 hover:text-white lg:hidden transition-colors">
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="relative max-w-md w-full hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 focus:border-lapis-500/50 sm:text-sm transition-all shadow-inner"
            placeholder="Search orders, customers, products (Cmd+K)"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-pomegranate-500 rounded-full border-2 border-slate-950 animate-pulse"></span>
          <Bell className="h-5 w-5" />
        </button>
        
        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
        
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Admin User</span>
            <span className="text-xs text-slate-500">Super Admin</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-lapis-600 to-turquoise-500 p-[2px] shadow-lg">
            <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-white/80" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
