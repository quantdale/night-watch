# PLAN — Nightwatch Phase 15 — Four-Session Local Project Completion

Task ID: `phase-15-four-session-local-project-completion`
Phase: `15-S1-CORE-CONVERGENCE`
Continuity: `nightwatch.agent-continuity.v2`

## Purpose

Sequence the remaining LOCAL/SOURCE implementation architecture after Phase 14 into
four substantial fresh-session executions, then hand the combined result to one
separately authorized integrated hardening campaign. This plan currently covers
Session 1 in executed detail; Sessions 2–4 milestones stay planned placeholders
until their owner tokens arrive.

## Starting State

- Program design published at anchor `78a39d733e05ffe5b85e9a85b2c1da2ff0e25642`;
  Session-1 execution started at `6324915b56df1d19faefd53e7d8156dd169a4cfd`
  (origin/main fast-forward, clean tree).
- Phase 14 terminal: five-change batch `IMPLEMENTED_AWAITING_HARDENING` at
  `f554da32849481902c86150f657d9696be46e04f` with its own HARDENING_HANDOFF.
- Semantic platform: registry/admission/resolver/currentness (9A.1/10), collection
  admission (11A.3), coverage inventory/cluster (12), bundle/routing (13),
  analyzer/static adapters/drift/report (14) — no lifecycle convergence layer.

## Scope

Session 1 workstreams A–F exactly as frozen in SPEC.md §3, plus the moderate
semantic-platform integration pack, continuity/handoff population, and fast-forward
pushes. Nothing else.

## Non-Goals

- No DEV/NEXT/production/real-campaign/data/infra/Phase-6 execution.
- No Alphaus sibling writes; no AI/selfDev/promotion authority; no Phase 11B/13B.
- No repository-wide hardening campaign (separate future authorization).
- No complete canonical or isolated Playwright regression in Session 1.
- No deletion of historical DTOs or compatibility code without proven migration.

## Safety Constraints

- Fail-closed everywhere; unknown operations stay blocked by the owner gate.
- No credentials/auth state/customer data/secrets in source, artifacts, or .agent
  files; synthetic fixtures only.
- Fast-forward-only Git; path-scoped staging to avoid interleaving with any
  concurrent local writer; never force-push/reset/rebase legitimate work.

## Architecture / Approach

New pure modules under `src/oracles/expectations/lifecycle/` compose the existing
low-level platform without modifying it; one canonical digest helper module under
`src/core/identity/` replaces only mechanically equivalent private copies;
permanent focused suites under `tests/unit/phase15*.test.ts`; Playwright test
runner; strict TypeScript with unknown-field-rejecting validation as the outermost
gateway.

## Milestones

- [x] M1 — Workstream B unified contract result vocabulary: COMPLETE at `afd49db6e1930934f00395591a03615c273ae74a` (19 focused tests).
- [x] M2 — Workstream C canonical digest identity convergence: COMPLETE at `39197d8379aac89abc407baac661c1b286df6872` (six Class-A copies converged byte-identically; compat suites green).
- [x] M3 — Workstream A contract lifecycle registry: COMPLETE at `878d1ff24bcbf22ba515c1e31f8138735b988208` (20 focused tests).
- [x] M4 — Workstream F contract migration compatibility map: COMPLETE at `1c903202d1cade44ea53714a828ba3e4331d6703` (12 focused tests).
- [x] M5 — Workstream D composed source-contract resolution API: COMPLETE at `5a77327d21155012fed07ad2242d916eb2bbc50b` (21 focused + 43 narrow-compat tests).
- [x] M6 — Workstream E contract schema validation hardening: COMPLETE at `154f045c1c0dfe4f408e88267eb86a60ba6525cb` (20 focused + 60 lifecycle-compat tests).
- [x] M7 — Moderate semantic-platform integration pack (23 suites): COMPLETE — 432 passed, 0 failed.
- [x] M8 — Continuity/handoff closure (SPEC/PLAN/STATE/REPORT, ACTIVE_TASK transition, HARDENING_HANDOFF evidence, docs truth rows): COMPLETE at the Session-1 continuity checkpoint (documentation descendant of `154f045c1c0dfe4f408e88267eb86a60ba6525cb`, discoverable from Git).

Milestones beyond M8 are out of THIS task's executed scope (Phase token
15-S1-CORE-CONVERGENCE covers Session 1 only); they are recorded as program-level
future work under Deferred Work and in MASTER_PLAN.md, each behind its own owner
token.

## Validation Strategy

Per workstream: `npm run typecheck`, `git diff --check`, focused Playwright suite,
narrow historical compatibility where contracts changed, `npm run hardening:check`.
End of session: one moderate integration pack (Phase 9A.1/10/11A.3/12/13/14 +
phase15 suites), `npm run agent:check`, `npm run project:check`. Raw counts
recorded in STATE.md Validation Ledger and HARDENING_HANDOFF.md.

## Decision Log

- D-S1-1: Registry derives every family mechanically from authoritative sources
  (recipes/registry, collection table, analyzer version, archived v1 recipes);
  zero hand-typed expectation IDs.
- D-S1-2: Only token-equivalent Class-A digest copies converge onto
  `src/core/identity/canonicalDigest.ts`; non-equivalent canonicalization variants
  remain untouched and are documented in the migration map.
- D-S1-3: Unified vocabulary maps evaluation-time receipt outcomes out of scope
  (they are evaluation results, not contract-lifecycle results); documented in the
  module header.
- D-S1-4: Path-scoped Git staging/commits used throughout because a concurrent
  unrelated local session committed to the same branch mid-execution; its commit
  `e37799246ebe3a2a3b4b59754829ac8c80f09e02` is preserved untouched as ancestry.

## Discoveries

- A parallel local kimi-code session wrote and committed Session-2-style campaign/
  triage changes (`e377992`) into this worktree during Session-1 execution; all
  Session-1 gates were evaluated with foreign-noise awareness and path-scoped
  isolation.
- `bin/hardening-check.mjs` bans the substring `aiReview` under `src/oracles/**`,
  so the migration map assembles that one apiPath from concatenated parts.
- The fixture proxy port (18987) is overridable via `NIGHTWATCH_PROXY_PORT`, which
  resolved an EADDRINUSE collision with the concurrent session's Playwright run.

## Deferred Work

- Session 2 (campaign/replay/minimization/triage convergence) — owner token
  `PHASE_15_S2_CAMPAIGN_TRIAGE_CONVERGENCE_LOCAL_ONLY`; blocked until Session-1
  terminal continuity is pushed.
- Session 3 (local operations tooling) — owner token
  `PHASE_15_S3_LOCAL_OPERATIONS_COMPLETION_LOCAL_ONLY`.
- Session 4 (codebase convergence/release candidate) — owner token
  `PHASE_15_S4_IMPLEMENTATION_CLOSURE_LOCAL_ONLY`.
- Integrated hardening campaign — owner token
  `PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY`.
- Any consolidation of non-equivalent canonicalization variants (Classes B/C/D).
- Receipt-outcome adapters into the unified vocabulary (explicitly out of scope).

## Completion Criteria

Session 1: all six workstreams implemented with permanent focused tests green;
moderate integration pack green; continuity/handoff populated; validated
checkpoints pushed fast-forward; HEAD == origin/main; clean tree; terminal state
IMPLEMENTED_FOCUSED_GREEN / SESSION_1_COMPLETE_SESSION_2_REQUIRED / STOP.
Program overall: only after Sessions 2–4 plus separately authorized integrated
hardening.
