import "server-only";

// Exchange rates for a store whose supplier bills in USD (Printify), whose
// catalog is priced in CAD, and which also sells in EUR.
//
// Source: European Central Bank reference rates via Frankfurter (free, no
// key), refreshed at most every 12 hours through Next's fetch cache. If the
// source is unreachable, FX_USD_CAD / FX_USD_EUR are used instead.

export const STORE_CURRENCIES = ["CAD", "EUR"] as const;
export type StoreCurrency = (typeof STORE_CURRENCIES)[number];

export type UsdRates = {
  CAD: number;
  EUR: number;
  date: string;
  source: "ecb" | "env";
};

const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD,EUR";

function envRates(): UsdRates {
  const CAD = Number(process.env.FX_USD_CAD);
  const EUR = Number(process.env.FX_USD_EUR);
  if (!(CAD > 0) || !(EUR > 0)) {
    throw new Error("Exchange rates unavailable: rate source failed and FX_USD_CAD / FX_USD_EUR are not set.");
  }
  return { CAD, EUR, date: "env", source: "env" };
}

export async function getUsdRates(): Promise<UsdRates> {
  try {
    const response = await fetch(RATES_URL, {
      next: { revalidate: 60 * 60 * 12 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return envRates();
    const data = (await response.json()) as { date?: string; rates?: { CAD?: number; EUR?: number } };
    const CAD = Number(data.rates?.CAD);
    const EUR = Number(data.rates?.EUR);
    if (!(CAD > 0) || !(EUR > 0)) return envRates();
    return { CAD, EUR, date: data.date ?? "", source: "ecb" };
  } catch {
    return envRates();
  }
}

/** CAD → other store currency multiplier. */
export function cadTo(currency: StoreCurrency, rates: UsdRates) {
  return currency === "CAD" ? 1 : rates.EUR / rates.CAD;
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

// Printify charges the card in USD, so the bank's conversion costs a little
// more than the reference rate. Costs are padded by this much (default 3%)
// wherever they're compared against CAD prices.
export function fxCostBuffer() {
  const value = Number(process.env.FX_COST_BUFFER);
  return Number.isFinite(value) && value >= 0 ? value : 0.03;
}

/** Supplier cost in USD → CAD, padded for card FX fees. */
export function usdCostToCad(usd: number, rates: UsdRates) {
  return roundMoney(usd * rates.CAD * (1 + fxCostBuffer()));
}

/**
 * Printify retail price (USD, as set in Printify) → CAD shelf price.
 * Rounded up to .99 above $5 (e.g. 17.62 → 17.99); cents below that, where
 * rounding to .99 would add a large percentage.
 */
export function usdRetailToCad(usd: number, rates: UsdRates) {
  const cad = usd * rates.CAD;
  if (cad < 5) return roundMoney(cad);
  return Math.ceil(cad) - 0.01;
}

/** Converts a CAD amount into the charge currency (identity for CAD). */
export function convertFromCad(cad: number, currency: StoreCurrency, rates: UsdRates) {
  return roundMoney(cad * cadTo(currency, rates));
}
