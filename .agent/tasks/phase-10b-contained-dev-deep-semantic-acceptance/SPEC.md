# Nightwatch Phase 10B — Contained DEV Deep-Semantic Acceptance

## Task purpose

Execute the ONE authorized contained DEV acceptance of the CURRENT real-source
v2 DEEP expectation `ripple.common-exchange.read.real-source-deep` through the
fixed common-exchange journey `ripple-common-exchange-read` against the
canonical DEV UI, with exactly ONE launcher invocation owning FIRST + ONE
fresh-context REPLAY, requiring the L3 item type contract itself to be
decisive. Preserve the historical Phase 9B shape-contract harness
byte-identical. Local/synthetic validation and exact pre-DEV CI before any
product contact. Safe evidence only. Docs closure (D-60). STOP.

## Established starting state

- Task ID: phase-10b-contained-dev-deep-semantic-acceptance
- Starting SHA: 87917377a5f842c60b02fa43cd6c7df9710faa87 (HEAD == origin/main,
  worktree clean; CASE D — exact expected source, no existing Phase 10B task)
- Phase 10A validated implementation: 6cef0c45b0733c3a7179789b360eeaba40ab931b
  (implementation CI 31946005458 success; final CI 31947025008 success)
- Phase 9B-R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED / PASS (D-57);
  original Phase 9B task BLOCKED historical (D-56)
- PHASE_10_DEEPER_SEMANTIC: COMPLETE (local/synthetic); DEV validation NOT_RUN;
  PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
- Deep contract (mechanically re-verified at bootstrap, §7): root TYPE_MATCH
  [] ARRAY; FIELD_PRESENT [0, month]; FIELD_PRESENT [0, exchange_rate];
  TYPE_MATCH [0, exchange_rate] OBJECT — invariantTotal 4; evidence digest
  ev:sha256:1447fe1342d804528a062b73 (synthetic fixture AND canonical sibling
  @ 27bb007a derive identically)
- Historical shape expectation `ripple.common-exchange.read.real-source-shape`
  stays historical (Phase 9B-R1 evidence, D-57) and is NOT the Phase 10B
  current contract
- Canonical siblings: mobingilabs/ripple-api @ 27bb007a (reviewed pin),
  mobingilabs/ripple-ui @ d80b161b (reviewed pin) — read-only, UNTOUCHED

## Required deliverables

- Strict-v2 task records (SPEC/PLAN/STATE/REPORT) + ACTIVE_TASK update
- Pure `src/core/phase10b/deepAcceptance.ts` (deep-acceptance mechanics;
  additive; no receipt-schema change; reuses phase9b summary pure modules)
- `tests/manual/phase10b-contained-dev-deep-semantic.ts` (fixed deep identity;
  no selectors; FIRST + one fresh-context REPLAY; deep acceptance semantics)
- `playwright.phase10b.config.ts`, `bin/phase10b-launcher-args.mjs`,
  `bin/phase10b-real.mjs`, `npm run phase10b:real`
- `tests/unit/phase10bHarness.test.ts` (the §11 20-point local matrix)
- hardening guards (checkPhase10bCorePurity + checkPhase10bIntegrationSeams)
  + `hardening.yml` "Phase 10B contained DEV deep-semantic acceptance harness
  matrix" step (LOCAL/SYNTHETIC only; CI never contacts DEV)
- Fresh read-only remote source discovery + disposable /tmp snapshots at the
  exact SHAs; re-derivation of the deep expectation at the freshness-approved
  snapshot; resolver RESOLVED; DEV reachable; KNOWN_READ
- Auth structural/boolean validation of
  `$HOME/.nightwatch/auth/ripple-dev-state.json` (never contents)
- One substantive Phase 10B harness checkpoint pushed fast-forward + exact
  green CI BEFORE product contact
