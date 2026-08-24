# Phase 24 Living Plan

Task ID: phase-24-local-triage-depth-dev-readiness
Phase: 24-LOCAL-TRIAGE-DEPTH-DEV-READINESS
Authorization class: PHASE_24_LOCAL_AUTONOMOUS_TRIAGE_DEPTH_AND_DEV_READINESS_ONLY
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Extend local autonomous triage and DEV-readiness preparation through
source-derived, deterministic, privacy-safe implementation while the external
Actions execution blocker remains outside Nightwatch’s control.

## Starting State

- Canonical Nightwatch `main` is clean and synchronized at
  `da534f6af4d6d230be5f666511fab4481f1a3225`.
- Phase 23 is terminal at `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`; its exact
  Actions observation had zero executed steps.
- The one startup observation for current HEAD was run `32710478356`, job
  `97380595116`, with zero steps and classification
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`.
- Existing Phase 9–23 source, semantic, triage, replay, dossier, quality-gate,
  readiness, and proxy seams are authoritative starting points.

## Scope

Workstreams A–S from the Phase 24 request, limited to local/source/synthetic
implementation, no-contact rehearsal, deterministic evidence, and the existing
fail-closed pre-DEV protocol.

## Non-Goals

No external-CI retries or billing diagnosis, no DEV/NEXT/production contact,
no infrastructure/data-plane work, no Alphaus repository writes, no external
publication, and no weakening of source admission, privacy, policy, or exact
CI authority.

## Safety Constraints

The owner freeze and Phase 9/10 semantic rules remain permanent. Raw values are
ephemeral and category-only projections cross artifact boundaries. Unknown or
unsafe states fail closed. Any real DEV invocation remains conditional and is
expected to remain zero while the external blocker persists.

## Architecture / Approach

First join existing source qualification, contract-drift, candidate inventory,
manifest, and change-intelligence primitives in a pure deterministic ledger.
Then add a bounded Phase 24 rehearsal and artifact layer that composes existing
semantic/replay/dossier cores without granting network or persistence
authority. Extend only the smallest existing operator/CI/proxy seams needed for
diagnostics and adversarial coverage. Register all new tests in the canonical
compatibility inventory and keep serial isolation where required.

## Milestones

- [x] M0 — startup reconciliation, one Actions observation, continuity records,
  and source/architecture gap audit.
- [x] M1 — source-qualified candidate portfolio depth, deterministic eligible
  and excluded reason codes, and expanded synthetic candidate fixtures.
- [x] M2 — candidate/source-change invalidation ledger and component-level
  provenance routing with ambiguity states.
- [x] M3 — manifest v3 identity binding, canonicalization, stale-input
  invalidation, and adversarial identity matrix.
- [x] M4 — no-contact execution rehearsal v2 from manifest through teardown,
  safe deterministic rehearsal receipt, and operator blocker diagnostics.
- [x] M5 — deterministic semantic oracle expansion and bounded cross-candidate
  contradiction relationships with freshness and replay evidence.
- [x] M6 — replay v3 divergence classification, invariant-preserving
  minimization, and metamorphic synthetic campaign coverage.
- [x] M7 — dossier vNext, privacy minimization/sentinels, and owner/component
  provenance diagnostics.
- [x] M8 — exact-head CI classifier/readiness observability, proxy adversarial
  lifecycle hardening, and quality-gate runtime measurements/improvements.
- [x] M9 — clean-checkout reproducibility, synthetic campaign expansion,
  deterministic portfolio prioritization as the additional major capability,
  and focused stabilization.
- [x] M10 — authoritative local certification, final exact-head Actions
  observation, truthful external classification, documentation closure, and
  clean synchronized handoff.

## Validation Strategy

Use focused tests after each implementation slice, then affected suites, then
workstream batches. Run `npm run typecheck`, `npm run hardening:check`,
`npm run agent:check`, `npm run project:check`, `npm run campaign:synthetic`,
and `npm run test:owner-provenance` at stabilization checkpoints. Finalize
with the shared quality gate, clean-checkout qualification, the retained
Phase 23 canonical/isolated parity baseline, privacy/hardening checks, and one
current Actions observation. The final Phase 24 gate and clean-checkout gate
passed; the exact current Actions run had zero executed steps and was classified
truthfully as `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; DEV remained locked; task
files and project docs were closed without future-value placeholders; and
`main` was pushed cleanly to `origin/main`.

## Decision Log

- M0: Phase 23 history is immutable; Phase 24 begins from the synchronized
  final documentation checkpoint.
- M0: current Actions is recorded once as
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; local work continues without retry.
- M0: the first implementation slice must join existing fail-closed source
  qualification and drift primitives rather than adding unsupported extractor
  kinds or changing the approved recipe registry.

## Discoveries

The current registry and phase22 candidate bridge are intentionally frozen and
caller-fed. Existing semantic coverage has per-candidate drift primitives, but
no joined candidate invalidation ledger or source-driven portfolio renderer.
This is the initial vertical-slice opportunity; details are recorded in
`STATE.md` as they are verified.

## Deferred Work

External billing/platform recovery, any real DEV observation, owner-only auth
readiness, infrastructure/data-plane investigation, and any future source
admission requiring new extractor vocabulary remain deferred and blocked by
existing policy.

## Completion Criteria

All applicable milestones are closed with focused evidence; the shared local
quality gate, typecheck, hardening, continuity/project checks, synthetic and
owner-provenance gates, clean-checkout qualification, canonical/isolated parity,
and privacy checks pass; current Actions is observed once; the exact result is
classified truthfully; DEV remains locked unless every existing pre-DEV
category independently passes; final task files and project docs contain no
future-value placeholders; and `main` is clean and synchronized with
`origin/main`.
