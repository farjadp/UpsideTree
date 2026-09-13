import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DisplayCurrency = "CAD" | "EUR";

interface CurrencyState {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "CAD",
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "ut-currency" }
  )
);
