// Pricing for print-on-demand products: one net margin for everything.
//
// Every price leaves exactly TARGET_MARGIN of the shelf price after what a
// sale costs: the Printify production cost (CAD, already padded for card FX
// fees) and Stripe's fee. The giving commitment (GIVING_RATE) is paid out of
// that margin, not added on top of it: of the 13%, 3% goes to giving and 10%
// stays. Shipping is charged to the customer at cost, so it's outside this
// calculation.
//
// Prices are exact to the cent (no .99 rounding) and follow cost: when the
// Printify cost or the exchange rate moves, the sync reprices the size.
//
// No server-only imports: the admin editor uses this to show margins.

export const TARGET_MARGIN = 0.13;

/** Kept for callers that show a band; the band is a single point. */
export const MARGIN_MIN = TARGET_MARGIN;
export const MARGIN_MAX = TARGET_MARGIN;

const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CAD = 0.3;

/** Share of each sale's product subtotal committed to giving; comes out of TARGET_MARGIN. */
export const GIVING_RATE = 0.03;

export function targetMargin() {
  return TARGET_MARGIN;
}

/** Net margin of a price (before giving), as a fraction of the price. */
export function netMargin(priceCad: number, costCad: number) {
  if (!(priceCad > 0)) return -1;
  return netProfit(priceCad, costCad) / priceCad;
}

/** What a sale leaves after Printify and Stripe, before giving. */
export function netProfit(priceCad: number, costCad: number) {
  return priceCad * (1 - STRIPE_PERCENT) - STRIPE_FIXED_CAD - costCad;
}

/** Shelf price for a cost: the lowest cent at which the margin reaches TARGET_MARGIN. */
export function priceForCost(costCad: number) {
  const exact = (costCad + STRIPE_FIXED_CAD) / (1 - TARGET_MARGIN - STRIPE_PERCENT);
  // Round the float first so 37.36000000001 doesn't become 37.37.
  return Math.ceil(Math.round(exact * 1e6) / 1e4) / 100;
}

/** True when a price is the one priceForCost gives, to the cent. */
export function isMarginInBand(priceCad: number, costCad: number) {
  return Math.abs(priceCad - priceForCost(costCad)) < 0.005;
}
