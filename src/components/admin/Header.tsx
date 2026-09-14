"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, UserCircle, LogOut } from "lucide-react";
import { signOutFromAdmin } from "@/app/admin/login/actions";
import { createClient } from "@/utils/supabase/client";

type AdminIdentity = { name: string; role: string };

export function Header() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  // null = not loaded (or failed): show no badge rather than a made-up one.
  const [unresolvedErrors, setUnresolvedErrors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return;

        const [profile, errors] = await Promise.all([
          supabase
            .from("customer_profiles")
            .select("display_name, first_name, last_name, email, role")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("system_event_logs")
            .select("id", { count: "exact", head: true })
            .in("severity", ["error", "critical"])
            .is("resolved_at", null),
        ]);
        if (cancelled) return;

        const p = profile.data;
        const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ");
        setIdentity({
          name: p?.display_name || fullName || p?.email || user.email || "Signed in",
          role: p?.role ? p.role.charAt(0) + p.role.slice(1).toLowerCase() : "",
        });
        if (!errors.error) setUnresolvedErrors(errors.count ?? 0);
      } catch {
        // Header chrome only; leave identity and badge empty on failure.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const errorLabel =
    unresolvedErrors === null
      ? "System logs"
      : unresolvedErrors === 0
        ? "No unresolved errors"
        : `${unresolvedErrors} unresolved error${unresolvedErrors === 1 ? "" : "s"}`;

  return (
    <header className="sticky top-4 z-30 flex items-center justify-between h-20 px-6 mx-4 mb-8 bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-4 flex-1">
        <button className="p-2 text-slate-400 hover:text-white lg:hidden transition-colors">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/admin/logs"
          title={errorLabel}
          aria-label={errorLabel}
          className="relative p-2 text-slate-400 hover:text-white transition-colors"
        >
          {unresolvedErrors !== null && unresolvedErrors > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-pomegranate-500 border-2 border-slate-950 text-[10px] font-bold leading-none text-white">
              {unresolvedErrors > 99 ? "99+" : unresolvedErrors}
            </span>
          )}
          <Bell className="h-5 w-5" />
        </Link>

        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-3 group">
          {identity && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{identity.name}</span>
              {identity.role && <span className="text-xs text-slate-500">{identity.role}</span>}
            </div>
          )}
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-lapis-600 to-turquoise-500 p-[2px] shadow-lg">
            <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-white/80" />
            </div>
          </div>
        </div>

        <form action={signOutFromAdmin}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
