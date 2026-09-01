# Plan

## Purpose

C-06(PHP) replaces the hand-catalog read-only authority for `ripple-api` PHP
routes with a mechanically derived, fail-closed proof. The independent review
(`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md` §4, F-01…F-08)
established that the design as originally specified is unsound in the one
repository the near-term programme depends on: the effect closure is rooted at
the handler, but Ripple's middleware pipeline sits outside every handler
closure and one middleware performs an outbound call to a production host on
every request. C-06 roots the closure at the resolved pipeline, replaces the
binary write vocabulary with an effect-kind lattice, makes the proof
kind-diverse and effect-mandatory, and reports the resulting count rather than
targeting it.

## Starting State

- Base SHA `93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57`; C-00, C-01, C-02a
  COMPLETE; `.agent/ACTIVE_TASK.md` was `COMPLETE` for C-02a.
- `src/core/source/surfaces.ts:179-185` `readOnlyClassification()` derives
  `PROVEN_READ_ONLY` from `GET` plus a `KNOWN_READ` row of the eleven-row
  `PHASE5_API_CATALOG` (`src/api/phase5/catalog.ts`). That is the authority
  C-06 removes.
- `runtimeBinding()` at `surfaces.ts:172-177` joins the same catalog; its
  binding role for `targetId`/`runtimeBinding` is separate from read-only
  classification and is NOT in C-06 scope.
- `resolveSurfaceJoins()` at `surfaces.ts:484-554` already computes the
  `ROUTE_HANDLER` join state and already marks duplicate route keys
  `ROUTE_AMBIGUOUS`; both must become explicit proof preconditions.
- `SiblingSourceAccess` is the only read boundary; `tokenizePhp` /
  `findFunctionBody` / `findMatchingBrace` in
  `src/oracles/expectations/extract/php.ts` are the only PHP lexical
  primitives, and they are bounded and data-only.
- Repository inventory completeness is already modelled in
  `src/core/source/completeness.ts` and `populationCompleteness.ts`.

## Scope

As `SPEC.md` "Scope".

## Non-Goals

As `SPEC.md` "Non-goals". In particular C-06 delivers the PHP lane only: the
Go/gRPC effect witness and the protobuf declaration witness stay unimplemented
and their absence is reported as `UNKNOWN`, never as a pass.

## Safety Constraints

As `SPEC.md` "Safety constraints". Additionally:

- The analyzer runs inside the existing call-scoped read view; no new file
  read path, no `node:fs` import, no child process, no network, no environment
  access is introduced into `src/core/source/**`.
- Effect classification is data-only. It is never inferred from a code
  pattern at runtime, and removing a write identifier from the vocabulary
  makes affected closures `AMBIGUOUS`, never proven.
- Diagnostics carry categorical codes only — never an identifier value that
  could be a secret, never a source excerpt.

## Architecture / Approach

Five new modules under `src/core/source/`, each pure and data-only:

1. `effectVocabulary.ts` — the versioned data-only identifier → effect-kind
   table, its dynamic-dispatch construct list, its bounds, and a deterministic
   vocabulary digest. Data only; no analysis.
2. `phpPipeline.ts` — mechanical route → middleware pipeline resolution. Parses
   the middleware attachment table out of `RouteProvidor.php` and the per-route
   `middleware` flags out of `Routing.yaml`, and emits either a fully resolved
   ordered pipeline or a categorical `AMBIGUOUS` rejection.
3. `phpEffectClosure.ts` — the bounded closure walk over pipeline entrypoints
   plus the handler method. Emits the per-kind effect ledger, the classified
   and unclassified callee sets, the reached depth, and a categorical rejection
   code when it fails closed.
4. `readOnlyProof.ts` — witness assembly and the kind-diverse,
   effect-mandatory lattice; carries the join precondition, the
   inventory-completeness assertion, the vocabulary digest, the effect ledger
   and the evidence digest.
5. Wiring in `surfaces.ts`: read-only classification moves from parse time to
   post-join time so the proof can see the join state and the file inventory;
   `readOnlyClassification` becomes a projection of the proof state.

Failure is categorical everywhere: each fail-closed branch has its own reason
code so an operator can see WHY a route is not proven, and so the negative
corpus can assert the exact cause rather than merely "not proven".

## Milestones

- M1 — effect-kind vocabulary module: kinds, data table, dynamic-dispatch
  construct list, bounds, deterministic digest. Focused tests.
- M2 — PHP middleware pipeline resolver: `RouteProvidor.php` attachment table,
  `Routing.yaml` per-route flags, ordered resolved pipeline, fail-closed
  ambiguity. Focused tests.
- M3 — bounded effect-closure analyzer: callee extraction, classification,
  same-file recursion under depth/breadth/budget bounds, dynamic-dispatch and
  unresolved-callee fail-closed paths, per-kind ledger. Focused tests.
- M4 — proof assembly and lattice: witnesses, kind diversity, effect
  mandatory, `W-SPEC` production bar, join precondition, inventory-completeness
  assertion, vocabulary digest, catalog demotion. Focused tests.
- M5 — discovery wiring and downstream truth: `surfaces.ts`, descriptor,
  counters, census, Control Center contract, CLI. Adjacent regressions.
- M6 — negative corpus (zero false positives) and positive corpus
  (non-triviality), including the real `MarketplaceSubscriptionMiddleware`
  counterexample.
- M7 — real read-only measurement over the admitted universe; report per
  repository and per effect kind.
- M8 — documentation and programme truth; full validation; integrate via C-00.

## Validation Strategy

Focused Playwright unit tests per milestone, then the adjacent existing source
suites (`phase25SurfaceDiscovery`, `phase27ResponseFlow`,
`sourceInventoryCompleteness`, Control Center adapters), then one full
regression, `npm run gate:local`, and the clean Node 20 gate once. Existing
validators are never weakened; a pinned assertion changes only when the
measurement is proven to have changed legitimately.

## Decision Log

Recorded in `STATE.md` under "Decisions Made During This Task".

## Discoveries

Recorded in `STATE.md` under "Discoveries".

## Deferred Work

Recorded in `STATE.md` under "Deferred / Follow-Up".

## Completion Criteria

Every `SPEC.md` acceptance criterion mechanically satisfied, evidence recorded
in `STATE.md` and `REPORT.md`, master-programme checklist updated, validated
checkpoint integrated to `origin/main` through the C-00 session tooling, the
session worktree and branch removed, and the canonical checkout clean.
