import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

// Words that shouldn't be naively title-cased when a section name is
// derived from the URL.
const WORD_OVERRIDES: Record<string, string> = {
  aio: "AIO",
  seo: "SEO",
  api: "API",
  ai: "AI",
  pod: "POD",
  faq: "FAQ",
  sms: "SMS",
  scripts: "Custom Scripts",
  navigation: "Navigation & Menus",
};

/** "/admin/settings/seo" segments ["seo"] → "SEO"; ["gift-cards"] → "Gift Cards". */
export function sectionNameFromSegments(segments: string[] | undefined, fallback = "This section") {
  const last = segments?.filter(Boolean).at(-1);
  if (!last) return fallback;

  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    // Malformed escape sequence: fall back to the raw segment.
  }

  const key = decoded.toLowerCase();
  if (WORD_OVERRIDES[key]) return WORD_OVERRIDES[key];

  return decoded
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => WORD_OVERRIDES[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .slice(0, 60);
}

type AdminComingSoonProps = {
  section: string;
  title?: string;
  description?: string;
  /** Extra link shown next to the dashboard button, e.g. back to Settings. */
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Compact variant for nested layouts (settings panel). */
  compact?: boolean;
};

export function AdminComingSoon({
  section,
  title,
  description,
  secondaryHref,
  secondaryLabel,
  compact = false,
}: AdminComingSoonProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "px-6 py-16"
          : "min-h-[60vh] rounded-2xl border border-white/10 bg-slate-900/50 px-6 py-20 backdrop-blur-sm"
      )}
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10">
        <Sprout className="h-7 w-7 text-gold-400" aria-hidden="true" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section}</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
        {title ?? "Coming soon"}
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        {description ?? `${section} isn't built yet, so there's no data here yet. Check back once it ships.`}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl bg-lapis-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lapis-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
