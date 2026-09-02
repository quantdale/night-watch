# Task State

## Identity

Task ID: nightwatch-proxy-gate-reliability-r11-v1
Phase: PROXY_GATE_RELIABILITY_R11_V1
Status: IN_PROGRESS
Starting SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
Last validated implementation SHA: 22a2928e8ecc80544e63c4d17a25cdb8ba4b569a
Last substantive checkpoint SHA: 22a2928e8ecc80544e63c4d17a25cdb8ba4b569a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-proxy-gate-reliabilit-6e648bc4
Last checkpoint: 2026-09-02 — M1 through M7 closed. OBS-C105-1 reproduced and repaired; 20 deterministic adversarial lease cases plus a real-OS-TCP integration case green; bounded stress campaign green; durable confined atomic gate receipts wired into both gates with 30 adversarial cases; 29/29 hardening negative probes detected after repairing DEF-R11-1 and DEF-R11-2; Stage-A documentation truth and the obsolete T-30/T-41/T-42 digest semantics reconciled. Substantive checkpoint 22a2928
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
LAST_VALIDATED_IMPLEMENTATION_SHA: 22a2928e8ecc80544e63c4d17a25cdb8ba4b569a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 22a2928e8ecc80544e63c4d17a25cdb8ba4b569a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROXY_GATE_RELIABILITY_R11_V1_STATUS: IN_PROGRESS

## Objective

Close OBS-C105-1: make the proxy-lease tests deterministic and aligned with the
allocator's real contract, and make authoritative quality-gate receipts durable
and privacy-safe, so C-11 can be certified by a gate whose result carries
information and whose failures remain attributable.

## Current Milestone

Milestone ID: M8
Milestone status: IN_PROGRESS
What is being attempted: the full R-11 validation sequence — `gate:local`, the
complete canonical regression, and repeated independent `gate:clean`
invocations in the clean Node 20 topology, plus a deliberately induced real
TEST_FAILURE gate run to prove failure-receipt persistence end to end.

## Completed Milestones

- **M1 — Reproduce OBS-C105-1.** No repository file was edited first. Cases A–D
  exercised against the unmodified allocator: A returned the preferred port
  after reclaiming a stale lease; B advanced from `41010` to `41011` past a real
  occupying listener; C left a live-process lease byte-identical and advanced;
  D1 preserved malformed bytes and advanced; D2 preserved the symlink and its
  target and advanced. **Every allocator behavior is correct.** The current
  assertion `expect(lease.port).toBe(preferred)` was then evaluated on the
  Case-B lease and FAILED. End-to-end, with the exact PID-derived ports
  occupied, the real suite failed at
  `tests/unit/phase24ProxyLifecycle.test.ts:105` with
  `Expected: 21638 / Received: 21640` at line 128 — the same
  `failedLocations` value the exact-head CI receipt recorded. The same suite is
  5/5 green at the same commit with the ports free. Validation command:
  `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts --project=nightwatch --workers=1`.

- **M2 — Port-lease contract.** `7abe14e`. `proxyPortCandidates(preferred)`
  extracted as a pure function; the allocation loop factored into one core
  taking the availability predicate explicitly; `reserveProxyPortLease` binds
  the real `portAvailable` probe with no substitutable parameter;
  `reserveProxyPortLeaseWithAvailabilityForTest` added and branded TEST ONLY;
  `candidateOffset` and `preferredOutcome` added. Production behavior unchanged:
  `candidatePort` semantics are byte-identical. `typecheck` clean;
  `phase23PortLease` and `proxy` suites 9/9.

- **M3 — Deterministic adversarial suite.** `7abe14e`.
  `tests/unit/proxyPortLeaseDeterminism.test.ts`, 20 cases, all sixteen
  brief-specified conditions covered. The `phase24ProxyLifecycle` SIGTERM/SIGINT
  case no longer derives a port from `process.pid` and no longer asserts the
  preferred number; it asserts the orphan was re-owned with a fresh token, the
  endpoint is really available, and the reported outcome matches the candidate
  taken. A new case keeps REAL OS TCP coverage by binding port 0 and HOLDING
  that socket, so the occupied precondition exists by construction with no
  close-then-assume-free window. **Decisive check:** 26 tests pass with 18
  endpoints deliberately occupied, including the legacy PID-derived ports and
  the new fixed candidates — the condition that previously failed the required
  group.

- **M4 — Bounded stress campaign.** `7abe14e`.
  `tests/unit/proxyPortLeaseStress.test.ts`, 5 cases, exact asserted counts:
  200 real allocate/release cycles; 4 rounds x 6 parallel cross-process
  allocators (24 real leases) with no double assignment; 120 allocations against
  a real listener held on the preferred endpoint, all advancing; 60 child
  crashes between lease creation and release, all reclaimed; 1,000 rapid reclaim
  cycles yielding a singleton port set. 19.6s.

