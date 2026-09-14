import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 25;

export type AdminSearchParams = Record<string, string | string[] | undefined>;

/** Parse a `?page=` value into a 1-based page number (invalid → 1). */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Inclusive `from`/`to` offsets for Supabase `.range(from, to)`. */
export function pageRange(page: number, pageSize: number = ADMIN_PAGE_SIZE) {
  const from = (Math.max(1, page) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/**
 * PostgREST answers a `.range()` past the last row with PGRST103 ("Requested
 * range not satisfiable"). Pages use this to bounce back to page 1.
 */
export function isRangeNotSatisfiable(error: { code?: string | null } | null | undefined) {
  return error?.code === "PGRST103";
}

/**
 * Build an href for `basePath` that keeps every current search param and
 * sets `pageParam` to `page` (page 1 drops the param for clean URLs).
 */
export function buildPageHref(
  basePath: string,
  searchParams: AdminSearchParams | URLSearchParams | undefined,
  page: number,
  pageParam = "page"
) {
  const params = new URLSearchParams();

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => params.append(key, value));
  } else if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        params.append(key, item);
      }
    }
  }

  params.delete(pageParam);
  if (page > 1) params.set(pageParam, String(page));

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

type AdminPaginationProps = {
  /** Current 1-based page. */
  page: number;
  /** Total matching rows (from `{ count: "exact" }`). */
  total: number;
  pageSize?: number;
  /** Path the page links point at, e.g. "/admin/orders". Ignored when `buildHref` is given. */
  basePath?: string;
  /** Current search params; preserved in page links. */
  searchParams?: AdminSearchParams | URLSearchParams;
  /** Search-param name holding the page number. Defaults to "page". */
  pageParam?: string;
  /** Custom href builder; takes precedence over basePath/searchParams. */
  buildHref?: (page: number) => string;
  /** Noun for the total, e.g. "orders". */
  itemLabel?: string;
  /** Match the surrounding surface: dark glass (default) or light cards. */
  tone?: keyof typeof TONES;
  className?: string;
};

const TONES = {
  dark: {
    nav: "text-slate-400",
    strong: "font-medium text-slate-200",
    link: "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
    disabled: "border-white/5 bg-slate-950/30 text-slate-600",
  },
  light: {
    nav: "text-gray-500",
    strong: "font-medium text-gray-900",
    link: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
    disabled: "border-gray-100 bg-gray-50 text-gray-300",
  },
} as const;

const buttonBase = "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors";

export function AdminPagination({
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  basePath = "",
  searchParams,
  pageParam = "page",
  buildHref,
  itemLabel = "results",
  tone = "dark",
  className,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const hrefFor = (target: number) =>
    buildHref ? buildHref(target) : buildPageHref(basePath, searchParams, target, pageParam);

  const t = TONES[tone];
  const linkClass = cn(buttonBase, t.link);
  const disabledClass = cn(buttonBase, t.disabled, "cursor-not-allowed");

  const firstRow = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between",
        t.nav,
        className
      )}
    >
      <p>
        {total === 0 ? (
          <>No {itemLabel}</>
        ) : (
          <>
            Showing <span className={t.strong}>{firstRow.toLocaleString()}</span>–
            <span className={t.strong}>{lastRow.toLocaleString()}</span> of{" "}
            <span className={t.strong}>{total.toLocaleString()}</span> {itemLabel}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {current > 1 ? (
          <Link href={hrefFor(current - 1)} className={linkClass} rel="prev">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </span>
        )}

        <span className="px-2 whitespace-nowrap">
          Page <span className={t.strong}>{current}</span> of{" "}
          <span className={t.strong}>{totalPages}</span>
        </span>

        {current < totalPages ? (
          <Link href={hrefFor(current + 1)} className={linkClass} rel="next">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
