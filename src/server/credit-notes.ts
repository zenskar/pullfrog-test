/**
 * Credit note domain rules. Pure functions over already-validated objects —
 * validation happens at the HTTP boundary, not here.
 */

import { AppError, invalidState } from "#/lib/errors";
import { add, money, sum } from '#/lib/money';
import type { Money } from '#/lib/money';

import { invoiceTotal } from "./invoices";
import type { CreditNote, Invoice, InvoiceStatus } from "./store";

/** Only a billed invoice can be credited. A draft has nothing to credit yet. */
const CREDITABLE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "open",
  "paid",
]);

export function creditedTotal(
  notes: readonly CreditNote[],
  invoice: Pick<Invoice, "currency">
): Money {
  return sum(
    notes.map((note) => money(note.amountMinor, note.currency)),
    invoice.currency
  );
}

/** What remains payable after credits. Never negative — credits are capped. */
export function netTotal(
  invoice: Invoice,
  notes: readonly CreditNote[]
): Money {
  const total = invoiceTotal(invoice);
  const credited = creditedTotal(notes, invoice);
  return money(total.amountMinor - credited.amountMinor, invoice.currency);
}

/**
 * Checks a proposed credit against the invoice's status and remaining balance.
 * Returns the error rather than throwing, so the caller owns the boundary.
 */
export function validateCredit(
  invoice: Invoice,
  existing: readonly CreditNote[],
  amountMinor: number
): AppError | null {
  if (!CREDITABLE_STATUSES.has(invoice.status)) {
    return invalidState(`cannot credit a ${invoice.status} invoice`, {
      invoiceId: invoice.id,
      status: invoice.status,
    });
  }

  const proposed = add(
    creditedTotal(existing, invoice),
    money(amountMinor, invoice.currency)
  );
  const total = invoiceTotal(invoice);

  if (proposed.amountMinor > total.amountMinor) {
    return new AppError(
      "credit_exceeds_invoice",
      "credit notes would exceed the invoice total",
      {
        invoiceId: invoice.id,
        invoiceTotalMinor: total.amountMinor,
        proposedTotalMinor: proposed.amountMinor,
      }
    );
  }

  return null;
}
