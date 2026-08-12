# Task State

## Identity

Task ID: phase-2c-replay-oracle-verification
Phase: 2C
Status: IN_PROGRESS
Starting SHA: 1760e594419cabdcec12f6506cabe3aa242331c4
Current SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Last validated implementation SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Branch: `main`
Last checkpoint: 2026-08-12 — comparator repair and diagnostic harness
validated at implementation `efc03de2f7396a96baaca485894df300ddcc4ce0`;
v2 diagnostic checkpoint is being prepared.

## Objective

Verify that Nightwatch's replay and oracle conclusions for the three frozen
Phase 2B Ripple journeys are reproducible, causally attributable, variance-
tolerant, privacy-safe, and conservative about anomaly admission.

## Current Milestone

M6 — Differential analysis and failure attribution.
Status: IN_PROGRESS
What is being attempted: preserve V1 evidence, repair the proven shared
comparator defect, and validate the corrected classification with synthetic
coverage plus one bounded J1 diagnostic context.

## Completed Milestones

- M0 — COMPLETE. Phase 2A/2B closure and SHA semantics were independently
  reconciled against Git; Phase 2B remains closed.
- M1 — COMPLETE. Native Phase 2C task and frozen SPEC/PLAN/STATE/REPORT were
  created with only J1/J2/J3 and six serial contexts.
- M2 — COMPLETE. Replay/oracle/evidence inventory, false-positive catalog,
  false-negative catalog, and journey contract audit were recorded.
- M3 — COMPLETE. Shared hardening, golden fixtures, admission model, and
  focused/full local synthetic coverage passed.
- M4 — COMPLETE. Full local validation, privacy scan, Alphaus read-only status
  audit, and adversarial self-review passed; implementation checkpoint
  `043c2cc` is frozen for real execution.
- M5 — COMPLETE. The six-context V1 serial matrix completed safely; all six
  journeys passed and the sanitized differential ledger was captured.
- Comparator defect repair — COMPLETE. Expected cancellation is now bounded
  containment with synthetic regression; full local validation is green at
  `efc03de`.

## Work In Progress

M6 is the active bounded work unit. V1 evidence is frozen; the shared
comparator repair and synthetic regression pass at `efc03de`. One narrowly
scoped J1 diagnostic context under matrix v2 remains.

## CURRENT_GOAL

Turn the three Phase 2B deterministic journeys into trustworthy behavioral
canaries by validating replay isolation, generic/journey-specific oracle
precision, variance handling, false-positive resistance, failure attribution,
and conservative anomaly admission.

## CURRENT_PHASE

M6 — differential analysis and failure attribution; Phase 2B remains closed.

## CURRENT_EVIDENCE

- Phase 2A is closed: implementation `a6d7c8b`, closure checkpoint `9bf2c45`,
  terminal clean documentation HEAD `ec4c143`; its successful fresh-auth first
  observation/replay and historical safety facts remain authoritative.
- Phase 2B is closed: implementation `78e5d1f`, completion checkpoint `1b6e7a5`,
  terminal clean HEAD `1760e594`; Git shows only approved `.agent` continuity
  descendants after the implementation baseline.
- Phase 2B canaries are exactly J1 payer exchange-rate read, J2 common
  exchange-rate read, and J3 account inventory. No new journey is authorized.
- Phase 2B controlled contexts are preserved as seven sanitized historical
  contexts: J1 first/replay, J2 initial plus bounded diagnostic first/replay,
  and J3 first/replay. J2's initial font 502 is L0 and was not reproduced by
  its diagnostic pair.
- Phase 2B historical malformed JSON remains a genuine protocol anomaly at an
  unresolved semantic endpoint and was not intentionally replayed.
- Phase 2C pre-real implementation checkpoint `043c2cc02b96ce9aec42c6b529978150c09dabfe`
  is preserved with contract `nightwatch.journey.phase2c.v1`,
  oracle `nightwatch.oracle.phase2c.v1`, evidence `nightwatch.evidence.phase2c.v1`,
  and matrix `phase2c-real-v1`.
