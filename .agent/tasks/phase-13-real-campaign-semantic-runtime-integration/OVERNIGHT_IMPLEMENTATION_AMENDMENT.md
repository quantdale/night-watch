# OVERNIGHT IMPLEMENTATION AMENDMENT — Phase 13

Status at publication: DORMANT. This file does not itself authorize implementation.
Owner execution token: `PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY`.

## Purpose

Temporarily split the existing Phase 13 design into an **implementation-first overnight batch** followed by a separate hardening campaign. The architecture and safety boundaries in `SPEC.md`, the workstream files, and `docs/design/PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION.md` remain authoritative. This amendment changes only the implementation batching, validation cadence, and terminal definition for the overnight session.

The overnight session should maximize useful source implementation while the owner is away. It must complete exactly three substantial change tranches, checkpointing each, and must not spend the night running the full Phase 13 acceptance matrix.

## Authority

When the owner supplies the exact token above, the executor may modify Nightwatch source/tests/docs needed for the three change tranches below.

This remains **LOCAL/SOURCE-ONLY**. It grants no DEV, NEXT, production, real campaign, product mutation, DB/data-plane, infrastructure/Phase 6, Alphaus-repository write, AI/model authority, selfDev/promotion/catalog mutation, publication, or new endpoint/target authority.

Phase 11B and any Phase 13 DEV acceptance remain NOT_AUTHORIZED.

## Change 1 — Contract & identity correctness

Implement the contract-integrity portion of the existing Phase 13 design as a coherent source change:

- fix API replay-plan cardinality so an API candidate has exactly one original and one retained approved operation;
- make replay control occurrence-aware wherever duplicate action IDs can occur, with deterministic occurrence identity and strict order-preserving subsequence validation;
- version replay-plan schema if immutable meaning changes; preserve safe historical parsing and fail closed on ambiguous conversion;
- make semantic-triage evidence cross-field coherence strict, especially PARTIAL_COVERAGE, coverage state, source currentness, exact replay/fingerprint, and minimality/reproduction relationships;
- ensure semantic dossier/AI-ready confidence never overstates the deterministic semantic confidence;
- preserve privacy-safe IDs and zero raw product values.

Do not expand into broad regression work. Source inspection and small local reproducers are allowed only as needed to avoid implementing the wrong behavior.

Checkpoint label: `OVERNIGHT_C1_CONTRACT_IDENTITY_IMPLEMENTED`.

## Change 2 — Real-campaign semantic runtime plumbing

Implement the source architecture needed for the existing real campaign path to consume semantic authority later, without running the product:

- introduce/finalize a strict frozen semantic campaign source bundle binding existing approved target/journey/operation identity, source SHA/currentness, expectation/evidence digest, derivation version, collection-admission identity, resolver state, and deployment-status-unresolved truth;
- separate read-only freshness/source-bundle production from pure consumers;
- wire the existing `semanticOracle` / network-observer seam into the real campaign adapter for fixed already-approved mappings only;
- attach only sanitized semantic receipt/finding/control metadata to campaign candidate evidence;
- unsupported surfaces remain protocol-only and fail closed rather than gaining invented semantic authority;
- evolve campaign manifest/checkpoint/version fingerprint schemas as required so replay-plan, semantic evidence, source-bundle, receipt/oracle, cluster, and dossier identities are frozen and resume drift is detectable;
- keep historical campaign evidence explicitly versioned rather than silently reinterpreted.

No remote product request is allowed. Read-only source metadata/snapshot code may be implemented, but do not perform a real campaign or DEV canary.

Checkpoint label: `OVERNIGHT_C2_SEMANTIC_RUNTIME_PLUMBING_IMPLEMENTED`.

## Change 3 — Real replay, triage, clustering & dossier integration

Complete the source integration from campaign candidate to private dossier:

- remove/bypass the generic `invalidReducedReplay()` seam for candidate classes that the Phase 12/13 source architecture can mechanically support;
- bind occurrence-aware validated replay plans to journey/exploration/API replay executor interfaces without executing them;
- exact fingerprint equality remains the reproduction rule; PARTIAL/stale/unsafe/privacy-nonzero cannot reproduce;
- unsupported journey reduction must remain explicitly unsupported rather than simulated;
- route semantic candidates through semantic cluster identity, semantic triage evidence, categorical semantic confidence, and dossier v2 readiness;
- retain protocol-only historical behavior for non-semantic candidates;
- make checkpoint/morning-brief/private-output surfaces carry only sanitized categorical evidence needed for owner review;
- ensure no caller-provided field can pre-certify HIGH, READY, reproduced, current, or safe;
- update exports/types/integration seams so the architecture is compile-complete and ready for a later hardening campaign.

Checkpoint label: `OVERNIGHT_C3_REAL_TRIAGE_DOSSIER_INTEGRATION_IMPLEMENTED`.

## Execution strategy

1. Fetch and fast-forward clean `main`; Git state wins.
2. Read `AGENTS.md`, the complete Phase 13 package, this amendment, and the hardening handoff file.
3. Record authorization and transition the Phase 13 task to IN_PROGRESS; make it active.
4. Implement Change 1 completely enough that the source is internally coherent. Run **typecheck + git diff --check only** before checkpointing/pushing it.
5. Continue directly to Change 2. Do not start a hardening campaign. Again run **typecheck + git diff --check only** before checkpointing/pushing.
6. Continue directly to Change 3. Do not stop merely because Change 1 or 2 is complete.
7. After all three changes are implemented, run the minimal end-of-batch sanity set below.
8. Update task STATE/PLAN/REPORT and `HARDENING_HANDOFF.md` with actual implementation SHAs, changed surfaces, known risks, unrun tests, and exact recommended hardening order.
9. Push the final implementation/docs checkpoint fast-forward to `main` and STOP.

If one change has a genuine structural blocker, record it and continue any independent portions of the other authorized changes. Never invent behavior to avoid a blocker.

## Minimal validation only

The overnight run is **not** the Phase 13 hardening/acceptance campaign.

Allowed/required validation during implementation:

- after each change tranche: `npm run typecheck` (or the repository's equivalent TypeScript compile check) and `git diff --check`;
- at the very end: one small focused smoke file or equivalent, capped at roughly 15 focused cases total, covering only catastrophic wiring errors across C1/C2/C3;
- `npm run agent:check` at final continuity closure.

Explicitly defer until the next hardening campaign:

- `npm run hardening:check`;
- complete Phase 13 acceptance matrix;
- full Phase 9/10/11/12 compatibility matrices;
- `campaign:synthetic` and owner-provenance regression;
- canonical complete Playwright;
- topology-correct isolated complete Playwright;
- fresh-source real-source canary as an acceptance gate;
- exhaustive privacy/adversarial/mutation matrices;
- exact CI-green requirement.

GitHub Actions may trigger from pushes. Inspect only enough to record whether jobs started; do not wait on or repeatedly retry the known billing block. If Actions unexpectedly executes and reports failures, record them in the hardening handoff. Only stop immediately when the failure proves a safety-boundary or compile-level structural problem in the newly implemented code.

## Overnight terminal state

Do **not** claim Phase 13 COMPLETE or VERIFIED.

The successful overnight terminal state is:

```text
PHASE_13_OVERNIGHT_C1: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C2: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C3: IMPLEMENTED_AWAITING_HARDENING
PHASE_13A_STATUS: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

The next owner task is one comprehensive Phase 13 hardening campaign covering all three implementation tranches together.