# Task State

## Identity

Task ID: phase-2c-replay-oracle-verification
Phase: 2C
Status: COMPLETE
Starting SHA: 1760e594419cabdcec12f6506cabe3aa242331c4
Current SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Last validated implementation SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Branch: `main`
Last checkpoint: 2026-08-12 — v2 diagnostic and Phase 2C closure evidence
validated at implementation `efc03de2f7396a96baaca485894df300ddcc4ce0`;
the final Nightwatch-only closure commit is the clean handoff descendant.

## Objective

Verify that Nightwatch's replay and oracle conclusions for the three frozen
Phase 2B Ripple journeys are reproducible, causally attributable, variance-
tolerant, privacy-safe, and conservative about anomaly admission.

## Current Milestone

M7 — Final privacy, architecture, adversarial review, and validation.
Status: COMPLETE
What was completed: the V1/V2 differential ledger, privacy and safety
accounting, architecture review, final validation, and clean Phase 2C closure.

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
- M6 — COMPLETE. V1 was re-evaluated with the repaired comparator, the J1
  differential is now bounded, and the single v2 J1 diagnostic passed without
  pre/post-fix replay conflation.

## Work In Progress

None. Phase 2C is complete. Do not start Phase 3 in this task.

## CURRENT_GOAL

Turn the three Phase 2B deterministic journeys into trustworthy behavioral
canaries by validating replay isolation, generic/journey-specific oracle
precision, variance handling, false-positive resistance, failure attribution,
and conservative anomaly admission.

## CURRENT_PHASE

M7 — complete; Phase 2B remains closed and Phase 3 has not started.

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

- Repair `efc03de2f7396a96baaca485894df300ddcc4ce0` passes the synthetic
   cancellation regression and full 263-test local suite. Re-evaluating V1
   through the repaired comparator yields bounded matches for J1/J2/J3 with
   no strict mismatches. V2 diagnostic
   `nightwatch-20260812T042725Z-11cc-j1-diagnostic` is PASS, has no oracle IDs
   or fingerprints, and is intentionally unpaired with V1.
- Final validation is PASS: `npx tsc --noEmit`, full Playwright (`263 passed`),
  `npm run agent:check` (PASS with the expected approved-document
  `CHECKPOINT_ADVANCE` warning), and `git diff --check`. The Phase 2C
  controlled-run safety vector is zero across all seven contexts, and the
  final privacy review is PASS.

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

Status: COMPLETE. `REPORT.md` preserves the pre-hardening false-negative
catalog and records residual risks after repair: stale source contracts,
navigation-UNKNOWN misattribution, post-check auth expiry, and sanitized
fingerprint collision at category/path-template granularity. Runtime/CSP,
content type, resource role, fingerprint/background, causality, and
step-scoped required-read dimensions are now covered by the shared engine and
golden regressions.

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

The authorized v2 diagnostic added exactly one fresh J1 context:
`nightwatch-20260812T042725Z-11cc-j1-diagnostic` — PASS. It used the same
frozen J1 contract and a new post-fix matrix/implementation version, and was
not compared with V1 as an equivalent replay.

## REPLAY_MATRIX_LEDGER

Status: COMPLETE. V1 completed and is preserved; repaired re-evaluation is
bounded for all three pairs. V2 contains exactly one post-fix J1 diagnostic
with no cross-version replay comparison.

Pre-real checkpoint: `PHASE_2C_PRE_REAL_MATRIX_READY`.
Implementation SHA V1: `043c2cc02b96ce9aec42c6b529978150c09dabfe`.
Implementation SHA V2: `efc03de2f7396a96baaca485894df300ddcc4ce0`.
Contract version: `nightwatch.journey.phase2c.v1`.
Oracle version: `nightwatch.oracle.phase2c.v1`.
Evidence schema: `nightwatch.evidence.phase2c.v1`.
Matrix version V1: `phase2c-real-v1`.
Diagnostic matrix version: `phase2c-real-v2-j1-diagnostic`.
Diagnostic command: `NIGHTWATCH_PHASE_2C_DIAGNOSTIC_JOURNEY=ripple-payer-exchange-read NIGHTWATCH_PHASE_2C_MATRIX_VERSION=phase2c-real-v2-j1-diagnostic npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`.
V2 artifact: `artifacts/phase2c-nightwatch-20260812T042725Z-11cc-matrix.json`.

## BUG_CANDIDATES

- `PB2-J2-L0-DEV-FONT-502`: inherited single-context L0 candidate; one
  initial J2 fingerprint, not reproduced in the Phase 2B diagnostic pair.
  Phase 2C may update it only with exact same-fingerprint evidence.
- `NW2C-J1-RESOURCE-LIFECYCLE-COMPARATOR`: Nightwatch defect candidate. V1
  compared expected third-party policy cancellations as strict failures; the
  exact divergence was J1-C1 count 6 versus J1-C2 count 5. Journey result,
  safety, and oracle ledgers were otherwise clean. Status: confirmed,
  repaired, and superseded as `NIGHTWATCH_DEFECT`; no product candidate is
  admitted.

## REJECTED_ANOMALIES

- The historical malformed JSON is not rejected; it is preserved separately
  as `GENUINE_PROTOCOL_ANOMALY`, unresolved semantic endpoint, and not
  intentionally replayed.
