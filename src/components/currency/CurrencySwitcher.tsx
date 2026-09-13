"use client";

import { useCurrencyStore, type DisplayCurrency } from "@/store/useCurrencyStore";
import { useMoney } from "@/components/currency/CurrencyProvider";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: DisplayCurrency; label: string }> = [
  { value: "CAD", label: "CAD $" },
  { value: "EUR", label: "EUR €" },
];

export function CurrencySwitcher({ className }: { className?: string }) {
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const { currency, eurAvailable } = useMoney();

  if (!eurAvailable) {
    return <span className={cn("text-xs text-ink-400 border border-ivory-500 rounded px-2 py-0.5", className)}>CAD $</span>;
  }

  return (
    <div
      role="group"
      aria-label="Currency"
      className={cn("inline-flex items-center rounded border border-ivory-500 p-0.5 text-xs", className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setCurrency(option.value)}
          aria-pressed={currency === option.value}
          className={cn(
            "rounded px-2 py-0.5 transition-colors",
            currency === option.value ? "bg-lapis-500 text-white" : "text-ink-400 hover:text-lapis-500"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