- Exactly one `npm run phase10b:real -- --env=dev --storage-state=...`
  invocation (FIRST + ONE fresh-context REPLAY), deep acceptance required:
  outcome PASS, invariantTotal == expected (4), invariantPassCount == total,
  invariantNaCount == 0, invariantViolationCount == 0, findingCount == 0
- Safe receipts + acceptance evidence (no raw values); post-run structural
  privacy audit; sibling integrity check
- Docs closure D-60 (CURRENT_STATE, ROADMAP, ARCHITECTURE, DECISIONS,
  SAFETY_MODEL, PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md; optionally
  PHASE_10B_DEV_ACCEPTANCE.md) + final exact CI + terminal state + report

## Explicit non-goals

- NO second launcher invocation / third observation / other journey
- NO payer-exchange fallback, NO account-inventory fallback, NO NEXT, NO
  production, NO POST/PUT/PATCH/DELETE, NO product mutation
- NO DynamoDB/BigQuery/Spanner/GCP/GKE/Kubernetes/AWS runtime/IAM
- NO Phase 6, NO AI/model execution, NO AI oracle authority
- NO screenshots, NO authenticated traces, NO DOM snapshots, NO raw response
  persistence, NO raw customer-value persistence
- NO Phase 10A semantic-core redesign, NO receipt-schema change, NO
  campaign/triage changes, NO real-minimization fixes
- NO selfDev, NO sandbox adoption, NO canonical promotion, NO catalog mutation,
  NO variant-B adoption, NO publication, NO post-run patching
- NO modification of the historical Phase 9B runner/config/test or prior task
  records (D-56/D-57/D-59 stay truthful)

## Safety constraints

- Authorization class: PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY (owner
  pasted prompt). One DEV journey pair only. Anything needing a Phase 10A
  semantic-contract change: STOP (separate fix task).
- Fail-closed at every gate: git exactness, source freshness, deep derivation,
  resolver RESOLVED, exact CI, auth structural, proxy health, canonical target.
- Containment identical to Phase 9B (L0-L5, QUIC/WebRTC off, trace/screenshot/
  DOM/raw persistence off, mutation registry on).
- Empty top-level array ⇒ N/A item invariants ⇒ NOT acceptance
  (PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED); root-array PASS alone is
  NOT deep validation.
- Safe evidence only: expectationId/targetId/source SHA/relative path/evidence
  digest/receipt outcome/projection digests/invariant counts/finding
  fingerprints/safety counts. Never raw bodies, values, identifiers.
- No secrets in source/artifacts/.agent. Auth state handled only through
  structural/boolean checks.

## Acceptance criteria

- Phase 9B harness matrix + full regression green; historical shape selection
  proven (Phase 9B runner still fixes `ripple.common-exchange.read.real-source-shape`)
- Phase 10B harness matrix (20 items) green locally and in exact CI
- Deep expectation derived at the freshness-approved snapshot with the exact
  4-invariant contract incl. TYPE_MATCH [0, exchange_rate] OBJECT;
  expectedInvariantTotal derived from the resolved expectation (not hard-coded
  independently)
- Exactly one launcher invocation; FIRST + REPLAY both deep PASS with
  invariantTotal 4 / pass 4 / N/A 0 / violations 0 / findings 0, or a
  reproducible attributable deep mismatch, or an exact blocked terminal state
- Zero hard semantic outcomes, zero safety counters, zero privacy leaks
- Terminal: PHASE_10B COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED (PASS or
  PASS_WITH_REPRODUCIBLE_DEEP_SEMANTIC_MISMATCH) with PHASE_10_STATUS COMPLETE
  and NEXT ACTION STOP, or PHASE_10B BLOCKED with exact token(s) and STOP
- Docs closure D-60 + final exact CI + clean worktree + 99-item final report

## Continuity

STARTING_SHA: 87917377a5f842c60b02fa43cd6c7df9710faa87
LAST_VALIDATED_IMPLEMENTATION_SHA: 6cef0c45b0733c3a7179789b360eeaba40ab931b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: DISCOVER_FROM_GIT
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
