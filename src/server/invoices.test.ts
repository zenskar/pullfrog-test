import { describe, expect, it } from "vitest";

import { AppError } from "#/lib/errors";

import { invoiceTotal, transitionStatus } from "./invoices";
import type { Invoice } from "./store";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    currency: "USD",
    customerId: "cus_000001",
    id: "inv_000001",
    lineItems: [{ description: "Seat", quantity: 3, unitAmountMinor: 1999 }],
    status: "draft",
    tenantId: "tenant_a",
    ...overrides,
  };
}

/** Narrows a transition result, failing the test if it went the other way. */
function expectInvoice(result: Invoice | AppError): Invoice {
  if (result instanceof AppError) {
    throw new TypeError(`expected an invoice, got AppError(${result.code})`);
  }
  return result;
}

function expectAppError(result: Invoice | AppError): AppError {
  if (!(result instanceof AppError)) {
    throw new TypeError(`expected an AppError, got invoice ${result.id}`);
  }
  return result;
}

describe(invoiceTotal, () => {
  it("multiplies each line by its quantity and sums in minor units", () => {
    const total = invoiceTotal(
      invoice({
        lineItems: [
          { description: "Seat", quantity: 3, unitAmountMinor: 1999 },
          { description: "Support", quantity: 1, unitAmountMinor: 5000 },
        ],
      })
    );

    expect(total).toStrictEqual({ amountMinor: 10_997, currency: "USD" });
  });

  it("totals an invoice with no lines to zero", () => {
    expect(invoiceTotal(invoice({ lineItems: [] }))).toStrictEqual({
      amountMinor: 0,
      currency: "USD",
    });
  });
});

describe(transitionStatus, () => {
  it("allows draft to open", () => {
    const next = expectInvoice(
      transitionStatus(invoice({ status: "draft" }), "open")
    );
    expect(next.status).toBe("open");
  });

  it("rejects a transition out of a terminal status", () => {
    const next = expectAppError(
      transitionStatus(invoice({ status: "paid" }), "open")
    );
    expect(next.code).toBe("invalid_state");
  });

  it("rejects skipping straight from draft to paid", () => {
    const next = expectAppError(
      transitionStatus(invoice({ status: "draft" }), "paid")
    );
    expect(next.code).toBe("invalid_state");
  });

  it("rejects a no-op transition", () => {
    const next = expectAppError(
      transitionStatus(invoice({ status: "open" }), "open")
    );
    expect(next.code).toBe("invalid_state");
  });

  it("does not mutate the input invoice", () => {
    const original = invoice({ status: "draft" });
    transitionStatus(original, "open");
    expect(original.status).toBe("draft");
  });
});
