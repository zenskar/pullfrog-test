/**
 * Domain failures are values, not thrown strings.
 * See docs/CODING_STANDARDS.md § Error handling.
 */

export const ERROR_CODES = [
  "credit_exceeds_invoice",
  "not_found",
  "validation_failed",
  "currency_mismatch",
  "invalid_state",
  "tenant_mismatch",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE = {
  credit_exceeds_invoice: 422,
  currency_mismatch: 422,
  invalid_state: 409,
  not_found: 404,
  tenant_mismatch: 403,
  validation_failed: 422,
} satisfies Record<ErrorCode, number>;

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Safe to include in a log line — must not contain user PII. */
  readonly context: Record<string, string | number>;

  constructor(
    code: ErrorCode,
    message: string,
    context: Record<string, string | number> = {}
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.context = context;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

export function notFound(resource: string, id: string): AppError {
  return new AppError("not_found", `${resource} not found`, { id, resource });
}

export function invalidState(
  message: string,
  context: Record<string, string | number> = {}
): AppError {
  return new AppError("invalid_state", message, context);
}

export function tenantMismatch(resource: string, id: string): AppError {
  return new AppError(
    "tenant_mismatch",
    `${resource} belongs to another tenant`,
    { id, resource }
  );
}
