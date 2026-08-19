# Coding standards

What this repo requires. Every rule is **checkable against a diff** — if a
reviewer can't tell whether a change complies, the rule is badly written and
should be fixed. Rules are numbered so findings can cite them (`L4`, `A5`).

`docs/REVIEW_STANDARDS.md` is the separate question of *how* to review. This
file is *what* the code must do. `AGENTS.md` is the short version, indexed by
the kind of work you're doing.

## Out of scope

Nothing here duplicates tooling. `pnpm lint` (Oxlint + `anti-slop` + the
ESLint-parity plugins) and `pnpm typecheck` already reject empty `catch` blocks,
unhandled caught exceptions, `as any`, unjustified type assertions, and
unparsed `unknown` parameters. A reviewer should not spend findings on those —
CI will.

---

## Logging

Canonical implementation: `src/lib/logger.ts`. Intended usage end to end:
`src/server/app.ts`.

**L1 — `console.*` is never allowed outside `src/lib/logger.ts`.**
Not even temporarily. Lint does not catch this one.

**L2 — Event names are dot-namespaced literals, never sentences.**
`log.info("invoice.created", { invoiceId })`, never
``log.info(`created invoice ${id}`)``. The event name is a stable key you group
and alert on; interpolating values destroys that.

**L3 — Values go in the fields object.** The first argument is always a literal.

**L4 — Request-scoped code logs through the context logger.**
Handlers use the `log` from `derive`, so every line carries `requestId` and
`tenantId`. Importing the root `logger` inside a request path is a violation:
the line becomes uncorrelatable.

**L5 — Levels mean specific things.**

| Level   | Use for                                                    |
| ------- | ---------------------------------------------------------- |
| `debug` | Local detail. Never enabled in production.                 |
| `info`  | A state change worth auditing later.                       |
| `warn`  | Rejected or degraded, but handled. Client-caused failures. |
| `error` | The operation failed and someone needs to look.            |

A request rejected because of bad client input is `warn`. Reserve `error` for
cases where the server is at fault.

**L6 — Each failure is logged exactly once, at the boundary that handles it.**
Here that boundary is `onError`. A handler that logs and then throws produces
two lines for one event. Handlers throw; they do not log errors.

**L7 — Never log PII or secrets.**
No email, password, token, API key, card number, or tax ID — log the identifier
instead (`customerId`, not the email). The logger redacts a known list as a
backstop; that backstop is not permission to pass them.

**L8 — Money is logged as minor units plus currency.**
`{ amountMinor: 5997, currency: "USD" }`. Never a formatted string, never a
float, never an amount without its currency.

**L9 — Mutations of money-bearing state log before and after.**
A status change logs `from` and `to`, or the audit trail can't answer what
changed.

---

## Error handling

**E1 — Domain failures are `AppError` values with a code from `ERROR_CODES`.**
Never a bare string or plain `Error` for an expected domain outcome.

**E2 — No defensive `try`/`catch` around trusted internal calls.**
Wrap I/O and parsing. Do not wrap calls to our own pure functions — let those
fail loudly.

**E3 — Every response uses the standard envelope.**
`{ data }` on success, `{ error: { code, message } }` on failure. No route
invents its own shape.

**E4 — Client-facing error messages never leak internals.**
No stack traces, no validator output, no file paths. Detail goes to the log;
the client gets a code and a short message.

**E5 — HTTP status comes from the error code** via `AppError.status`. Handlers
never set a status by hand.

---

## API and validation

**A1 — Every route declares a schema for every input it reads.**
`body`, `params`, and `query` each get an Elysia `t` schema. Reading an
unvalidated field is a violation.

**A2 — Validation happens at the boundary, once.**
Functions in `src/server/` and `src/lib/` take already-valid typed objects.
Re-checking inside them means the boundary isn't trusted — fix the boundary.

**A3 — Constrain strings and numbers, don't just type them.**
`t.String({ minLength: 1, maxLength: 200 })`, not bare `t.String()`. An
unbounded string is an availability bug.

**A4 — Enum-like fields use a union of literals derived from the domain
constant**, not a free `t.String()`. See `currencySchema` in `src/server/app.ts`.

**A5 — Computed values are never accepted from the client.**
Totals, statuses, IDs, and timestamps are server-owned. A schema accepting
`totalMinor` from the body is a violation.

**A6 — Responses are shaped by an explicit serializer.**
Never return a store record directly — it leaks internal fields. See
`serializeInvoice`.

---

## Testing

**T1 — Tests are colocated as `*.test.ts` beside the module they cover.**

**T2 — Every route has a test through `app.handle(new Request(...))`.**
Testing the handler in isolation skips validation, the error envelope, and
status mapping — which is where the bugs are.

**T3 — Every error path asserts the error `code`, not just the status.**
Status alone doesn't distinguish two different 422s.

**T4 — Money assertions are on `amountMinor`**, including a case that would
expose float drift (`3 × 1999 === 5997`). Asserting a formatted string is not a
money test.

**T5 — Every route that reads a stored record has a cross-tenant test**
asserting the other tenant gets 404 — not merely that the happy path works.

**T6 — Tests are independent.** Reset shared state in `beforeEach`
(`resetStore()`). Never rely on execution order.

**T7 — No snapshot-only coverage.** A snapshot may accompany real assertions; it
may not replace them.

**T8 — Test names state the behaviour and the condition**, e.g. "404s when the
customer belongs to another tenant". Not "works" or "handles errors".

---

## Money

**M1 — Money is integer minor units plus a currency.** Never a float, never a
bare number, never a formatted string in a calculation.

**M2 — All arithmetic goes through `src/lib/money.ts`.** No inline `+` or `*` on
amounts; `add` and `multiply` enforce the currency and integer invariants.

**M3 — `format()` output is display-only** and never re-enters a calculation.

---

## Tenancy

**Tn1 — Every stored-record read is scoped by `tenantId`.**
`src/server/store.ts` exposes no unscoped lookup, and none should be added.

**Tn2 — Another tenant's record is `not_found`, never `forbidden`.**
Distinguishing them tells an attacker the ID exists.

**Tn3 — `tenantId` comes from request context, never the request body.**
