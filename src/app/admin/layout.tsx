"use client";

import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/admin/login" || 
                     pathname === "/admin/register" || 
                     pathname === "/admin/forgot-password" || 
                     pathname === "/admin/update-password";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-300 font-ui relative">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-lapis-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-turquoise-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[80%] left-[20%] w-[30%] h-[30%] bg-gold-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <Sidebar />
      <div className="flex flex-col flex-1 lg:pl-[290px] relative z-10 transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