- The frozen contract and budget are written in `SPEC.md`: J1/J2/J3 only and
  exactly six additional serial contexts `J1-C1 → J1-C2 → J2-C1 → J2-C2 →
  J3-C1 → J3-C2` before any real execution.
- The current replay/oracle audit is recorded in the static replay/oracle
  section of `REPORT.md` and summarized here.
  Fresh-context construction, shared safety policy, cancellation taxonomy,
  source-backed route/structural checks, pageerror, warning separation,
  semantic mutation tripwire, and privacy mode are HEALTHY. The comparator,
  mutable contract identity, role-agnostic status/resource oracle, missing
  direct content-type admission, bootstrap runtime/CSP admission, and flat
  failure attribution are concrete hardening findings.
- The false-positive and false-negative catalogs are recorded in the
  corresponding sections of `REPORT.md`; both are based on current source,
  tests, and historical Nightwatch artifacts, not live product assumptions.
- M3 shared hardening is implemented in Nightwatch only: contract digest and
  runtime freeze helpers; evidence schema extensions; dimensioned replay
  comparison/differential evidence; role-aware resource status/content/lifecycle
  checks; sanitized fingerprints; structured monitor observations and failure
  attribution; and page-visible auth preflight in the Phase 2C runner.
- Local synthetic coverage is PASS so far: the browser-backed journey matrix
  covers critical JS 500, font 502, optional image 404, JS-as-HTML,
  cancellation, unhandled rejection, CSP, warning-only, route/structure,
  mutation/UNKNOWN, malformed JSON, and privacy fixtures. The pure matrix
  covers strict/bounded replay, semantic divergence, same/different anomaly
  fingerprints, lifecycle classes, NDJSON/empty/204/aborted-body handling,
  legacy evidence parsing, and primary/secondary attribution.
- The Phase 2C v1 real matrix completed serially in artifact
  `artifacts/phase2c-nightwatch-20260812T041319Z-6552-matrix.json`. All six
  observations were PASS with valid page-visible auth, required structural
  markers, expected read families, privacy PASS, and zero safety counts.
- Differential review found one shared Nightwatch comparator defect: J1-C1
  recorded six expected third-party `CANCELED_BY_POLICY` resources while J1-C2
  recorded five. The journeys and safety ledgers both passed; the comparator
  incorrectly emitted strict `resource-lifecycle`/`ORACLE_DIVERGENCE` instead
  of treating expected containment as bounded variance. J2 and J3 were
  bounded matches. This is `PHASE_2C_DISCOVERED_SHARED_INFRA_DEFECT`.

## CANARY_SET

1. `ripple-payer-exchange-read` (J1) — `/payer-exchange-rate-v2` —
   `.__ExchangeRate` and `.__ExchangeRateDataTable`.
2. `ripple-common-exchange-read` (J2) — `/global-exchange-rate-v2` —
   `.__GlobalExchangeRateDataTable`.
3. `ripple-account-inventory` (J3) — `/accounts` — `.__CustomDataTable`.

## ORACLE_INVENTORY

Status: COMPLETE for the static inventory and implementation hardening. The
complete family-by-
family inventory and verdicts are in the static replay/oracle section of
`REPORT.md`: status/resource criticality, content type,
JSON/NDJSON, runtime, CSP, structural/route/auth, semantic request,
cancellation, safety, privacy, replay comparison, fingerprint, and failure
attribution.

## REPLAY_MODEL_STATUS

Phase 2B baseline: PASS for one first/replay pair per canary (J2's initial
font anomaly stopped before replay; its bounded diagnostic pair passed).
Phase 2C audit: current source audit COMPLETE; hardening IMPLEMENTED; focused
synthetic validation PASS. Fresh BrowserContext/Page identity and per-context
monitor/network state are healthy. Definition digest/freeze, dimensioned
comparison, category variance, and historical artifact compatibility are
implemented; focused and full local validation PASS.

