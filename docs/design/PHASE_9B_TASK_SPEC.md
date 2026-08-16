# Phase 9B — Contained DEV Semantic Acceptance (future-task spec, DESIGN ONLY)

> Repository-native design document (`docs/design/*.md` approved checkpoint
> path). Produced by Phase 9A.1 (`phase-9a-1-real-source-expectation-
> admission`, authorization `PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`)
> as the next-task spec. This document DESIGNS Phase 9B; it does NOT
> authorize or execute it.
> `PHASE_9B_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`

## 1. Status

```
PHASE_9B_STATUS: BLOCKED (original authorization, 2026-08-16 — D-56)
PHASE_9B_R1_STATUS: COMPLETE (auth-refreshed retry, 2026-08-16 — D-57)
PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9B_R1_DEV_RESULT: PASS
PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED
PHASE_9_STATUS: COMPLETE
PHASE_9B_DEV_READINESS: (Phase 9A.1 verdict — see docs/CURRENT_STATE.md)
```

Execution history: this spec was design-only until the owner granted
`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` (2026-08-16). The Phase 9B
task (D-56) built and validated the harness, executed the ONE authorized
acceptance pair through the gated launcher, and stopped fail-closed at the
pre-browser auth gate (expired external DEV storage-state cookie). The
owner then human-refreshed the DEV session and granted the fresh retry
authorization `PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`
(D-57): the already-validated harness ran unmodified (zero source changes)
and the ONE launcher invocation produced FIRST + REPLAY decisive PASS with
zero anomalies and zero safety violations —
`COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED` / `PASS`; Phase 9 is COMPLETE.

## 2. Task identity

- **Task ID:** `phase-9b-contained-dev-semantic-acceptance`
- **Phase:** `9B-CONTAINED-DEV-SEMANTIC-ACCEPTANCE`
- **Title:** Nightwatch Phase 9B — Contained DEV Semantic Acceptance
- **Authorization class (future):** `PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`
- **Continuity:** `nightwatch.agent-continuity.v2`
- **Prerequisite:** Phase 9A.1 COMPLETE with the readiness verdict
  `READY_FOR_SEPARATE_AUTHORIZATION`.

## 3. Objective

Run ONE bounded contained DEV acceptance of the REAL-SOURCE-DERIVED AND
ADMITTED semantic expectations (Phase 9A.1 bridge) against canonical DEV
only, using already-approved read-only journeys, and produce safe
semantic-evaluation receipt evidence proving:

```
EXPECTATION RESOLVED
  + SEMANTIC EVALUATION RECEIPT EXISTS
  + OUTCOME IS EXPLICIT
  + ZERO PRIVACY / SAFETY FAILURE
```

## 4. What Phase 9B uses (from Phase 9A.1)

- The fixed recipe registry (`nightwatch.real-source-expectation-recipe.v1`,
  `REAL_SOURCE_EXPECTATION_RECIPES`) — data-only recipes admitted from the
  current source audit.
- The bounded syntax-aware extractors + admission bridge
  (`deriveRealSourceExpectations`) — fresh derivation at run start against
  the EXACT current source snapshot; NEVER a silent re-bind.
- The atomic resolver (`createRealSourceResolver`) — per-expectation source
  snapshot; fail-closed stale/unavailable.
- Safe evaluation receipts (`nightwatch.semantic-evaluation-receipt.v1`)
  with the nine-outcome vocabulary; NO_EXPECTATION/STALE/UNAVAILABLE/
  NOT_APPLICABLE/INTERNAL_ERROR are never PASS.
- The network observer semantic evaluation ledger (`semanticEvaluations()`)
  and the no-silent-failure path (INTERNAL_ERROR receipts, privacy-violation
  escalation).

## 5. Execution contract (narrow by construction)

- Canonical DEV environment ONLY (the existing approved contained DEV
  surface); production and NEXT remain impossible.
- Only the already-approved read-only journeys/operations (Phase 2B/2C/7
  approved journeys; Phase 5 KNOWN_READ relay) — no new endpoint authority.
- Semantic hook enabled ONLY for admitted real-source expectations bound to
  the exact current source snapshots; a changed source -> STALE receipts ->
  acceptance not proven (no silent refresh).
- No mutation; no DB/infra; no screenshots/DOM/raw-body persistence; no new
  network authority; one bounded run; STOP.
- Safe receipt evidence required; `expectation count == 0` is NEVER an
  acceptance result.

## 6. Acceptance semantics (Phase 9B success must not require finding a bug)

A healthy DEV run may produce:

```
semantic evaluations > 0
PASS > 0
anomalies = 0
```

and that IS valid acceptance evidence. The key proof is: real
source-derived expectation + real contained DEV response + safe semantic
evaluation receipt + no privacy leak + no safety violation. Any naturally
observed anomaly is evidence to triage, not an acceptance requirement.

DEV SEMANTIC ACCEPTANCE NOT PROVEN when ANY of: zero resolved expectations,
zero evaluation receipts, stale source, internal errors. Zero anomalies
alone proves nothing.

## 7. Forbidden

- Any mutation operation; DB/infra (Phase 6 freeze); AI authority; selfDev/
  promotion; catalog mutation; variant-B adoption; publication; Alphaus
  writes; new endpoint authority; expectation-count-zero acceptance;
  synthetic expectations bound to real SHAs.

## 8. STOP conditions

One bounded run completes (or a fail-closed gate trips) -> STOP. Any
privacy violation -> STOP + escalation record. Source advanced mid-run ->
STOP + STALE receipts + re-derivation required before any retry.

## 9. NOT_AUTHORIZED marker

```
PHASE_9B_IMPLEMENTATION_AUTHORITY: GRANTED_ONCE (PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY, 2026-08-16)
PHASE_9B_R1_IMPLEMENTATION_AUTHORITY: GRANTED_ONCE (PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY, 2026-08-16)
PHASE_9B_STATUS: BLOCKED (original, D-56)
PHASE_9B_R1_STATUS: COMPLETE (D-57)
PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9B_R1_DEV_RESULT: PASS
```

This spec designed Phase 9B; the one-time owner authorization
(`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`) was granted and
executed once (D-56): the harness was implemented/validated/CI-proven, and
the one acceptance run stopped fail-closed at the pre-browser auth gate
(expired external DEV auth cookie) with zero DEV contact. The fresh retry
authorization (`PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`)
was granted after the owner's human-led auth refresh and executed once
(D-57): the unmodified harness produced FIRST + REPLAY decisive PASS with
zero violations — DEV semantic acceptance VERIFIED, Phase 9 COMPLETE. No
further execution is authorized: any further DEV semantic acceptance
requires a fresh owner authorization.
