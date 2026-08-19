# pullfrog-test

A POC for evaluating [Pullfrog](https://pullfrog.com) as an automated code
reviewer — specifically, whether it catches violations of documented coding
standards that a coding agent skipped.

The app is a billing-lite domain (customers, invoices, line items) chosen
because it exercises money arithmetic, tenant scoping, and a status state
machine — the paths where a subtle bug actually matters.

## Stack

| Piece      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Framework  | TanStack Start (React 19)                               |
| API        | Elysia, mounted inside a Start server route             |
| Type-safe client | Eden Treaty, isomorphic (in-process on server, HTTP on client) |
| Lint       | Oxlint via Ultracite, with `anti-slop` + ESLint-parity JS plugins |
| Format     | Oxfmt                                                   |
| Tests      | Vitest                                                  |
| Runtime    | Node + pnpm                                             |

## Commands

```bash
pnpm dev         # dev server on :3000
pnpm test        # vitest
pnpm lint        # oxlint
pnpm format      # oxlint --fix + oxfmt
pnpm typecheck   # tsc --noEmit
pnpm build       # production build
```

## Layout

```
src/
  lib/           money, logger, errors — no HTTP concerns
  server/        Elysia app, domain rules, store
  routes/        TanStack routes; api.$.ts mounts Elysia at /api
docs/
  CODING_STANDARDS.md   what this repo requires (the thing under test)
  REVIEW_STANDARDS.md   how a reviewer should review
```

## The experiment

Three PRs implement the **same feature** at different quality levels — great,
mid, and bad — all branched from the same base commit, each planting a
pre-registered set of `CODING_STANDARDS.md` violations. Comparing the three
reviews measures precision (does it flag real violations?) and recall (does it
miss planted ones?).

Two things distort the comparison if ignored: Pullfrog carries repo-level
learnings between runs, and reviews of later PRs inherit context from earlier
ones. Reset learnings between runs, or run the sequence twice in opposite order
and see how much moves.