## STRICT_INVARIANTS

Frozen in SPEC: contract identity; auth validity; zero production, proxy,
unknown destination/approval, mutation, DB query, and action-caused UNKNOWN;
approved route; global/journey structural readiness; expected KNOWN_READ
families with no mutation; fatal runtime/oracle/privacy status; and separate
failure attribution.

## BOUNDED_VARIANCE

Frozen in SPEC: timing/cleanup; concurrent ordering; passive UNKNOWN counts;
optional/telemetry/browser-background counts; non-critical asset and safe
cleanup-incomplete counts; network concurrency/initialization timing. No
arbitrary percentage tolerance is authorized.

## FALSE_POSITIVE_LEDGER

Status: COMPLETE. The durable catalog in the false-positive section of
`REPORT.md` includes
expired-auth versus
product failure, Vue pre-mount `#app` versus readiness, navigation-canceled
resource versus critical asset failure, timing-only reload causality,
context-only auth validity, and transient DEV font 502.

## FALSE_NEGATIVE_LEDGER

Status: COMPLETE. The false-negative section of `REPORT.md` records concrete
current risks:
unhandled rejection/CSP not admitted to journey result, JS-HTML content type,
optional-resource role loss, semantic count/order erasure, navigation UNKNOWN
exemption, post-journey auth classification, absent fingerprints/background
comparison, unstructured causality, and run-wide required-read attribution.

## REAL_RUN_LEDGER

Phase 2B historical runs are recorded in its task STATE/REPORT. Phase 2C v1
completed the six additional serial contexts:

`J1-C1 → J1-C2 → J2-C1 → J2-C2 → J3-C1 → J3-C2`.

Run IDs and final classifications:

- J1: `nightwatch-20260812T041319Z-6552-j1-c1` PASS;
  `nightwatch-20260812T041319Z-6552-j1-c2` PASS.
- J2: `nightwatch-20260812T041319Z-6552-j2-c1` PASS;
  `nightwatch-20260812T041319Z-6552-j2-c2` PASS.
- J3: `nightwatch-20260812T041319Z-6552-j3-c1` PASS;
  `nightwatch-20260812T041319Z-6552-j3-c2` PASS.

All six had page-visible auth PASS, privacy PASS, and safety vector zero.
The base budget is not expanded for a product/infra anomaly; only the proven
Nightwatch comparator defect can create one new matrix version and one
narrowly justified diagnostic context.

## REPLAY_MATRIX_LEDGER

Status: V2_DIAGNOSTIC_READY. V1 completed and is preserved. The corrected
comparator is validated locally; one additional J1 context is authorized only
under the new matrix version and will not be compared to V1 as an equivalent
replay.

Pre-real checkpoint: `PHASE_2C_PRE_REAL_MATRIX_READY`.
Implementation SHA: `043c2cc02b96ce9aec42c6b529978150c09dabfe`.
Contract version: `nightwatch.journey.phase2c.v1`.
Oracle version: `nightwatch.oracle.phase2c.v1`.
Evidence schema: `nightwatch.evidence.phase2c.v1`.
Matrix version V1: `phase2c-real-v1`.
Diagnostic matrix version: `phase2c-real-v2-j1-diagnostic`.
Diagnostic command: `NIGHTWATCH_PHASE_2C_DIAGNOSTIC_JOURNEY=ripple-payer-exchange-read NIGHTWATCH_PHASE_2C_MATRIX_VERSION=phase2c-real-v2-j1-diagnostic npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`.

## BUG_CANDIDATES

- `PB2-J2-L0-DEV-FONT-502`: inherited single-context L0 candidate; one
  initial J2 fingerprint, not reproduced in the Phase 2B diagnostic pair.
  Phase 2C may update it only with exact same-fingerprint evidence.
