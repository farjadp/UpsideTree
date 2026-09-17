import { describe, expect, it } from "vitest";
import { GIVING_RATE, TARGET_MARGIN, isMarginInBand, netMargin, netProfit, priceForCost } from "./pricing";

describe("priceForCost", () => {
  it.each([2.04, 7.22, 9.25, 13.88, 25.66, 30.98, 42.15, 105.04, 146.27])("leaves 13%% of the price at cost %d, to the cent", (cost) => {
    const price = priceForCost(cost);
    expect(netMargin(price, cost)).toBeGreaterThanOrEqual(TARGET_MARGIN - 1e-9);
    expect(netMargin(price - 0.01, cost)).toBeLessThan(TARGET_MARGIN);
    expect(Math.abs(price * 100 - Math.round(price * 100))).toBeLessThan(1e-6);
  });

  it("prices a CA$30.98 hoodie cost at CA$37.20", () => {
    expect(priceForCost(30.98)).toBe(37.2);
  });

  it("keeps 10% for the owner once 3% giving comes out of the margin", () => {
    const cost = 30.98;
    const price = priceForCost(cost);
    const kept = netProfit(price, cost) - price * GIVING_RATE;
    expect(kept / price).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });
});

describe("isMarginInBand", () => {
  it("accepts only the exact price, so any cost change reprices", () => {
    const cost = 25.66;
    expect(isMarginInBand(priceForCost(cost), cost)).toBe(true);
    expect(isMarginInBand(priceForCost(cost) + 0.01, cost)).toBe(false);
    expect(isMarginInBand(41.99, cost)).toBe(false);
  });
});
