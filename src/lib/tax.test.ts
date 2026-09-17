import { describe, expect, it } from "vitest";
import { computeTax, normalizeCaProvince } from "./tax";

describe("normalizeCaProvince", () => {
  it("accepts codes, full names and common aliases in any case", () => {
    expect(normalizeCaProvince("ON")).toBe("ON");
    expect(normalizeCaProvince("on")).toBe("ON");
    expect(normalizeCaProvince(" Ontario ")).toBe("ON");
    expect(normalizeCaProvince("british  columbia")).toBe("BC");
    expect(normalizeCaProvince("PEI")).toBe("PE");
    expect(normalizeCaProvince("Québec")).toBe("QC");
  });

  it("returns null for unknown or empty input", () => {
    expect(normalizeCaProvince("California")).toBeNull();
    expect(normalizeCaProvince("")).toBeNull();
    expect(normalizeCaProvince(undefined)).toBeNull();
  });
});

describe("computeTax", () => {
  it("is zero with no active rates", () => {
    expect(computeTax(100, [])).toBe(0);
  });

  it("applies a single HST rate", () => {
    expect(computeTax(37.32, [{ tax_name: "HST", rate: "0.130000", compound: false }])).toBe(4.85);
  });

  it("adds GST and PST on the same base", () => {
    expect(
      computeTax(100, [
        { tax_name: "GST", rate: 0.05, compound: false },
        { tax_name: "PST", rate: 0.07, compound: false },
      ])
    ).toBe(12);
  });

  it("applies a compound rate on top of the other taxes", () => {
    expect(
      computeTax(100, [
        { tax_name: "GST", rate: 0.05, compound: false },
        { tax_name: "X", rate: 0.1, compound: true },
      ])
    ).toBe(15.5);
  });
});
