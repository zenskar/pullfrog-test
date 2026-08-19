import { describe, expect, it } from "vitest";

import {
  CurrencyMismatchError,
  add,
  format,
  money,
  multiply,
  sum,
} from "./money";

describe(money, () => {
  it("rejects non-integer minor units", () => {
    expect(() => money(10.5, "USD")).toThrow(TypeError);
  });

  it("adds same-currency amounts in minor units", () => {
    expect(add(money(1050, "USD"), money(295, "USD"))).toStrictEqual({
      amountMinor: 1345,
      currency: "USD",
    });
  });

  it("refuses to add across currencies", () => {
    expect(() => add(money(100, "USD"), money(100, "EUR"))).toThrow(
      CurrencyMismatchError
    );
  });

  it("sums an empty list to a zero amount in the given currency", () => {
    expect(sum([], "INR")).toStrictEqual({ amountMinor: 0, currency: "INR" });
  });

  it("multiplies by a whole quantity without drifting", () => {
    // 3 × $19.99 — the case a float representation would round wrong.
    expect(multiply(money(1999, "USD"), 3).amountMinor).toBe(5997);
  });

  it("rejects negative and fractional quantities", () => {
    expect(() => multiply(money(100, "USD"), -1)).toThrow(TypeError);
    expect(() => multiply(money(100, "USD"), 1.5)).toThrow(TypeError);
  });

  it("formats for display only", () => {
    expect(format(money(1999, "USD"))).toBe("$19.99");
  });
});
