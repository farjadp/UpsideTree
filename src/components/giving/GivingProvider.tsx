"use client";

import { createContext, useContext, type ReactNode } from "react";

// Whether the 3% giving commitment is shown publicly (admin > Giving).
const GivingContext = createContext(false);

export function GivingProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <GivingContext.Provider value={enabled}>{children}</GivingContext.Provider>;
}

export function useGivingEnabled() {
  return useContext(GivingContext);
}

export const GIVING_COPY = {
  en: "3% of every order's product total goes to people in need in Iran, through registered charities.",
  fa: "۳٪ از مبلغ محصولات هر سفارش، از طریق خیریه‌های معتبر، صرف کمک به مردم نیازمند ایران می‌شود.",
};
