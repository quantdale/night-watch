# Nightwatch Phase 10B — Contained DEV Deep-Semantic Acceptance

## Purpose

Prove the NEW Phase 10 thing with one real journey pair: CURRENT real source →
v2 deep contract → `ripple.common-exchange.read.real-source-deep` → KNOWN_READ
common-exchange journey → contained DEV → FIRST + fresh REPLAY → ALL current
deep invariants decisively evaluated (all PASS, or reproducible attributable
deep violation, or fail-closed). Zero new authority, zero mutation, zero
raw-value persistence, zero post-run patching.

## Starting State

- Task ID: `phase-10b-contained-dev-deep-semantic-acceptance`
- Starting Nightwatch SHA: `87917377a5f842c60b02fa43cd6c7df9710faa87`
- Relevant architecture: Phase 9B contained-DEV acceptance machinery
  (bin/phase9b-real.mjs, tests/manual/phase9b-contained-dev-semantic.ts,
  playwright.phase9b.config.ts, src/core/phase9b/{freshness,preflight,summary}.ts,
  browser context/observer semantic channel, realRunGate, proxy, storageState
  fixtures, journey engine, runRecorder); Phase 10A deep expectations via the
  live registry + resolver (recipe v2, PHP_ITEM_FIELD_TYPE_FLOW, evidence
  digest, TYPE_MATCH/TYPE_IN_SET)
- Dependencies: none beyond the existing repo at 8791737 (no new npm deps)
- Established facts (not to be rediscovered): Phase 10A records (REPORT 10A),
  Phase 9B/R1 records; deep invariant set == the four invariants of §7
  (mechanically re-verified at bootstrap); Phase 9B harness is historical
  shape acceptance and stays byte-identical; sibling pins 27bb007a/d80b161b

## Scope

- Additive Phase 10B harness: pure deep-acceptance core, manual runner,
  config, launcher + args parser, npm script, hardening guards, CI matrix
  step, 20-item local matrix, task records, docs closure (D-60)
- Fresh read-only source metadata + disposable /tmp snapshots at exact SHAs;
  deep re-derivation at the freshness-approved snapshot; auth structural
  gate; exact pre-DEV CI; ONE launcher invocation (FIRST + fresh REPLAY);
  safe evidence; post-run audits

## Non-Goals

- No second/third observation, no other journey, no payer/account fallback,
  no NEXT/production, no mutation, no DB/infra, no Phase 6/AI/selfDev/
  promotion/catalog, no screenshots/traces/raw persistence, no Phase 10A
  semantic-core change, no receipt-schema change, no post-run patching, no
  modification of Phase 9B files or prior records

## Safety Constraints

- Authorization `PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`; one DEV
  journey pair only; every gate fail-closed; containment identical to 9B;
  root-array PASS is not deep validation; empty array is not acceptance;
  safe evidence only; auth via structural/boolean checks only

## Architecture / Approach

Harness seam decision: the Phase 10B runner is a narrow, self-contained
mirror of the Phase 9B runner (fixed deep identity; same containment
machinery imported from src/) rather than a refactor of the historical Phase
9B entry point — Phase 9B stays byte-identical (its matrix and D-57 lineage
untouched). Deterministic acceptance mechanics are shared through the EXISTING
pure modules (src/core/phase9b/{freshness,preflight,summary}.ts) plus a NEW
additive pure module `src/core/phase10b/deepAcceptance.ts`:
- `expectedInvariantTotalFor(expectation)` — from the resolved expectation
- `assertDeepTypeContract(expectation, {path, kind, expectedType})` — proves
  the L3 item type contract exists in the resolved expectation
  (PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT when absent)
- `evaluatePhase10bDeepAcceptance(summary, {expectationId, approvedSha,
  expectedInvariantTotal, deepContract})` — phase9b binding checks + deep
  requirement: invariantTotal == expected, pass == total, N/A == 0,
  violations == 0, findings == 0; the N/A > 0 pass case fails explicitly as
  deep-invariant-not-observed
- `phase10bFreshnessBlockToken(reason)` — 10B blocker token mapping

Runner flow (mirrors 9B): gate env NIGHTWATCH_PHASE_10B_REAL=1 → env must be
dev → canonical fixed target (NIGHTWATCH_UI_URL rejected) → external
storage-state required → remote source discovery (gh api, read-only) →
disposable /tmp snapshots at exact SHAs → exact-range relevant-source diff +
route-block diff → mechanical derivation at the freshness-approved snapshot →
resolver RESOLVED with the deep expectation only → exact-head CI green (gh
api) → 13-check preflight (reused) → FIRST observation (fresh context,
contained) → deep acceptance gate → REPLAY (fresh context) → deep acceptance
gate → semantic + journey replay determinism → privacy artifact audit →
safe acceptance evidence JSON (nightwatch.phase10b-acceptance.v1).

Fixed identity (compile-time constants, no selectors):
- journey `ripple-common-exchange-read`
- target `ripple.common-exchange.read`
- expectation `ripple.common-exchange.read.real-source-deep`
- repos mobingilabs/ripple-api (master), mobingilabs/ripple-ui (dev);
  reviewed SHAs from PHASE5_SOURCE_SHAS + RIPPLE_PHASE_2B_SOURCE_SHA

