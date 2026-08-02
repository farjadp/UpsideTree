import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(
  price: number | string,
  optionsOrCurrency?: {
    currency?: string;
    notation?: Intl.NumberFormatOptions["notation"];
  } | string
) {
  let currency = "CAD";
  let notation: Intl.NumberFormatOptions["notation"] = "standard";

  if (typeof optionsOrCurrency === "string") {
    currency = optionsOrCurrency;
  } else if (optionsOrCurrency) {
    currency = optionsOrCurrency.currency || "CAD";
    notation = optionsOrCurrency.notation || "standard";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation,
  }).format(Number(price));
}
