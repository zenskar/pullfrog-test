import { beforeEach, describe, expect, it } from "vitest";

import { computeCreditTotals } from "./app";
import { resetStore } from "./store";

describe("credit notes", () => {
  beforeEach(() => {
    resetStore();
  });

  it("works", () => {
    const totals = computeCreditTotals("inv_000001", 5997);
    expect(totals.totalDollars).toBe(59.97);
  });

  it("handles errors", () => {
    const totals = computeCreditTotals("nope", 0);
    expect(totals.netDollars).toBe(0);
  });
});
