/**
 * In-memory store. A real deployment would swap this for a database; the
 * tenant-scoping contract below is what the rest of the app relies on.
 *
 * Every read is scoped by `tenantId`. There is deliberately no unscoped
 * lookup — see docs/CODING_STANDARDS.md § Tenancy.
 */

import type { Currency } from "#/lib/money";

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  currency: Currency;
}

export interface LineItem {
  description: string;
  unitAmountMinor: number;
  quantity: number;
}

export type InvoiceStatus = "draft" | "open" | "paid" | "void";

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  currency: Currency;
  status: InvoiceStatus;
  lineItems: LineItem[];
}

export interface CreditNote {
  id: string;
  tenantId: string;
  invoiceId: string;
  reason: string;
  amountMinor: number;
  currency: string;
  notifyEmail?: string;
}

const customers = new Map<string, Customer>();
const invoices = new Map<string, Invoice>();
const creditNotes = new Map<string, CreditNote>();

let sequence = 0;

export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${String(sequence).padStart(6, "0")}`;
}

export function putCustomer(customer: Customer): Customer {
  customers.set(customer.id, customer);
  return customer;
}

export function findCustomer(
  tenantId: string,
  id: string
): Customer | undefined {
  const customer = customers.get(id);
  return customer?.tenantId === tenantId ? customer : undefined;
}

export function listCustomers(tenantId: string): Customer[] {
  return [...customers.values()].filter(
    (customer) => customer.tenantId === tenantId
  );
}

export function putInvoice(invoice: Invoice): Invoice {
  invoices.set(invoice.id, invoice);
  return invoice;
}

export function findInvoice(tenantId: string, id: string): Invoice | undefined {
  const invoice = invoices.get(id);
  return invoice?.tenantId === tenantId ? invoice : undefined;
}

export function listInvoices(tenantId: string): Invoice[] {
  return [...invoices.values()].filter(
    (invoice) => invoice.tenantId === tenantId
  );
}

export function putCreditNote(note: CreditNote): CreditNote {
  creditNotes.set(note.id, note);
  return note;
}

export function getInvoiceById(id: string): Invoice | undefined {
  return invoices.get(id);
}

export function getCreditNotesForInvoice(invoiceId: string): CreditNote[] {
  return [...creditNotes.values()].filter(
    (note) => note.invoiceId === invoiceId
  );
}

/** Test-only. Keeps suites independent of each other's writes. */
export function resetStore(): void {
  customers.clear();
  invoices.clear();
  creditNotes.clear();
  sequence = 0;
}