- `NW2C-J1-RESOURCE-LIFECYCLE-COMPARATOR`: Nightwatch defect candidate. V1
  compared expected third-party policy cancellations as strict failures; the
  exact divergence was J1-C1 count 6 versus J1-C2 count 5. Journey result,
  safety, and oracle ledgers were otherwise clean. Status: confirmed and
  repaired as `NIGHTWATCH_DEFECT`; closure admission awaits the one new
  diagnostic context under matrix v2.

## REJECTED_ANOMALIES

- The historical malformed JSON is not rejected; it is preserved separately
  as `GENUINE_PROTOCOL_ANOMALY`, unresolved semantic endpoint, and not
  intentionally replayed.
- Phase 2B's J2 font 502 is not an expected baseline and is not promoted by
  the single observation.
- No J2 font-502 fingerprint or malformed-JSON event occurred naturally in
  the six Phase 2C contexts.

## FILES_CHANGED

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | route the fresh session to Phase 2C | changed |
| `.agent/tasks/phase-2c-replay-oracle-verification/SPEC.md` | frozen intent and acceptance | added |
| `.agent/tasks/phase-2c-replay-oracle-verification/PLAN.md` | living execution plan | added |
| `.agent/tasks/phase-2c-replay-oracle-verification/STATE.md` | recoverable waypoint | added |
| `.agent/tasks/phase-2c-replay-oracle-verification/REPORT.md` | closure placeholder | added |
| `src/core/journeys/contract.ts` | contract version/digest/deep-freeze model | changed |
| `src/core/journeys/fingerprint.ts` | privacy-safe anomaly fingerprints | added |
| `src/core/journeys/attribution.ts` | deterministic primary/secondary attribution | added |
| `src/core/journeys/admission.ts` | exact-fingerprint L0/L1/L2 admission | added |
| `src/core/journeys/types.ts` | backward-compatible evidence/replay dimensions | changed |
| `src/core/journeys/engine.ts` | evidence population, auth/contract admission, step-scoped reads | changed |
| `src/core/journeys/replay.ts` | dimensioned comparator and differential evidence | changed |
| `src/core/evidence/journeyEvidence.ts` | legacy/Phase2C evidence boundary | added |
| `src/state/run.ts` | sanitized oracle/containment observations | changed |
| `src/oracles/protocol/resourceChecks.ts` | resource role/status/content/lifecycle oracle | added |
| `src/oracles/protocol/passiveChecks.ts` | declared non-stream NDJSON false-positive repair | changed |
| `src/browser/observers/networkObserver.ts` | role-aware resource ledger/fingerprints/oracle routing | changed |
| `src/browser/observers/bootstrapHooks.ts` | unhandled rejection/CSP admission | changed |
| `src/browser/context.ts` | target/journey metadata propagation | changed |
| `src/core/safety/endpointSemantics.ts` | anchored whole-path matching | changed |
| `config/environments/dev.json` | critical oracle fail-on policy | changed |
| `config/environments/next.json` | critical oracle fail-on policy | changed |
| `src/browser/fixtures/journeyFixtureServer.ts` | local golden resource/runtime variants | changed |
| `tests/unit/journeyEngine.test.ts` | browser-backed Phase2C matrix cases | changed |
| `tests/unit/phase2cOracleMatrix.test.ts` | synthetic generic oracle/replay matrix | added |
| `tests/manual/phase2c-real-journeys.ts` | bounded serial six-context launcher test | added |
| `playwright.phase2c.config.ts` | opt-in Phase2C test config | added |
| `bin/phase2c-real.mjs` | gated Phase2C launcher | added |
| `package.json` | Phase2C launcher script | changed |
| `tsconfig.json` | Phase2C config inclusion | changed |

## VALIDATION_LEDGER

- `git status --short --branch`: clean before task creation; starting branch
  `main`, starting HEAD `1760e594`.
