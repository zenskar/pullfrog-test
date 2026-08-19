/**
 * Money is always integer minor units (cents) plus a currency code. Never a
 * float, never a bare number. See docs/CODING_STANDARDS.md § Money.
 */

export const CURRENCIES = ["USD", "EUR", "INR"] as const;

export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  amountMinor: number;
  currency: Currency;
}

export class CurrencyMismatchError extends Error {
  readonly left: Currency;
  readonly right: Currency;

  constructor(left: Currency, right: Currency) {
    super(`cannot combine ${left} with ${right}`);
    this.name = "CurrencyMismatchError";
    this.left = left;
    this.right = right;
  }
}

export function money(amountMinor: number, currency: Currency): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(`amountMinor must be an integer, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

export function add(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new CurrencyMismatchError(left.currency, right.currency);
  }
  return money(left.amountMinor + right.amountMinor, left.currency);
}

export function sum(values: readonly Money[], currency: Currency): Money {
  let total = money(0, currency);
  for (const value of values) {
    total = add(total, value);
  }
  return total;
}

/**
 * Multiply by an integer quantity. Quantities are whole units — there is no
 * fractional-quantity case in this domain, which keeps rounding out of scope.
 */
export function multiply(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new TypeError(
      `quantity must be a non-negative integer, got ${quantity}`
    );
  }
  return money(value.amountMinor * quantity, value.currency);
}

/** Display only. Never use the result in further arithmetic. */
export function format(value: Money): string {
  return new Intl.NumberFormat("en-US", {
    currency: value.currency,
    style: "currency",
  }).format(value.amountMinor / 100);
}