- **M5 — Durable gate receipts.** `1b9050b`. Confined validated destination with
  a safe automatic default; exclusive-create + fsync + atomic-rename write;
  ONE canonical string to both stdout and file; failure and environment
  receipts persisted; exit 3 on persistence failure; receipt path stripped from
  child environments. The clean wrapper reads the structured file, keeps stdout
  as a cross-check only, fails closed on digest disagreement, and writes outside
  the disposable clone. Verified live: the real gate's ENVIRONMENT_MISMATCH
  receipt persisted at mode 0600, byte-identical to stdout.

- **M6 — Adversarial receipt suite and hardening.** `1b9050b`, `22a2928`.
  `tests/unit/gateReceiptPersistence.test.ts`, 30 cases including every
  confinement refusal, symlink parent and destination with untouched sentinel,
  atomic write with no debris, a TEST_FAILURE round-trip preserving
  `failedLocations` / `didNotRun` / containment lane / NOT_RUN cascade, seven
  malformed-file refusals, stale head and mode, and two real gate spawns. One
  case reproduces the OBS-C105-1 channel failure directly: stdout polluted with
  a forged PASS receipt, scraping yields the forgery, the file yields the truth.
  `checkR11ProxyGateReliability` added. **29/29 negative probes detected** after
  DEF-R11-1 and DEF-R11-2 were found and repaired.

- **M7 — Stage-A and threat-model truth reconciliation.** `4649a29`. The false
  "EXACT head of `main`" claim about `29b9212` removed; run `33637832941` at
  `c423e33` recorded as the latest observed exact-head run; `29b9212` preserved
  as the C-10.5 certification checkpoint; the six checkpoint roles named
  explicitly to end the docs-certification regress; the stale `23523cc` prose
  cells reconciled to `c763c05`. T-30, T-41 and T-42 reconciled to D-113 after
  verifying `durableValueDigest: 'ABSENT'` and the absence of any salt in the
  production cone, each keeping its historical text under an explicit
  SUPERSEDED heading. `projectState` and `agent-state` suites 178/178.

## Work In Progress

M2 has not begun editing `src/proxy/portLease.ts`. The reproduction harness
lives in the session scratchpad only and is not a repository artifact.

## Exact Next Action

Edit `src/proxy/portLease.ts`: add pure `proxyPortCandidates(preferred)`,
factor the allocation loop into a module-private core taking an
`available: (port: number) => boolean` predicate, keep `reserveProxyPortLease`
binding `portAvailable` with no substitutable parameter, add
`reserveProxyPortLeaseWithAvailabilityForTest` branded `TEST ONLY`, and add the
`candidateOffset` / `preferredOutcome` fields to `ProxyPortLease`.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/SPEC.md` | task scope, safety, acceptance | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/PLAN.md` | milestones, approach, decisions | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/STATE.md` | execution memory | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/REPORT.md` | closure record | ADDED |
| `.agent/ACTIVE_TASK.md` | active campaign is now R-11 | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | R-11 handoff | MODIFIED |
| `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/**` | dedicated OpenSpec change | ADDED |
| `src/proxy/portLease.ts` | pure candidate selection, explicit availability predicate, named allocation outcome, TEST ONLY seam | MODIFIED |
| `tests/unit/proxyPortLeaseDeterminism.test.ts` | 20 deterministic adversarial lease cases | ADDED |
| `tests/unit/proxyPortLeaseStress.test.ts` | bounded stress campaign with exact counts | ADDED |
| `tests/unit/phase24ProxyLifecycle.test.ts` | contract-based assertions; PID-derived port removed; real-OS-TCP occupied-endpoint case | MODIFIED |
| `tests/unit/support/portLeaseChild.mjs` | cross-process real-allocator child | ADDED |
| `bin/lib/gate-receipt.mjs` | confined, atomic, fail-closed receipt persistence | MODIFIED |
| `bin/lib/gate-receipt.d.mts` | types for the receipt boundary | ADDED |
| `bin/quality-gate.mjs` | pre-group destination validation; single canonical emit path | MODIFIED |
| `bin/quality-gate-clean.mjs` | consumes the structured receipt file; digest cross-check | MODIFIED |
| `tests/unit/gateReceiptPersistence.test.ts` | 30 adversarial receipt cases | ADDED |
| `tests/unit/syntheticCampaignDiagnostics.test.ts` | explicit non-null assertions once the boundary became typed | MODIFIED |
| `bin/hardening-check.mjs` | `checkR11ProxyGateReliability`, 29 negative-probed rules | MODIFIED |
| `config/semantic-compatibility.v1.json` | registers the three new suites | MODIFIED |
| `docs/CURRENT_STATE.md` | Stage-A truth and the checkpoint-role model | MODIFIED |
| `docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md` | T-30/T-41/T-42 reconciled to D-113 | MODIFIED |