- `git merge-base --is-ancestor 78e5d1f HEAD`: PASS.
- `git merge-base --is-ancestor 1b6e7a5 HEAD`: PASS.
- `npm run agent:check`: PASS with one expected `CHECKPOINT_ADVANCE` warning
  after Phase 2C task creation; the warning is limited to approved task
  documents and `ACTIVE_TASK.md`.
- `git diff --check`: PASS after task creation and audit artifacts.
- `npx tsc --noEmit`: PASS after shared hardening and runner creation.
- Focused existing + Phase2C tests: PASS, including the final 11-test
  journey-engine/browser-backed matrix and 11 focused protocol/replay/
  evidence/admission tests.
- `npx playwright test --project=nightwatch`: PASS, 263 tests.
- Comparator repair synthetic matrix: PASS, 8 tests; expected cancellation is
  bounded containment and differential evidence remains present.
- Bounded diagnostic harness TypeScript compile: PASS at implementation
  `efc03de2f7396a96baaca485894df300ddcc4ce0`.
- Browser-backed `tests/unit/journeyEngine.test.ts`: PASS, 11 tests,
  including the new resource/runtime matrix.
- `npx playwright test --config=playwright.phase2c.config.ts --list`: PASS;
  one opt-in Phase2C matrix test is discoverable.
- Full V1 real matrix: PASS, six serial contexts; artifact metadata review
  found only the documented J1 comparator divergence. No datastore query ran.

## SAFETY_EVENTS

V1 controlled-run counts: production attempts `0`, proxy violations `0`,
unknown destinations `0`, unknown approvals `0`, mutations `0`, DB queries `0`,
and action-caused UNKNOWN `0`. The pre-real gate passed before the matrix and
the runner stopped on no safety condition. Historical Phase 1.1 production
contact remains preserved separately; Phase 2A/2B safety counts remain
separate.

## PRIVACY_STATUS

PASS for source, task documents, and synthetic evidence: no auth values,
cookies, tokens, bodies, DOM, customer values, costs, or query secrets are
persisted. The external auth path is referenced only by the guarded runner and
is never printed or inspected for values.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`efc03de2f7396a96baaca485894df300ddcc4ce0` — validated Phase 2C
comparator repair and bounded diagnostic harness; synthetic and full local
validation pass.

## LAST_CHECKPOINT_SHA

`efc03de2f7396a96baaca485894df300ddcc4ce0` — post-fix implementation
checkpoint; V1 remains preserved at `043c2cc` and v2 diagnostic is separately
versioned.

## NEXT_EXACT_ACTION

Run exactly one gated v2 J1 diagnostic using the command in
`REPLAY_MATRIX_LEDGER`. Record it as a post-fix observation with no V1 replay
comparison; stop on any safety, privacy, or auth-integrity event.

## Exact Next Action

The V1 matrix is complete and its comparator defect is repaired/validated at
`efc03de`; run only the one declared v2 J1 diagnostic and preserve V1 as
historical evidence.

## Files Changed

See the `FILES_CHANGED` table below. Changes remain limited to Nightwatch;
implementation work is now authorized only for the shared Phase 2C model.

## Validation Ledger

See `VALIDATION_LEDGER` below. The task-document continuity check passed after
the required-heading repair.

## Decisions Made During This Task

- Preserve the existing `SYNCED`/`CHECKPOINT_ADVANCE`/`STALE` SHA semantics;
  `Current SHA` remains the validated implementation baseline while
  documentation descendants advance the checkpoint.
- Freeze J1/J2/J3 and the six-context serial matrix before implementation or
  real observation.

## Discoveries

- Phase 2B terminal history is clean and the current working changes are
  limited to Nightwatch Phase 2C implementation and task continuity files.
- Shared replay/oracle hardening is locally validated; no production or
  datastore execution is part of the evidence model.
- V1 real evidence is complete; J1's strict resource-lifecycle mismatch is a
  proven shared comparator defect because both differing events were expected
  third-party policy containment.
