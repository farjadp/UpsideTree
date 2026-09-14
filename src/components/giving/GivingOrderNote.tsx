"use client";

import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { useGivingEnabled } from "@/components/giving/GivingProvider";
import { useLanguageStore } from "@/store/useLanguageStore";

/** "3% of this order (X) goes to…" — amount already formatted in the display currency. */
export function GivingOrderNote({ formattedAmount }: { formattedAmount: string }) {
  const enabled = useGivingEnabled();
  const isFa = useLanguageStore((state) => state.language) === "fa";
  if (!enabled) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg bg-ivory-200 px-3 py-2 text-xs text-ink-400">
      <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-lapis-500" aria-hidden="true" />
      <span>
        {isFa
          ? `۳٪ از مبلغ محصولات این سفارش (${formattedAmount}) از طریق خیریه‌های معتبر صرف کمک به مردم نیازمند ایران می‌شود. `
          : `3% of this order's product total (${formattedAmount}) goes to people in need in Iran, through registered charities. `}
        <Link href="/giving" className="text-lapis-500 underline underline-offset-2">
          {isFa ? "گزارش‌ها" : "Reports"}
        </Link>
      </span>
    </p>
  );
}
