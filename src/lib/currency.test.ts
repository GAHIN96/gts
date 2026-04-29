import { describe, expect, it } from "vitest";
import { roundCurrency, sumCurrency, totalLineItems } from "./currency";

describe("roundCurrency", () => {
  it("rounds to 2 decimals (half away from zero)", () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(2.345)).toBe(2.35);
    expect(roundCurrency(2.344)).toBe(2.34);
    expect(roundCurrency(0)).toBe(0);
  });

  it("neutralizes classic IEEE-754 drift", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3); // 0.30000000000000004
    expect(roundCurrency(1.1 + 2.2)).toBe(3.3); // 3.3000000000000003
    expect(roundCurrency(70 * 0.1 * 3)).toBe(21); // 20.999999999999996
  });

  it("handles negatives symmetrically", () => {
    expect(roundCurrency(-1.005)).toBe(-1.01);
    expect(roundCurrency(-2.344)).toBe(-2.34);
  });

  it("returns 0 for non-finite values", () => {
    expect(roundCurrency(NaN)).toBe(0);
    expect(roundCurrency(Infinity)).toBe(0);
    expect(roundCurrency(-Infinity)).toBe(0);
  });
});

describe("sumCurrency", () => {
  it("rounds each value before summing", () => {
    expect(sumCurrency([0.1, 0.2, 0.3])).toBe(0.6);
    expect(sumCurrency([10.005, 20.005, 30.005])).toBe(60.03);
  });

  it("matches naive sum once both are rounded", () => {
    const values = [33.33, 33.33, 33.34];
    expect(sumCurrency(values)).toBe(100);
  });

  it("returns 0 for empty input", () => {
    expect(sumCurrency([])).toBe(0);
  });
});

describe("totalLineItems — multi-room booking totals", () => {
  it("3 rooms × 3 nights at La Quinta 1–5 tier (mixed types) is exact", () => {
    // Screenshot scenario: Single $100, Double+Extra Bed $120, Double $110, all × 3 nights.
    const lines = [
      { unitPrice: 100, quantity: 3 }, // Single
      { unitPrice: 120, quantity: 3 }, // Double + Extra Bed
      { unitPrice: 110, quantity: 3 }, // Double
    ];
    // 300 + 360 + 330 = 990
    expect(totalLineItems(lines)).toBe(990);
  });

  it("does not drift across many rooms with awkward decimal prices", () => {
    // 7 rooms × 5 nights × $19.99 — naive math = 699.6500000000001
    const lines = Array.from({ length: 7 }, () => ({
      unitPrice: 19.99,
      quantity: 5,
    }));
    expect(totalLineItems(lines)).toBe(699.65);
  });

  it("locks line-total display to grand-total (no off-by-one cents)", () => {
    // Each line: 0.1 × 3 = 0.3 (rounded). Sum of 10 lines = 3.00 exactly.
    const lines = Array.from({ length: 10 }, () => ({
      unitPrice: 0.1,
      quantity: 3,
    }));
    const grand = totalLineItems(lines);
    const displayedSum = lines
      .map((l) => roundCurrency(l.unitPrice * l.quantity))
      .reduce((a, b) => a + b, 0);
    expect(grand).toBe(3);
    expect(roundCurrency(displayedSum)).toBe(grand);
  });

  it("re-running the calculation yields identical totals (idempotent)", () => {
    const lines = [
      { unitPrice: 110, quantity: 3 },
      { unitPrice: 120, quantity: 3 },
      { unitPrice: 100, quantity: 3 },
    ];
    const a = totalLineItems(lines);
    const b = totalLineItems(lines);
    const c = totalLineItems([...lines].reverse());
    expect(a).toBe(b);
    expect(a).toBe(c); // order-independent
  });

  it("handles fractional nightly rates (e.g. promo 99.95) across 12 rooms × 7 nights", () => {
    const lines = Array.from({ length: 12 }, () => ({
      unitPrice: 99.95,
      quantity: 7,
    }));
    // 99.95 × 7 = 699.65 per room; × 12 = 8395.80
    expect(totalLineItems(lines)).toBe(8395.8);
  });
});
