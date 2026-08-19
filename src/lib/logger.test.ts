import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

/** The subset of log fields these tests assert on. */
interface CapturedLine {
  level: string;
  event: string;
  timestamp: string;
  requestId?: string;
  tenantId?: string;
  code?: string;
  invoiceId?: string;
  amountMinor?: number;
  customerId?: string;
  email?: string;
}

function capture() {
  const lines: CapturedLine[] = [];
  const logger = createLogger({}, (line) => lines.push(JSON.parse(line)));
  return { lines, logger };
}

describe("logger", () => {
  it("emits one structured object per line", () => {
    const { lines, logger } = capture();
    logger.info("invoice.created", {
      amountMinor: 1999,
      invoiceId: "inv_000001",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      amountMinor: 1999,
      event: "invoice.created",
      invoiceId: "inv_000001",
      level: "info",
    });
    expect(lines[0]).toHaveProperty("timestamp");
  });

  it("carries child fields onto every subsequent line", () => {
    const { lines, logger } = capture();
    const scoped = logger.child({ requestId: "req_1", tenantId: "tenant_a" });

    scoped.warn("request.rejected", { code: "not_found" });

    expect(lines[0]).toMatchObject({
      code: "not_found",
      requestId: "req_1",
      tenantId: "tenant_a",
    });
  });

  it("redacts sensitive field names as a backstop", () => {
    const { lines, logger } = capture();
    logger.info("customer.created", {
      customerId: "cus_1",
      email: "a@example.com",
    });

    expect(lines[0].email).toBe("[redacted]");
    expect(lines[0].customerId).toBe("cus_1");
  });
});
