import { beforeEach, describe, expect, it } from "vitest";

import { app } from "./app";
import { resetStore } from "./store";

const BASE = "http://localhost";

function call(
  method: string,
  path: string,
  options: { body?: unknown; tenant?: string } = {}
): Promise<Response> {
  const tenant = options.tenant ?? "tenant_a";
  const headers = {
    "content-type": "application/json",
    "x-tenant-id": tenant,
  };

  return app.handle(
    new Request(`${BASE}${path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method,
    })
  );
}

async function createCustomer(tenant = "tenant_a") {
  const res = await call("POST", "/api/customers", {
    body: { currency: "USD", name: "Acme" },
    tenant,
  });
  const payload = await res.json();
  return payload.data;
}

async function createInvoice(tenant = "tenant_a") {
  const customer = await createCustomer(tenant);
  const res = await call("POST", "/api/invoices", {
    body: {
      customerId: customer.id,
      lineItems: [{ description: "Seat", quantity: 3, unitAmountMinor: 1999 }],
    },
    tenant,
  });
  const payload = await res.json();
  return payload.data;
}

describe("billing API", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("POST /api/customers", () => {
    it("creates a customer", async () => {
      const res = await call("POST", "/api/customers", {
        body: { currency: "USD", name: "Acme" },
      });
      expect(res.status).toBe(200);

      const { data } = await res.json();
      expect(data).toMatchObject({
        currency: "USD",
        name: "Acme",
        tenantId: "tenant_a",
      });
    });

    it("rejects an unsupported currency with 422", async () => {
      const res = await call("POST", "/api/customers", {
        body: { currency: "XYZ", name: "Acme" },
      });
      expect(res.status).toBe(422);

      const { error } = await res.json();
      expect(error.code).toBe("validation_failed");
    });

    it("rejects an empty name with 422", async () => {
      const res = await call("POST", "/api/customers", {
        body: { currency: "USD", name: "" },
      });
      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/invoices", () => {
    it("computes the total from line items", async () => {
      const invoice = await createInvoice();
      expect(invoice.totalMinor).toBe(5997);
      expect(invoice.totalFormatted).toBe("$59.97");
      expect(invoice.status).toBe("draft");
    });

    it("404s when the customer belongs to another tenant", async () => {
      const customer = await createCustomer("tenant_a");

      const res = await call("POST", "/api/invoices", {
        body: {
          customerId: customer.id,
          lineItems: [{ description: "Seat", quantity: 1, unitAmountMinor: 100 }],
        },
        tenant: "tenant_b",
      });

      expect(res.status).toBe(404);
      const { error } = await res.json();
      expect(error.code).toBe("not_found");
    });

    it("rejects an invoice with no line items", async () => {
      const res = await call("POST", "/api/invoices", {
        body: { customerId: "cus_000001", lineItems: [] },
      });
      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/invoices/:id", () => {
    it("404s for an invoice owned by another tenant", async () => {
      const invoice = await createInvoice("tenant_a");
      const res = await call("GET", `/api/invoices/${invoice.id}`, {
        tenant: "tenant_b",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/invoices/:id/status", () => {
    it("moves draft to open", async () => {
      const invoice = await createInvoice();
      const res = await call("POST", `/api/invoices/${invoice.id}/status`, {
        body: { status: "open" },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.status).toBe("open");
    });

    it("409s when skipping draft straight to paid", async () => {
      const invoice = await createInvoice();
      const res = await call("POST", `/api/invoices/${invoice.id}/status`, {
        body: { status: "paid" },
      });

      expect(res.status).toBe(409);
      const { error } = await res.json();
      expect(error.code).toBe("invalid_state");
    });
  });
});
