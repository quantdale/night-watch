# Task Plan

Task ID: phase-17-change-aware-campaign-evidence-hardening
Phase: 17-CHANGE-AWARE-CAMPAIGN-EVIDENCE-HARDENING
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Starting State

- Live starting SHA: `e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2` (discover from
  Git; this is the Phase 16CH documentation closure descendant).
- Last substantive implementation checkpoint:
  `794b32df443ae8c9a520182ef97b7a2c9985ba82`.
- Phase 16CH: terminal local evidence, `BLOCKED_EXTERNAL_CI` because its
  inspected Actions run executed zero steps; do not reopen it.
- Phase 6: `FROZEN_BY_OWNER`; Phase 16D: not authorized.

## Purpose

Deliver the evidence-led local/source/synthetic program frozen in SPEC.md:
connect change intelligence to portfolio ranking, repair strict parser/privacy
boundaries, make repeated-action replay evidence truthful, and expand the
deterministic adversarial corpus without adding authority.

## Scope

The implementation scope is limited to the W1-W5 surfaces in WORKSTREAMS.md,
their focused tests/corpus, and durable project/task documentation required to
record the resulting truth. Existing serialized versions remain compatible.

## Non-Goals

No DEV/NEXT/production access, Phase 16D, Phase 6/data/infra work, sibling
writes, external publication, AI/selfDev/promotion authority, or real findings.

## Safety Constraints

Unknown, stale, malformed, or ambiguous inputs fail closed. Planner/replay
cores remain pure and bounded. Hostile values never enter errors, artifacts,
or continuity state. Approved-universe, owner-scope, privacy, and determinism
gates are not weakened.

## Architecture / Approach

Keep the existing change selector, portfolio model, allocator, and minimizer
as the behavioral authorities. Add a pure impact overlay and a reusable
allocation seam; centralize canonical identity and safe diagnostics; reject
ambiguous minimality evidence rather than guessing occurrence identity.

## Milestones

- M0 — bootstrap, fresh audit, and strict task records. DONE.
- M1 — reproduce the four concrete defects and capture smallest synthetic
  regressions. DONE.
- M2 — implement and test the source-change-to-portfolio impact bridge,
  deterministic ranking, and sanitized selection explanations. DONE.
- M3 — implement strict baseline parsing and shared privacy/error hardening;
  run the affected parser compatibility cone. DONE.
- M4 — harden occurrence-ambiguous minimality evidence and add replay corpus
  coverage without changing historical result bytes. DONE.
- M5 — expand adversarial change/privacy/determinism corpus and operator
  reporting. DONE.
- M6 — integrated validation, canonical and isolated regression parity,
  docs alignment, checkpoint/push, and truthful CI inspection. IN_PROGRESS.
- M7 — terminal continuity closure and handoff. PENDING.

## Validation ladder

After each implementation wave: `npm run typecheck` plus the focused tests.
Before closure: `npm run hardening:check`, `npm run campaign:synthetic`,
`npm run test:owner-provenance`, `npm run agent:check`, `npm run agent:audit`,
`npm run project:check`, `git diff --check`, the full canonical Playwright
run, and the established fresh isolated checkout procedure.

## Validation Strategy

Use the repository validation ladder after each narrow edit and each
workstream, then run the complete canonical and topology-correct isolated
regressions before closure. A known zero-step external CI result remains a
truthful blocked-CI classification, never a local-green substitution.

## Decision rules

- Current tests and runtime evidence outrank this plan.
- Any safety, privacy, authorization, identity, or determinism regression is
  repaired before unrelated work continues.
- Ambiguous or stale source/replay evidence degrades or blocks confidence;
  it never receives a helpful-looking fallback claim.
- Historical task records remain historical; no mass continuity migration.

## Decision Log

- M0: choose a new Phase 17 task because Phase 16CH is terminal; keep the
  successor local/source/synthetic and do not infer Phase 16D authority.
- M0: treat the four audit findings as defects and the missing selector-to-
  portfolio connection as the principal architecture gap.

## Discoveries

See STATE.md and DEFECT_LEDGER.md. The current decisive discoveries are the
property-order identity drift, unvalidated baseline read, unsafe duplicate
diagnostic, occurrence-ambiguous minimality evidence, and disconnected source
impact/portfolio planning.

## Deferred Work

Phase 16D contained DEV acceptance, Phase 6/data/infra work, external
coordination/publication, and any source impact that cannot be proven from
supplied local `SelectionResult` evidence remain deferred and unauthorized.

## Completion Criteria

All acceptance rows are evidence-backed; focused and affected tests, typecheck,
hardening, synthetic campaign, continuity/project checks, canonical full
regression, and isolated parity are green; docs/task state are terminal and
truthful; final Git HEAD equals origin/main and the tree is clean.
