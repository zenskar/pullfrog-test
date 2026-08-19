import { describe, expect, it } from "vitest";

import { creditedTotal, netTotal, validateCredit } from "./credit-notes";
import type { CreditNote, Invoice } from "./store";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    currency: "USD",
    customerId: "cus_000001",
    id: "inv_000001",
    // 3 × $19.99 = $59.97
    lineItems: [{ description: "Seat", quantity: 3, unitAmountMinor: 1999 }],
    status: "open",
    tenantId: "tenant_a",
    ...overrides,
  };
}

function note(amountMinor: number): CreditNote {
  return {
    amountMinor,
    currency: "USD",
    id: `cn_${amountMinor}`,
    invoiceId: "inv_000001",
    reason: "goodwill",
    tenantId: "tenant_a",
  };
}

describe(creditedTotal, () => {
  it("sums credit notes in minor units", () => {
    expect(creditedTotal([note(1000), note(999)], invoice())).toStrictEqual({
      amountMinor: 1999,
      currency: "USD",
    });
  });

  it("totals an uncredited invoice to zero", () => {
    expect(creditedTotal([], invoice())).toStrictEqual({
      amountMinor: 0,
      currency: "USD",
    });
  });
});

describe(netTotal, () => {
  it("subtracts credits from the invoice total", () => {
    expect(netTotal(invoice(), [note(1997)]).amountMinor).toBe(4000);
  });

  it("is the full total when nothing is credited", () => {
    expect(netTotal(invoice(), []).amountMinor).toBe(5997);
  });

  it("is zero when fully credited", () => {
    expect(netTotal(invoice(), [note(5997)]).amountMinor).toBe(0);
  });
});

describe(validateCredit, () => {
  it("accepts a credit within the remaining balance", () => {
    expect(validateCredit(invoice(), [], 5997)).toBeNull();
  });

  it("accepts a credit that exactly exhausts the balance", () => {
    expect(validateCredit(invoice(), [note(5000)], 997)).toBeNull();
  });

  it("rejects a credit that exceeds the invoice total", () => {
    const rejection = validateCredit(invoice(), [], 5998);
    expect(rejection?.code).toBe("credit_exceeds_invoice");
  });

  it("rejects a credit that exceeds the total once earlier credits count", () => {
    const rejection = validateCredit(invoice(), [note(5000)], 998);
    expect(rejection?.code).toBe("credit_exceeds_invoice");
  });

  it("rejects crediting a draft invoice", () => {
    const rejection = validateCredit(invoice({ status: "draft" }), [], 100);
    expect(rejection?.code).toBe("invalid_state");
  });

  it("rejects crediting a void invoice", () => {
    const rejection = validateCredit(invoice({ status: "void" }), [], 100);
    expect(rejection?.code).toBe("invalid_state");
  });
});
