// Margin-based pricing for print-on-demand products.
//
// "Margin" is net profit as a share of the shelf price, after everything a
// sale costs: the Printify production cost (CAD, already padded for card FX
// fees), Stripe's fee, and the giving commitment. Shipping is charged to the
// customer at cost, so it's outside this calculation.
//
// The target margin slides with cost: cheap items carry the top of the band
// (a 34% margin on a CA$15 mug is still only ~CA$5), expensive items the
// bottom (13% on a CA$100-cost canvas keeps the price competitive). Prices
// only move when a product's margin leaves the band, so exchange-rate noise
// doesn't reprice the catalog every day.
//
// No server-only imports: the admin editor uses this to show margins.

export const MARGIN_MIN = 0.13;
export const MARGIN_MAX = 0.34;

/** Cost (CAD) at which the target is MARGIN_MAX, and at which it reaches MARGIN_MIN. */
const LOW_COST_CAD = 8;
const HIGH_COST_CAD = 100;

const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CAD = 0.3;

/** Share of each sale's product subtotal committed to giving. */
export const GIVING_RATE = 0.03;

const VARIABLE_COSTS = STRIPE_PERCENT + GIVING_RATE;

export function targetMargin(costCad: number) {
  if (!(costCad > 0)) return MARGIN_MAX;
  const position = Math.log(costCad / LOW_COST_CAD) / Math.log(HIGH_COST_CAD / LOW_COST_CAD);
  const clamped = Math.min(1, Math.max(0, position));
  return MARGIN_MAX - clamped * (MARGIN_MAX - MARGIN_MIN);
}

/** Net margin of a price, as a fraction of the price. */
export function netMargin(priceCad: number, costCad: number) {
  if (!(priceCad > 0)) return -1;
  return (priceCad * (1 - VARIABLE_COSTS) - STRIPE_FIXED_CAD - costCad) / priceCad;
}

export function netProfit(priceCad: number, costCad: number) {
  return priceCad * (1 - VARIABLE_COSTS) - STRIPE_FIXED_CAD - costCad;
}

export function isMarginInBand(priceCad: number, costCad: number) {
  const margin = netMargin(priceCad, costCad);
  return margin >= MARGIN_MIN - 1e-9 && margin <= MARGIN_MAX + 1e-9;
}

/**
 * Shelf price for a cost: hits the target margin, then rounds to a familiar
 * price point (.49/.99 under $10, .99 above) without leaving the band.
 */
export function priceForCost(costCad: number) {
  const exact = (costCad + STRIPE_FIXED_CAD) / (1 - targetMargin(costCad) - VARIABLE_COSTS);

  const candidates = [
    exact < 10 ? Math.ceil(exact * 2) / 2 - 0.01 : Math.ceil(exact) - 0.01,
    exact < 10 ? Math.floor(exact * 2) / 2 - 0.01 : Math.floor(exact) - 0.01,
    Math.round(exact * 100) / 100,
  ].map((price) => Math.round(price * 100) / 100);

  return candidates.find((price) => price > 0 && isMarginInBand(price, costCad)) ?? candidates[2];
}