- Phase 2B's J2 font 502 is not an expected baseline and is not promoted by
  the single observation.
- No J2 font-502 fingerprint or malformed-JSON event occurred naturally in
  the six Phase 2C contexts.
- The V1 J1 replay divergence is rejected as a product signal and superseded
  by the repaired Nightwatch comparator; V2 produced no new anomaly.

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
- V2 diagnostic: PASS, exactly one J1 context; no cross-version comparison.
- Stored V1 artifact re-evaluated through repaired comparator: all three pairs
  PASS/BOUNDED_MATCH with no strict invariant mismatches.

## SAFETY_EVENTS

Phase 2C controlled-run counts across V1 plus V2 (7 contexts): production
attempts `0`, proxy violations `0`, unknown destinations `0`, unknown
approvals `0`, mutations `0`, DB queries `0`, and action-caused UNKNOWN `0`.
The pre-real gate passed before both executions and no safety stop occurred.
Historical Phase 1.1 production contact remains preserved separately;
Phase 2A/2B safety counts remain separate.

## PRIVACY_STATUS

PASS for source, task documents, synthetic evidence, V1 matrix metadata, and
V2 matrix metadata: no auth values, cookies, tokens, bodies, DOM, customer
values, costs, screenshots, traces, or query secrets are persisted. The
external auth path is referenced only by the guarded runner and is never
printed or inspected for values.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`efc03de2f7396a96baaca485894df300ddcc4ce0` — validated Phase 2C
comparator repair and bounded diagnostic harness; synthetic and full local
validation pass.

## LAST_CHECKPOINT_SHA

`0f894d96bc384e402f4199ac6255ecb3948781c6` — clean v2 diagnostic
documentation checkpoint; validated implementation remains `efc03de` and V1
remains preserved at `043c2cc`.

## NEXT_EXACT_ACTION

None. Phase 2C is complete and the Nightwatch worktree is handed off clean.
The recommended next task only is `PHASE 3 — CHANGE-DIRECTED JOURNEY
SELECTION`; do not start it in this task.

## Exact Next Action

No further Phase 2C action. If resumed, verify the clean handoff and stop
before Phase 3.

## FINAL_ADVERSARIAL_REVIEW

PASS. The final review confirms exact-fingerprint admission, conservative L0
handling, no anomaly suppression, no arbitrary tolerances, no meaningful
normalization loss, cancellation/delivery/execution separation, page-visible
auth gating, frozen journey behavior, unchanged fail-closed safety, privacy-
safe fingerprints, reusable generic oracles, regression coverage, documented
false negatives, no Phase 3/change intelligence, no datastore work, and exact
STATE recovery instructions.

## Files Changed

See the `FILES_CHANGED` table below. All changes are limited to Nightwatch;
Phase 2C implementation and documentation are complete.

## Validation Ledger

See `VALIDATION_LEDGER` below. Final validation passed after the closure
documentation was finalized; the expected continuity warning is limited to
approved task-document descendants of the validated implementation.

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
- Pre-real checkpoint `043c2cc` was clean and frozen; the gated serial launcher
  completed the declared V1 matrix, and the one authorized post-fix diagnostic
  completed under V2.

## Blockers

None. All Phase 2C acceptance criteria are satisfied. No product, datastore,
or Phase 3 investigation is authorized by this closed task.

## Safety Events

NONE. Seven Phase 2C controlled contexts completed with production attempts,
proxy violations, unknown destinations, unknown approvals, mutations, DB
queries, and action-caused UNKNOWN all equal to zero. The historical Phase 1.1
production contact remains preserved separately.

## Deferred / Follow-Up

- Phase 3/change intelligence and all later autonomous functionality.
- Datastore oracles, fuzzing, AI diagnosis, product fixes, and full
  minimization.

## Resume Recipe

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `ACTIVE_TASK.md`, and this
   task's SPEC/PLAN/STATE.
2. Verify `git status --short` is clean and confirm the final closure commit
   is a Nightwatch-only descendant of validated implementation
   `efc03de2f7396a96baaca485894df300ddcc4ce0`.
3. Treat this task as closed. Preserve the seven recorded Phase 2C contexts,
   the frozen J1/J2/J3 contracts, and all anomaly classifications.
4. Do not run additional DEV traffic, reopen Phase 2B, or start Phase 3 from
   this state.

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

The task is closed. A fresh agent can recover the complete V1/V2 evidence,
oracle versions, safety vector, anomaly ledger, and final validation from this
STATE and REPORT. No additional Phase 2C execution is needed; the next task,
if explicitly authorized later, is only `PHASE 3 — CHANGE-DIRECTED JOURNEY
SELECTION`.

## Completion Snapshot

Complete. Phase 2A/2B closure was reconciled; J1/J2/J3 remained the canary
set; the shared replay/oracle model was hardened; synthetic coverage passed;
the six-context V1 matrix and one authorized V2 diagnostic completed safely;
the J1 comparator false positive was repaired and superseded; J2's historical
font 502 remained `L0_NOT_REPRODUCED`; malformed JSON remained an independent
semantic-UNKNOWN protocol anomaly; privacy and safety passed; and the final
Nightwatch worktree is clean. Final implementation remains
`efc03de2f7396a96baaca485894df300ddcc4ce0`; the closure commit is the clean
terminal descendant recorded at handoff.
