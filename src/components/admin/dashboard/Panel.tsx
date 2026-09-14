import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "pomegranate" | "emerald" | "gold" | "turquoise";

const TONES: Record<Tone, { box: string; icon: string }> = {
  blue: { box: "bg-blue-500/10 border-blue-500/20", icon: "text-blue-400" },
  pomegranate: { box: "bg-pomegranate-500/10 border-pomegranate-500/20", icon: "text-pomegranate-400" },
  emerald: { box: "bg-emerald-500/10 border-emerald-500/20", icon: "text-emerald-400" },
  gold: { box: "bg-gold-500/10 border-gold-500/20", icon: "text-gold-400" },
  turquoise: { box: "bg-turquoise-500/10 border-turquoise-500/20", icon: "text-turquoise-400" },
};

export function Panel({
  title,
  subtitle,
  icon: Icon,
  tone = "blue",
  href,
  linkLabel,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6 flex flex-col ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        {Icon && (
          <div className={`p-2 rounded-xl border ${TONES[tone].box}`}>
            <Icon className={`w-5 h-5 ${TONES[tone].icon}`} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="ml-auto shrink-0 text-xs font-semibold text-slate-400 hover:text-white">
            {linkLabel ?? "View all"} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Small inline note for a widget whose query failed; the rest of the page still renders. */
export function QueryErrorNote({ what, message }: { what: string; message: string }) {
  return (
    <p className="rounded-xl border border-pomegranate-500/30 bg-pomegranate-500/10 px-3 py-2 text-xs text-pomegranate-300">
      Couldn&apos;t load {what}: {message}
    </p>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}
