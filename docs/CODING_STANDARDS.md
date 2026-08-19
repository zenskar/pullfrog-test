# Coding standards

What this repo requires. Every rule here is meant to be **checkable against a
diff** — if a reviewer can't tell whether a change complies, the rule is badly
written and should be fixed.

`docs/REVIEW_STANDARDS.md` is the separate question of *how* to review. This
file is *what* the code must do.

Rules that lint or the type-checker already enforce are deliberately absent.
Everything below is something tooling cannot catch.

---

## Logging

The canonical logger is `src/lib/logger.ts`. `src/server/app.ts` shows the
intended usage end to end.

**L1 — `console.*` is never allowed outside `src/lib/logger.ts`.**
No `console.log` left in a diff, not even temporarily.

**L2 — Log events are dot-namespaced identifiers, never sentences.**
`log.info("invoice.created", { invoiceId })`, never
`log.info(\`created invoice ${id}\`)`. The event name is a stable key you can
group and alert on; interpolating values into it destroys that.

**L3 — Values go in the fields object, never in the event string.**
Anything variable is a field. The first argument is always a literal.

**L4 — Request-scoped code logs through the context logger, never the root one.**
Handlers use the `log` from `derive` so every line carries `requestId` and
`tenantId`. Importing `logger` directly inside a request path is a violation:
the line becomes uncorrelatable.

**L5 — Levels mean specific things.**

| Level   | Use for                                                        |
| ------- | -------------------------------------------------------------- |
| `debug` | Local detail. Never enabled in production.                     |
| `info`  | A state change worth auditing later.                           |
| `warn`  | Rejected or degraded, but handled. Client-caused failures.     |
| `error` | The operation failed and someone needs to look.                |

A rejected request caused by bad client input is `warn`, not `error`. Reserve
`error` for cases where the server is at fault.

**L6 — Each failure is logged exactly once, at the boundary that handles it.**
In this app that boundary is `onError`. A handler that logs and then throws
produces two lines for one event. Handlers throw; they do not log errors.

**L7 — Never log PII or secrets.**
No email, password, token, API key, card number, or tax ID — log the
identifier instead (`customerId`, not the customer's email). The logger redacts
a known list as a backstop; that backstop is not permission to pass them.

**L8 — Money is logged as minor units plus currency.**
`{ amountMinor: 5997, currency: "USD" }`. Never a formatted string, never a
float, never an amount without its currency.

**L9 — Mutations of money-bearing state log before and after.**
A status change logs `from` and `to`. Otherwise the audit trail can't answer
what actually changed.

---

## Error handling

**E1 — Domain failures are `AppError` values with a code from `ERROR_CODES`.**
Never throw a bare string or a plain `Error` for an expected domain outcome.

**E2 — No silent catch.**
`catch {}` and `catch (e) { /* ignore */ }` are never acceptable. If a failure
is genuinely ignorable, log at `warn` and say why in a comment.

**E3 — No defensive `try`/`catch` on trusted internal calls.**
Wrap I/O and parsing. Do not wrap calls to our own pure functions — let those
fail loudly.

**E4 — Every error response uses the standard envelope.**
`{ error: { code, message } }`. Success uses `{ data }`. No route invents its
own shape.

**E5 — Error messages sent to clients never leak internals.**
No stack traces, no SQL, no file paths. Detail goes to the log; the client gets
the code and a short message.

**E6 — HTTP status comes from the error code**, via `AppError.status`. Handlers
do not set status codes by hand.

---

## API and validation

**A1 — Every route declares a schema for every input it reads.**
`body`, `params`, and `query` each get an Elysia `t` schema. A handler that
reads an unvalidated field is a violation.

**A2 — Validation happens at the boundary, once.**
Domain functions in `src/server/` and `src/lib/` take already-valid typed
objects. Re-checking inside them means the boundary isn't trusted; fix the
boundary.

**A3 — Constrain strings and numbers, don't just type them.**
`t.String({ minLength: 1, maxLength: 200 })`, not bare `t.String()`. An
unbounded string is an availability bug.

**A4 — Enum-like fields use a union of literals derived from the domain
constant**, not a free `t.String()`. See `currencySchema` in `src/server/app.ts`.

**A5 — Computed values are computed, never accepted from the client.**
Totals, statuses, IDs, and timestamps are server-owned. A schema that accepts
`totalMinor` from the request body is a violation.

**A6 — Responses are shaped by an explicit serializer.**
Never return a store record directly — it leaks internal fields. See
`serializeInvoice`.

---

## Testing

**T1 — Tests are colocated as `*.test.ts` next to the module they cover.**

**T2 — Every route has a test that goes through `app.handle(new Request(...))`.**
Testing the handler function in isolation does not exercise validation, the
error envelope, or status mapping — which is where the bugs are.

**T3 — Every error path has a test that asserts the error `code`**, not just the
status. Status alone doesn't distinguish two different 422s.

**T4 — Money assertions are on `amountMinor`**, with a case that would expose
float drift (e.g. `3 × 1999 === 5997`). An assertion on a formatted string is
not a money test.

**T5 — Tenant isolation has an explicit cross-tenant test** for every route that
reads a stored record. The test asserts the other tenant gets 404 — not that the
happy path works.

**T6 — Tests are independent.** Reset shared state in `beforeEach`
(`resetStore()`). Never rely on execution order.

**T7 — No snapshot-only coverage.** A snapshot may accompany real assertions; it
may not replace them.

**T8 — Test names state the behaviour and the condition**, e.g. "404s when the
customer belongs to another tenant". Not "works" or "handles errors".

---

## Money

**M1 — Money is always integer minor units plus a currency.** Never a float,
never a bare number, never a formatted string in a calculation.

**M2 — All arithmetic goes through `src/lib/money.ts`.** No inline `+` or `*` on
amounts — `add` and `multiply` enforce the currency and integer invariants.

**M3 — `format()` output is display-only** and must never re-enter a
calculation.

---

## Tenancy

**Tn1 — Every stored-record read is scoped by `tenantId`.** `src/server/store.ts`
exposes no unscoped lookup, and none should be added.

**Tn2 — A record belonging to another tenant is `not_found`, never
`forbidden`.** Distinguishing the two tells an attacker the ID exists.

**Tn3 — `tenantId` comes from request context, never from the request body.**
