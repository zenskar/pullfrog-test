# Review standards

The rubric for reviewing a diff in this repo. Where this file and your defaults
disagree, this file wins.

## Grounding rules

These come first because every finding below depends on them.

- **Read the whole feature flow before commenting on any line.** Call stack, data
  flow, state ownership, cache invalidation. A finding about a line you didn't
  trace is a guess.
- **Search before you claim.** Never assert that a helper, component, hook, or
  pattern already exists — or that something is inconsistent with the codebase —
  without having found the thing you're comparing against. If you can't cite it,
  don't claim it.
- **Don't invent architecture.** Ground every claim in the diff and in code you
  actually read.
- **Skip what tooling enforces.** Formatting, lint rules, and type errors are
  already someone else's job.
- **Few strong findings beat many weak ones.** Never bury a structural problem
  under cosmetic notes.

## Lens 1 — Structural simplification

Be ambitious. Don't stop at "this could be a bit cleaner." Look for the
restructuring that preserves behavior while making the implementation
dramatically simpler — the version that feels inevitable in hindsight.

- Prefer **deleting** complexity over rearranging it. A refactor that moves the
  same number of concepts around has not paid for itself.
- Look for the reframing that makes whole branches, helpers, modes, or layers
  disappear entirely.
- Be highly suspicious of new ad-hoc conditionals and one-off branches spliced
  into unrelated flows. "Weird `if` in a random place" is a design problem, not a
  style nit — push it behind a dedicated abstraction, state machine, or module.
- A file crossing **1000 lines** because of this change needs explicit
  decomposition pressure. Waive only for a compelling structural reason where the
  result is still clearly organized.
- Prefer direct, boring code over magical code. Be skeptical of generic
  mechanisms that hide simple data-shape assumptions.

## Lens 2 — Reuse and consistency

- Check for an existing utility, component, hook, route pattern, or styling
  primitive before accepting newly written code. Prefer extending the existing
  flow over a parallel implementation.
- A new shared helper must have **real** reuse. Extracted private logic with a
  vague name is not a helper.
- File placement should match the domain and its neighbours. Be suspicious of
  top-level `lib` / `utils` / `shared` dumps.
- Names should match what the code does and follow sibling naming.
- Use the existing result / error / loading patterns rather than inventing a
  bespoke success-failure shape.

## Lens 3 — Composition and boundaries

- A function should do one thing at one level of abstraction.
- Flag grab-bag modules mixing unrelated concerns (flags + fetching +
  transformation + UI state + logging).
- Parameter sprawl usually means the boundary is in the wrong place, not that the
  function needs more knobs.
- Question unnecessary optionality, `any`, `unknown`, and cast-heavy code where a
  clearer type boundary would make control flow simpler.
- Silent fallback that papers over an unclear invariant → make the invariant
  explicit instead.
- Keep feature logic out of shared/general-purpose paths. Keep it in the layer
  that already owns the concept.
- Independent async work serialized for no reason, or related updates that can
  leave state half-applied, are design smells when the cleaner shape is obvious.

## Lens 4 — Slop

Flag these by name:

- **Comment slop** — obvious comments, comments defending awkward code, long
  comments that should have been clearer code.
- **Helper slop** — tiny wrappers adding no meaning; a file created only to make
  one function look shorter; indirection that buys nothing.
- **Type slop** — exported one-off types, annotations where inference reads
  better, types that only paper over awkward code.
- **Defensive slop** — `try`/`catch` and existence checks on trusted internal
  paths where failure should be loud.
- **Cast slop** — `as any` used to silence the type-checker rather than fix the
  contract.
- **Nesting slop** — deep nesting that early returns would flatten.
- **Compatibility cruft** — behavior bolted on to preserve accidental
  architecture instead of building the coherent end state.
- **Diff churn** — unrelated renames, reformatting, or wrappers that enlarge the
  PR without improving the design.

## Lens 5 — React (when applicable)

- Apply "You Might Not Need an Effect": derive during render, put event-caused
  work in event handlers, reset state with `key`.
- No redundant state, no state-synchronizing effects.
- `useMemo` / `useCallback` need a real render-identity or expensive-computation
  reason. Performance anxiety is not a reason.
- Prefer clean component boundaries over prop and callback gymnastics. Most
  memo/effect/callback code disappears when state ownership is fixed.

## Smell baseline

Applies even where this file is silent. Each is a **judgement call** ("possible
Feature Envy"), never a hard violation, and anything above overrides it.

- **Mysterious Name** — doesn't reveal what it does → rename; if no honest name
  comes, the design is murky.
- **Duplicated Code** — same logic shape in several places → extract, call twice.
- **Feature Envy** — a method reaching into another object's data more than its
  own → move it onto the data it envies.
- **Data Clumps** — the same fields always travelling together → give them a type.
- **Primitive Obsession** — a string or number standing in for a domain concept →
  give the concept its own small type.
- **Repeated Switches** — the same cascade on the same type recurring → one map or
  polymorphic dispatch.
- **Shotgun Surgery** — one logical change forcing scattered edits → gather what
  changes together.
- **Divergent Change** — one module edited for unrelated reasons → split it.
- **Speculative Generality** — abstraction for needs the spec doesn't have →
  delete it.
- **Message Chains** — `a.b().c().d()` the caller shouldn't depend on → hide the
  walk.
- **Middle Man** — mostly delegates onward → cut it, call the target directly.

## Extra suspicion

Review these paths harder, because a subtle bug reaches real users: money and
pricing, tenant scoping, auth decisions, cache invalidation, and validation
boundaries.

## Finding format

Every finding carries:

1. File path and the symbol or area.
2. The concrete issue.
3. Why it matters — structure, reuse, consistency, maintainability.
4. The existing pattern to reuse, if you found one.
5. The minimal fix, preferring deletion or simplification over more machinery.

If both a structural lens and a slop lens catch the same code, merge them into
one finding with both angles folded in. Never file it twice.

## Bar for approval

Not "it works." Treat these as presumptive blockers unless the author justifies
them:

- A plausible simplification would delete a whole category of complexity, and the
  PR preserves it instead.
- The PR pushes a file past 1000 lines.
- The PR adds ad-hoc branching that tangles an existing flow.
- Feature checks are scattered across shared code to solve a local problem.
- An unnecessary abstraction, wrapper, or cast-heavy contract makes the design
  more indirect.
- An existing canonical helper is duplicated, or logic lands in the wrong layer.

## Tone

Direct, serious, specific. Not rude. Don't soften a major maintainability problem
into a mild suggestion — and don't inflate a nit into a blocker.