## Milestones

### M0 — bootstrap + task records

- Objective: verify Git exactness; durable reads; §7 invariant proof;
  SPEC/PLAN/STATE/REPORT + ACTIVE_TASK.md
- Validation: `git rev-parse HEAD` == origin/main == 8791737; scratch
  derivation spec green (fixture + sibling, 4 invariants, digest
  ev:sha256:1447fe1342d804528a062b73)
- Status: DONE

### M1 — deep-acceptance core + harness files

- Objective: src/core/phase10b/deepAcceptance.ts (pure); phase10b
  launcher-args; phase10b launcher; playwright.phase10b.config.ts; manual
  runner tests/manual/phase10b-contained-dev-deep-semantic.ts; package.json
  `phase10b:real`; hardening guards; hardening.yml Phase 10B matrix step
- Acceptance: typecheck; hardening:check PASS
- Status: NOT_STARTED

### M2 — Phase 10B harness matrix (20 items)

- Objective: tests/unit/phase10bHarness.test.ts covering §11 1-20 (9B shape
  preservation, deep identity, no selectors, env/URL rejection, absence/
  stale/unavailable/deep-contract-missing FAIL, clean deep PASS eligible,
  root-only+N/A NOT eligible, INTERNAL_ERROR/projection FAIL, protocol FAIL,
  mutation/production impossible, replay determinism, raw-value absence)
- Validation: `npx playwright test tests/unit/phase10bHarness.test.ts
  --project=nightwatch --workers=1`
- Status: NOT_STARTED

### M3 — Phase 9B historical regression + full local validation

- Objective: phase9bFreshness + phase9bHarness matrices green (unchanged);
  typecheck; hardening:check; Phase 9/9A.1/9B/10 matrices; journey/observer/
  receipt/currentness/containment/proxy/auth tests; campaign synthetic;
  owner-provenance; agent:check/audit; project:check; catalog integrity;
  git diff --check; full clean Playwright run
- Validation: all suites listed green; 0 failed in the full run
- Status: NOT_STARTED

### M4 — fresh source discovery + deep re-derivation + auth structural

- Objective: read-only remote heads (ripple-api master, ripple-ui dev);
  exact-SHA disposable snapshots; deep re-derivation with the exact
  contract; auth structural/boolean gate on the external state file
- Validation: remote SHAs recorded; derivation PASS with 4 invariants;
  auth gate PASS (or PHASE_10B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED)
- Status: NOT_STARTED

### M5 — substantive checkpoint + exact implementation CI

- Objective: commit narrow harness adaptation + IN_PROGRESS task state;
  push fast-forward; wait exact-head CI (completed/success) incl. the new
  Phase 10B matrix step
- Validation: HEAD == origin/main; CI success at the exact SHA
- Status: NOT_STARTED

### M6 — pre-DEV final gate + the ONE launcher invocation

