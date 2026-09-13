"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { useCurrencyStore, type DisplayCurrency } from "@/store/useCurrencyStore";

// Prices are stored in CAD. This converts and formats them in the shopper's
// chosen currency with the same rate and rounding the server charges with
// (lib/fx convertFromCad), so a price shown is the price paid.

type RatesContextValue = { cadToEur: number | null };

const RatesContext = createContext<RatesContextValue>({ cadToEur: null });

export function CurrencyProvider({ cadToEur, children }: { cadToEur: number | null; children: ReactNode }) {
  return <RatesContext.Provider value={{ cadToEur }}>{children}</RatesContext.Provider>;
}

const FORMATTERS: Record<DisplayCurrency, Intl.NumberFormat> = {
  CAD: new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD" }),
  EUR: new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }),
};

// The persisted choice lives in localStorage, which the server can't see:
// render CAD until the store has hydrated on the client, then switch.
function useStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useCurrencyStore.persist.onFinishHydration(onChange),
    () => useCurrencyStore.persist.hasHydrated(),
    () => false
  );
}

export function useMoney() {
  const { cadToEur } = useContext(RatesContext);
  const chosen = useCurrencyStore((state) => state.currency);
  const hydrated = useStoreHydrated();

  // EUR is only offered when rates are available.
  const currency: DisplayCurrency = hydrated && chosen === "EUR" && cadToEur ? "EUR" : "CAD";

  const convert = useCallback(
    (cad: number | string | null | undefined) => {
      const value = Number(cad ?? 0);
      const converted = currency === "EUR" && cadToEur ? value * cadToEur : value;
      return Math.round(converted * 100) / 100;
    },
    [currency, cadToEur]
  );

  const format = useCallback(
    (cad: number | string | null | undefined) => FORMATTERS[currency].format(convert(cad)),
    [currency, convert]
  );

  /** Formats an amount that is already in the display currency. */
  const formatConverted = useCallback((amount: number) => FORMATTERS[currency].format(amount), [currency]);

  return { currency, convert, format, formatConverted, eurAvailable: Boolean(cadToEur) };
}