## Validation Ledger

Command: `git rev-parse origin/main`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `c423e33e3384dd3ec34bfd4e9d57d863f58bc190`, matching the authorized starting truth.

Command: `gh run view 33637832941`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `conclusion: success`, `headSha: c423e33e…`, job `100273053129`, workflow `Nightwatch hardening`.

Command: `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts --project=nightwatch --workers=1`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: 5 passed with the preferred ports free — the baseline the reproduction is measured against.

Command: reproduction harness, Cases A–D, unmodified allocator
Result: PASS (allocator correct in all four cases); OBS-C105-1 REPRODUCED
When: 2026-09-02
Relevant failure/output summary: Case B `lease.port=41011` vs `preferred=41010`; the current test assertion fails on that lease while the allocator is correct.

Command: end-to-end reproduction with the PID-derived ports occupied
Result: REPRODUCED
When: 2026-09-02
Relevant failure/output summary: `tests/unit/phase24ProxyLifecycle.test.ts:105`, `Expected: 21638 / Received: 21640` at line 128 — identical to the CI receipt's `failedLocations`.

Command: `npm run project:check`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: baseline green before any edit; `ciObservedSha` `29b9212` recorded for M7 reconciliation.

Command: `npm run session:status`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `WORKSPACE_INTEGRITY_SATISFIED`; canonical clean; owned session worktree claimed as `sess-df51b93c3d63`.

## Decisions Made During This Task

Decision: Reproduce OBS-C105-1 both at unit level and end-to-end before editing.
Reason: The C-10.5 attribution was explicitly an inference, not proof.
Evidence/constraint: The end-to-end failure carries the same `failedLocations` value as the CI receipt.

Decision: Repair the test, not the allocator.
Reason: The allocator is correct in all four brief-specified cases; changing production behavior to preserve an over-strong assertion is forbidden by the brief and would be a real regression.
Evidence/constraint: Cases A–D observations above.

Decision: No GitHub Actions artifact upload.
Reason: `checkPhase23QualityGate` forbids `upload-artifact`, caps the workflow at two run commands, and admits only `actions/checkout@v4` and `actions/setup-node@v4`; weakening a hardening rule is forbidden.
Evidence/constraint: The rule text in `bin/hardening-check.mjs`; the brief permits justifying the artifact away.

## Discoveries

- The end-to-end reproduction advanced two candidates because both PID-derived
  ports were occupied. Correct bounded-search behavior, not a second defect.
- `docs/CURRENT_STATE.md` carried an independent staleness the validator cannot
  see: the project-state v2 prose table still named `23523cc` as the current
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` while the machine-checked block said
  `c763c05`. Repaired in M7.
- Adding `bin/lib/gate-receipt.d.mts` typed a module that had been imported with
  `@ts-expect-error`, which immediately surfaced a latent nullability gap in
  `tests/unit/syntheticCampaignDiagnostics.test.ts`. Repaired by asserting
  presence explicitly, which is what those cases mean anyway.
- **DEF-R11-1 and DEF-R11-2, both introduced by this campaign and both found by
  negative probing rather than by review.** Two new hardening rules matched an
  identifier that also occurs elsewhere in the same file, so deleting the
  load-bearing occurrence left the rule satisfied. The live-owner rule would
  have permitted deleting a lease owned by a LIVE process; the
  child-environment rule would have permitted a child overwriting the run's own
  receipt. Both are anchored now and both mutations are detected. This is the
  concrete argument for the brief's "never merely trust regex presence".
- The workflow cannot host an Actions artifact without weakening three existing
  hardening rules (`upload-artifact` forbidden, exactly two run commands, only
  `actions/checkout@v4` and `actions/setup-node@v4`). Justified away rather than
  taken; CI attribution comes from the complete receipt in the retained job log.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- C-11 `PROD_OBSERVE`, gated behind the R-11 completion gate.

## Resume Recipe

1. Read SPEC.
2. Read PLAN, especially the Decision Log.
3. Read the OpenSpec `audit.md`; OBS-C105-1 is already reproduced — do not
   rediscover it.
4. Inspect `git status` and the current SHA in the owned session worktree.
5. Run `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts tests/unit/phase23PortLease.test.ts --project=nightwatch --workers=1`.
6. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete — with real evidence, never placeholders.