- Objective: all 21 gate facts true; then exactly ONE
  `npm run phase10b:real -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
  (NIGHTWATCH_PHASE_10B_CI_RUN_ID set) — FIRST + one fresh-context REPLAY;
  deep acceptance semantics required in both passes
- Validation: launcher exit 0; FIRST/REPLAY deep counts; zero hard outcomes;
  replay deterministic; deep invariant observed (N/A == 0)
- Status: NOT_STARTED

### M7 — post-run audits + terminal state

- Objective: structural privacy audit (0 raw bodies/screenshots/traces/
  storage copies/raw scalars/credential fields); sibling integrity (0
  changes); Nightwatch worktree clean; terminal status per §33/§34/§35/§48;
  update STATE
- Validation: all audits zero; terminal tokens recorded
- Status: NOT_STARTED

### M8 — docs closure + final CI + report

- Objective: D-60 docs closure commit (safe tracked state only); push
  fast-forward; exact final CI green; REPORT.md complete; ACTIVE_TASK.md
  terminal; worktree clean
- Validation: final CI success at exact final HEAD; agent:check PASS
- Status: NOT_STARTED

## Validation Strategy

Focused: phase10bHarness matrix, phase9b matrices (unchanged), phase10
matrices, typecheck, hardening:check, git diff --check. Global: full clean
Playwright run (0 failed), campaign synthetic, owner-provenance, agent:check/
audit, project:check, catalog integrity. Exact CI (GitHub Actions) before any
DEV contact and after docs closure. CI is LOCAL/SYNTHETIC only and never
contacts DEV.

## Decision Log

- Seam decision: Phase 9B runner/config/test stay byte-identical; the Phase
  10B runner is a narrow self-contained mirror of the 9B orchestration, reusing
  the deterministic Phase 9B mechanics (freshness/preflight/summary/replay
  comparison) plus one new pure module `src/core/phase10b/deepAcceptance.ts`.
  Rationale: `tests/unit/phase9bHarness.test.ts` and the hardening integration
  checks read the 9B runner source directly; any shared-orchestration refactor
  would force historical test/hardening changes (not acceptable for D-57
  preservation).
- Fixed identity: no journey/expectation/target/URL selectors anywhere in the
  Phase 10B launcher or runner; the runner hard-codes
  ripple-common-exchange-read / ripple.common-exchange.read /
  ripple.common-exchange.read.real-source-deep and requires
  NIGHTWATCH_PHASE_10B_REAL=1 + --env=dev + external storage state.
- Expected invariant total is DERIVED from the resolved expectation
  (`expectedInvariantTotalFor`), never hard-coded; the fixed deep contract
  TYPE_MATCH [0, exchange_rate] OBJECT must be proven present
  (assertDeepTypeContract → PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT).
- No semantic receipt-schema change (authorization §10): aggregate counts are
  sufficient for the fixed common-exchange canary; per-invariant runtime
  values are never added.
- Terminal classification is decided after the run from safe summary counts
  (clean PASS / reproducible attributable deep mismatch / fail-closed
  BLOCKED); the runner asserts the clean or blocked path fail-closed.
- Finding vocabulary: TYPE_MATCH violations surface with observedClass
  TYPE_CONTRADICTED under category SOURCE_EXPECTATION_MISMATCH (established
  Phase 10A behavior; not changed by Phase 10B).

## Discoveries

- The deep contract is mechanically re-derived identically from the synthetic
  Phase 10 fixture and the canonical sibling checkout (read-only, reviewed
  pin): 4 invariants incl. TYPE_MATCH [0, exchange_rate] OBJECT; digest
  ev:sha256:1447fe1342d804528a062b73; expectedInvariantTotal 4.
- Phase 9B-R1 evidence stays truthful at its old checkpoint (shape digest
  ev:sha256:608265368c9a086f43c94e5c is historical-only).
- The strict-v2 checker rejects `Authorization:` + value phrasing as a
  credential assignment (authorization is in the scanner keyword list);
  records use `Authorization class:`.
- agent:check requires a real 40-char LAST_SUBSTANTIVE_CHECKPOINT_SHA or the
  field's absence (falls back to the validated implementation anchor with a
  LEGACY_CONTINUITY warning); the field is added at the M5 checkpoint commit.

## Deferred Work

- Phase 9B historical runner/config/test stay byte-identical (no shared
  orchestration refactor; see Decision Log).
- Anything requiring a Phase 10A semantic-contract change is a separate fix
  task, not Phase 10B.
- No per-invariant runtime evidence in receipts (authorization §10 default).

## Completion Criteria

- Local/synthetic validation green: typecheck, hardening:check, Phase 9/9A.1/
  9B/10 matrices, Phase 10B harness matrix, campaign synthetic,
  owner-provenance, agent:check/audit, project:check, catalog integrity,
  full clean Playwright (0 failed, only pre-existing environment-conditional
  skips), isolated checkout, git diff --check.
- Substantive Phase 10B harness checkpoint pushed fast-forward; exact
  implementation CI green (incl. the Phase 10B matrix step) BEFORE DEV.
- Fresh remote source heads discovered (read-only); disposable snapshot;
  deep re-derivation PASS (exact 4-invariant contract, digest present);
  journey still KNOWN_READ.
- Auth structural gate PASS (boolean-only checks on the external state file).
- Exactly ONE launcher invocation owning FIRST + ONE fresh-context REPLAY.
- Clean PASS (invariantTotal == expected, pass == total, N/A 0, violations 0,
  findings 0, protocol/journey/auth PASS, deterministic, safe evidence) OR
  reproducible attributable deep mismatch OR exact BLOCKED token.
- Post-run privacy/sibling/worktree audits clean; docs closure D-60 pushed
  with exact final CI; 99-item final report; worktree clean; NEXT ACTION STOP.

## Blockers / Stop conditions

- PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT (registry/derivation differs)
- PHASE_10B_BLOCKED_REAL_SOURCE_DEEP_CONTRACT_DRIFT (current source changes
  the deep contract)
- PHASE_10B_BLOCKED_JOURNEY_SOURCE_DRIFT (UI journey moved)
- PHASE_10B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED (auth invalid/expired)
- PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED (root-only PASS / empty array)
- PHASE_10B_BLOCKED_SEMANTIC_NONDETERMINISM (FIRST vs REPLAY diverge)
- PHASE_10B_BLOCKED_ANOMALY_ATTRIBUTION_INSUFFICIENT (anomaly not attributable
  to the deep contract)
- PHASE_10B_BLOCKED_PHASE10A_RUNTIME_DEFECT / _HARNESS_RUNTIME_DEFECT
- PHASE_10B_BLOCKED_PROTOCOL / _JOURNEY / _CONTAINMENT
- PHASE_10B_DEV_ACCEPTANCE_NOT_PROVEN (any hard outcome)
- PHASE_10B_BLOCKED_HARNESS_SEAM_DESIGN (9B preservation impossible)
- PHASE_10B_STOPPED_SOURCE_ADVANCED (main advanced with unrelated work)