- Pre-real checkpoint `043c2cc` is clean and frozen; the next exact action is
  the gated serial launcher above.

## Blockers

The V1 matrix is complete. A shared comparator repair and one narrowly scoped
diagnostic context remain; no product or datastore investigation is authorized.

## Safety Events

NONE. No Phase 2C external context, product mutation, datastore query, or
production contact has occurred.

## Deferred / Follow-Up

- Phase 3/change intelligence and all later autonomous functionality.
- Datastore oracles, fuzzing, AI diagnosis, product fixes, and full
  minimization.

## Resume Recipe

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `ACTIVE_TASK.md`, then this
   task's SPEC/PLAN/STATE.
2. Inspect `git status --short` and current diff.
3. Continue the exact `NEXT_EXACT_ACTION` above; do not run DEV until the
   clean `PHASE_2C_PRE_REAL_MATRIX_READY` checkpoint exists.
4. Preserve the frozen J1/J2/J3 contract and serial six-context budget.

## ADVERSARIAL_SELF_REVIEW

Pre-real review: PASS.

1. No oracle was weakened to hide Phase 2B noise; the J2 font 502 remains a
   visible nonfatal L0 candidate, not an expected baseline.
2. Optional/background anomalies remain recorded as containment or secondary
   observations; a passing journey does not suppress them.
3. Resource cancellation is distinct from network/HTTP failure, and delivery
   is distinct from script execution.
4. Replay tolerances are dimensioned semantic classes; the only timing bound
   is the existing readiness/cleanup contract, not an arbitrary percentage.
5. Path normalization is anchored and preserves method, semantic family,
   disposition, and action-step differences; fingerprints omit private data.
6. Every real context creates a fresh BrowserContext/page and revalidates
   page-visible auth before the frozen journey starts.
7. Journey steps, selectors, semantic classifications, timeouts, and oracle
   policy are frozen; old and new evidence are compared only when schema and
   contract identity permit it.
8. The canonical safety kernel remains the sole production/proxy/unknown/
   mutation/auth gate; no dynamic approval or safety relaxation was added.
9. The generic oracle engine is shared by J1/J2/J3; journey-specific checks
   remain declarative contract data rather than engine forks.
10. Historical false-positive cases have regression fixtures, meaningful
    false-negative risks remain documented, and no Phase 3/change intelligence,
    fuzzing, AI, or datastore work was introduced.

## ANOMALY_ADMISSION_MODEL

Exact sanitized fingerprint equality is required. L0 is one observation in one
context; L1 is the same fingerprint in a fresh context under the same frozen
contract; L2 is the same fingerprint in at least three independent contexts.
Similar status codes, hosts, or resources do not count. Non-reproduction,
refutation, and supersession by a Nightwatch defect remain explicit outcomes.

## FAILURE_ATTRIBUTION_MODEL

Every admitted journey result has separate `PRIMARY_FAILURE`,
`SECONDARY_ORACLES`, `SAFETY_FAILURE`, `CONTAINMENT_EVENTS`, `LIKELY_CAUSE`,
`CAUSALITY_CONFIDENCE`, last successful step, and first failing step fields.
Oracle triggering is not treated as causal solely because of timestamp order.

## RESUME_RECIPE

1. Read Nightwatch `AGENTS.md`, `docs/CURRENT_STATE.md`,
   `.agent/ACTIVE_TASK.md`, this task's `SPEC.md`, `PLAN.md`, and `STATE.md`.
2. Confirm only Nightwatch is in scope; inspect `git status --short` and the
   current diff.
3. Continue `NEXT_EXACT_ACTION`: commit the validated implementation and
   pre-real checkpoint, then run only the declared serial matrix.
4. Never start Phase 3 or add journeys/actions; update this STATE after each
   major matrix/differential milestone.

## Completion Snapshot

Not complete.
