/**
 * The HTTP boundary. Validation, request context, and error mapping all live
 * here — domain modules stay free of HTTP concerns.
 */

import { Elysia, t } from "elysia";

import { AppError, notFound } from "#/lib/errors";
import { logger } from "#/lib/logger";
import { CURRENCIES, format } from "#/lib/money";

import { invoiceTotal, transitionStatus } from "./invoices";
import { findCustomer, findInvoice, listCustomers, listInvoices, nextId, putCustomer, putInvoice } from './store';
import type { Invoice } from './store';

const currencySchema = t.Union(CURRENCIES.map((code) => t.Literal(code)));

const lineItemSchema = t.Object({
  description: t.String({ minLength: 1, maxLength: 200 }),
  quantity: t.Integer({ minimum: 1 }),
  unitAmountMinor: t.Integer({ minimum: 0 }),
});

/** Shapes an invoice for the wire. Totals are computed, never stored. */
function serializeInvoice(invoice: Invoice) {
  const total = invoiceTotal(invoice);
  return {
    currency: invoice.currency,
    customerId: invoice.customerId,
    id: invoice.id,
    lineItems: invoice.lineItems,
    status: invoice.status,
    totalFormatted: format(total),
    totalMinor: total.amountMinor,
  };
}

export const app = new Elysia({ prefix: "/api" })
  .derive(({ headers }) => {
    const requestId = headers["x-request-id"] ?? crypto.randomUUID();
    const tenantId = headers["x-tenant-id"] ?? "tenant_demo";
    return { log: logger.child({ requestId, tenantId }), requestId, tenantId };
  })
  .onError(({ code, error, status, request, log }) => {
    // The single place an error is logged. Handlers throw; they do not log.
    // `log` is the request-scoped logger from `derive`, so error lines carry
    // the same requestId as the success lines for that request. It is absent
    // only when the failure happened before `derive` ran (e.g. a parse error).
    const scoped =
      log ?? logger.child({ requestId: "pre_context", tenantId: "unknown" });

    // Narrow by instance, not by `code`: Elysia uses an error's own `code`
    // property as its discriminator, so `AppError.code` shadows the name it
    // would otherwise be registered under.
    if (error instanceof AppError) {
      scoped.warn("request.rejected", {
        code: error.code,
        method: request.method,
        path: new URL(request.url).pathname,
        ...error.context,
      });
      return status(error.status, {
        error: { code: error.code, message: error.message },
      });
    }

    if (code === "VALIDATION") {
      // The validator's message names internal paths and types, so it goes to
      // the log, not to the client (CODING_STANDARDS E5).
      scoped.warn("request.invalid", {
        method: request.method,
        path: new URL(request.url).pathname,
        detail: error.message,
      });
      return status(422, {
        error: { code: "validation_failed", message: "request failed validation" },
      });
    }

    if (code === "NOT_FOUND") {
      return status(404, {
        error: { code: "not_found", message: "route not found" },
      });
    }

    scoped.error("request.failed", {
      method: request.method,
      path: new URL(request.url).pathname,
      reason: error instanceof Error ? error.message : String(error),
    });
    return status(500, {
      error: { code: "internal", message: "internal server error" },
    });
  })

  .get("/customers", ({ tenantId }) => ({ data: listCustomers(tenantId) }))

  .post(
    "/customers",
    ({ body, tenantId, log }) => {
      const customer = putCustomer({
        currency: body.currency,
        id: nextId("cus"),
        name: body.name,
        tenantId,
      });
      log.info("customer.created", {
        currency: customer.currency,
        customerId: customer.id,
      });
      return { data: customer };
    },
    {
      body: t.Object({
        currency: currencySchema,
        name: t.String({ minLength: 1, maxLength: 120 }),
      }),
    }
  )

  .get("/invoices", ({ tenantId }) => ({
    data: listInvoices(tenantId).map(serializeInvoice),
  }))

  .get(
    "/invoices/:id",
    ({ params, tenantId }) => {
      const invoice = findInvoice(tenantId, params.id);
      if (!invoice) {throw notFound("invoice", params.id);}
      return { data: serializeInvoice(invoice) };
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) }
  )

  .post(
    "/invoices",
    ({ body, tenantId, log }) => {
      const customer = findCustomer(tenantId, body.customerId);
      if (!customer) {throw notFound("customer", body.customerId);}

      const invoice = putInvoice({
        currency: customer.currency,
        customerId: customer.id,
        id: nextId("inv"),
        lineItems: body.lineItems,
        status: "draft",
        tenantId,
      });

      log.info("invoice.created", {
        amountMinor: invoiceTotal(invoice).amountMinor,
        currency: invoice.currency,
        customerId: customer.id,
        invoiceId: invoice.id,
        lineItemCount: invoice.lineItems.length,
      });

      return { data: serializeInvoice(invoice) };
    },
    {
      body: t.Object({
        customerId: t.String({ minLength: 1 }),
        lineItems: t.Array(lineItemSchema, { minItems: 1 }),
      }),
    }
  )

  .post(
    "/invoices/:id/status",
    ({ params, body, tenantId, log }) => {
      const invoice = findInvoice(tenantId, params.id);
      if (!invoice) {throw notFound("invoice", params.id);}

      const next = transitionStatus(invoice, body.status);
      if (next instanceof AppError) {throw next;}

      putInvoice(next);
      log.info("invoice.status_changed", {
        amountMinor: invoiceTotal(next).amountMinor,
        currency: next.currency,
        from: invoice.status,
        invoiceId: next.id,
        to: next.status,
      });

      return { data: serializeInvoice(next) };
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("open"),
          t.Literal("paid"),
          t.Literal("void"),
        ]),
      }),
      params: t.Object({ id: t.String({ minLength: 1 }) }),
    }
  );

export type App = typeof app;
