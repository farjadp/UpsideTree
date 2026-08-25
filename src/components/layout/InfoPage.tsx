// ============================================================================
// File: upside-tree/src/components/layout/InfoPage.tsx
// Why: Shared shell for the footer's information pages (shipping, care,
//      FAQ, legal…). One layout so every info page reads as part of the
//      same store: bilingual heading, measured column, consistent type.
// ============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfoPage({
  titleEn,
  titleFa,
  intro,
  children,
}: {
  titleEn: string;
  titleFa: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-[calc(var(--navbar-height)+4rem)] pb-24 min-h-[60vh]">
      <div className="container mx-auto">
        <div className="max-w-[720px]">
          <div className="flex items-baseline gap-4 flex-wrap mb-4">
            <h1 className="font-display text-display-md text-lapis-500 font-semibold">{titleEn}</h1>
            <span className="font-persian text-xl font-medium text-gold-600" lang="fa" dir="rtl" aria-hidden="true">
              {titleFa}
            </span>
          </div>
          {intro && <p className="font-body text-base text-ink-400 leading-relaxed mb-10">{intro}</p>}
          <div
            className={cn(
              "flex flex-col gap-8",
              "[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink-500",
              "[&_p]:font-body [&_p]:text-base [&_p]:text-ink-400 [&_p]:leading-relaxed",
              "[&_li]:font-body [&_li]:text-base [&_li]:text-ink-400 [&_li]:leading-relaxed",
              "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2",
              "[&_a]:text-lapis-500 [&_a]:font-medium hover:[&_a]:text-turquoise-500",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
