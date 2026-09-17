// Canadian sales tax for checkout.
//
// Rates live in public.tax_rates, one row per tax per province (GST + PST
// are two rows). A row only applies when active: the store is not registered
// for GST/HST yet, so every row ships inactive. Registering means switching
// the GST/HST rows on (see migration 20260917100002_canada_tax_rates.sql).
// Destinations outside Canada get no Canadian tax (exports are zero-rated).

export const CA_PROVINCES: Array<{ code: string; en: string; fa: string }> = [
  { code: "AB", en: "Alberta", fa: "آلبرتا" },
  { code: "BC", en: "British Columbia", fa: "بریتیش کلمبیا" },
  { code: "MB", en: "Manitoba", fa: "منیتوبا" },
  { code: "NB", en: "New Brunswick", fa: "نیوبرانزویک" },
  { code: "NL", en: "Newfoundland and Labrador", fa: "نیوفاندلند و لابرادور" },
  { code: "NS", en: "Nova Scotia", fa: "نوا اسکوشیا" },
  { code: "NT", en: "Northwest Territories", fa: "قلمرو شمال غربی" },
  { code: "NU", en: "Nunavut", fa: "نوناووت" },
  { code: "ON", en: "Ontario", fa: "انتاریو" },
  { code: "PE", en: "Prince Edward Island", fa: "جزیره پرنس ادوارد" },
  { code: "QC", en: "Quebec", fa: "کبک" },
  { code: "SK", en: "Saskatchewan", fa: "ساسکاچوان" },
  { code: "YT", en: "Yukon", fa: "یوکان" },
];

const PROVINCE_ALIASES: Record<string, string> = {
  "PEI": "PE",
  "P.E.I.": "PE",
  "NEWFOUNDLAND": "NL",
  "LABRADOR": "NL",
  "QUÉBEC": "QC",
  "YUKON TERRITORY": "YT",
  "NWT": "NT",
};

/** Two-letter code for a Canadian province typed or picked any common way; null if unknown. */
export function normalizeCaProvince(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!raw) return null;
  const match = CA_PROVINCES.find((p) => p.code === raw || p.en.toUpperCase() === raw);
  return match?.code ?? PROVINCE_ALIASES[raw] ?? null;
}

export type TaxRateRow = { tax_name: string; rate: number | string; compound: boolean | null };

/**
 * Tax on a taxable base from a province's active rows. Non-compound rates
 * apply to the base; a compound rate applies to the base plus the taxes
 * before it (none of today's Canadian rates are compound).
 */
export function computeTax(base: number, rows: TaxRateRow[]): number {
  const simple = rows.filter((row) => !row.compound).reduce((sum, row) => sum + base * Number(row.rate), 0);
  const compound = rows
    .filter((row) => row.compound)
    .reduce((sum, row) => sum + (base + simple + sum) * Number(row.rate), 0);
  return Math.round((simple + compound) * 100) / 100;
}
