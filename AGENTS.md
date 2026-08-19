# AGENTS.md

Billing-lite POC (customers, invoices, line items) used to evaluate Pullfrog as
an automated code reviewer. TanStack Start + React 19, with Elysia mounted at
`/api`. Node + pnpm.

## Project map

- `src/lib/` — money, logger, errors. No HTTP concerns.
- `src/server/` — Elysia app (`app.ts`), domain rules (`invoices.ts`), in-memory store
- `src/routes/` — TanStack file routes; `api.$.ts` mounts Elysia and exports the Eden client
- `docs/CODING_STANDARDS.md` — numbered rules. Cite the ID (`L4`, `A5`) when one applies.
- `docs/REVIEW_STANDARDS.md` — how PRs get reviewed here

<important if="you need to run commands to build, test, lint, format, typecheck, or generate routes">

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Vitest, single run |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm lint` | Oxlint |
| `pnpm format` | Oxlint `--fix` + Oxfmt |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm generate-routes` | Regenerate `src/routeTree.gen.ts` |
</important>

<important if="you are adding a log line, or changing the logger">

- Never `console.*` outside `src/lib/logger.ts`.
- Inside a request, log via the `log` from `derive` — never the root `logger`, or
  the line loses its `requestId` and stops correlating.
- The event name is a dot-namespaced literal. Every value goes in the fields
  object, never interpolated into the name.
- Never log PII or secrets. Log `customerId`, not the customer's email.
</important>

<important if="you are adding or changing an Elysia route">

- Every input you read gets a `t` schema. Constrain strings and numbers; don't
  just type them.
- Never accept a server-owned value (total, id, status, timestamp) from the body.
- Return through a serializer, never a raw store record.
- Throw `AppError`; never set a status code by hand.
</important>

<important if="you are handling, throwing, or reporting an error">

- Domain failures are `AppError` values with a code from `ERROR_CODES`.
- `onError` in `src/server/app.ts` is the only place an error is logged.
  Handlers throw; they do not log.
- Elysia uses an error's own `code` property as its discriminator, so
  `AppError.code` shadows the registry name — narrow by `instanceof AppError`.
- Client-facing messages never carry validator output, stack traces, or paths.
</important>

<important if="you are writing or changing tests">

- Route tests go through `app.handle(new Request(...))`, not the handler
  function — that is where validation, the envelope, and status mapping live.
- Assert the error `code`, not just the status.
- Reset shared state with `resetStore()` in `beforeEach`.
- Any route reading a stored record needs a cross-tenant 404 test.
</important>

<important if="you are writing code that touches money, prices, or totals">

- Integer minor units plus a currency, always. Never a float or a bare number.
- All arithmetic goes through `src/lib/money.ts` — `add` and `multiply` enforce
  the currency and integer invariants.
- `format()` output is display-only and never re-enters a calculation.
</important>

<important if="you are reading or writing a stored record">

- Every lookup is scoped by `tenantId`. `src/server/store.ts` exposes no
  unscoped read, and none should be added.
- Another tenant's record is `not_found`, never `forbidden` — the distinction
  tells an attacker the ID exists.
- `tenantId` comes from request context, never from the request body.
</important>

<important if="you are adding, renaming, or deleting a file under src/routes/">

- Run `pnpm generate-routes` afterwards. `src/routeTree.gen.ts` is generated and
  committed.
- Route filenames follow TanStack's convention (`__root.tsx`, `api.$.ts`); the
  filename lint rule is disabled for this directory in `oxlint.config.ts`.
</important>
