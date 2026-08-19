/**
 * Invoice domain rules. Pure functions over already-validated domain objects —
 * validation happens at the HTTP boundary, not here.
 */

import type { AppError} from "#/lib/errors";
import { invalidState } from "#/lib/errors";
import { money, multiply, sum } from '#/lib/money';
import type { Money } from '#/lib/money';

import type { Invoice, InvoiceStatus, LineItem } from "./store";

/** Legal status transitions. Anything absent from this map is rejected. */
const ALLOWED_TRANSITIONS = {
  draft: ["open", "void"],
  open: ["paid", "void"],
  paid: [],
  void: [],
} satisfies Record<InvoiceStatus, readonly InvoiceStatus[]>;

export function lineItemTotal(
  item: LineItem,
  invoice: Pick<Invoice, "currency">
): Money {
  return multiply(money(item.unitAmountMinor, invoice.currency), item.quantity);
}

export function invoiceTotal(invoice: Invoice): Money {
  return sum(
    invoice.lineItems.map((item) => lineItemTotal(item, invoice)),
    invoice.currency
  );
}

/**
 * Validate a status change against the transition table. Returns the next
 * invoice rather than mutating, so callers decide when to persist.
 */
export function transitionStatus(
  invoice: Invoice,
  next: InvoiceStatus
): Invoice | AppError {
  if (invoice.status === next) {
    return invalidState(`invoice is already ${next}`, {
      invoiceId: invoice.id,
      status: next,
    });
  }
  // Widened on read: `satisfies` narrows the terminal entries to `never[]`.
  const allowed: readonly InvoiceStatus[] = ALLOWED_TRANSITIONS[invoice.status];
  if (!allowed.includes(next)) {
    return invalidState(
      `cannot move invoice from ${invoice.status} to ${next}`,
      {
        from: invoice.status,
        invoiceId: invoice.id,
        to: next,
      }
    );
  }
  return { ...invoice, status: next };
}
