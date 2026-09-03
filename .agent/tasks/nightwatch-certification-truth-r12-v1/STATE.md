# Task State

## Identity

Task ID: nightwatch-certification-truth-r12-v1
Phase: CERTIFICATION_TRUTH_R12_V1
Status: IN_PROGRESS
Starting SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last validated implementation SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last substantive checkpoint SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-certification-truth-r-cd8904c5
Last checkpoint: baseline measured in the canonical checkout at cdfe9d7 — 238 suites on disk, 173 registered across the two authoritative manifests, 65 unregistered, of which 6 are campaign certification suites (C-01 x4, C-02a, C-06); the 56 C-02a + C-06 cases pass locally with siblings present
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_VALIDATED_IMPLEMENTATION_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Make the authoritative gate actually run every campaign certification suite,
enforce that as a totality rather than a per-campaign courtesy, and reconcile
the project-truth documents to the completion the repository reached.

## Current Milestone

M8 — integration, exact-head CI, closure and release. All three local gates are
PASS: regression 3,428/3,415/13/0, `gate:local` at `506d64f`, `gate:clean` at
`f02562d` with `siblingWrites: 0`.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured baseline.
- M2 — all six suites registered in `SYNTHETIC_CAMPAIGN`, the lane every
  existing campaign certification suite already used. The lane went from 27
  files / 619 cases to 34 files / **738 cases, 738 passed, 0 failed** — 119
  cases the gate now certifies and previously never ran.
- M3 — `config/campaign-certification.v1.json` is the single registration
  authority: 12 campaigns, 28 declared suites. The judgement is pure and lives
  in `bin/lib/campaign-certification.mjs`; `checkCampaignCertificationRegistry`
  in `bin/hardening-check.mjs` does I/O only. Lanes are validated against the
  gate definition's REQUIRED `commandKey`s, so the registry cannot authorise
  its own lanes.
- M4 — SIX hand-written registration loops retired, not four as the baseline
  estimated: R-11 and C-11 each had one as well as C-02b, C-03, C-04 and
  C-15b. Every suite they guarded is preserved verbatim in the registry and
  asserted so by `r12CampaignCertification.test.ts`.
- M5 — master task ledger normative status reconciled for C-02b, C-03, C-04
  and C-11, and the C-15b half of the C-15 row; `CURRENT_STATE` checkpoint
  prose reconciled to the machine block, malformed row repaired, historical
  drift preserved as history.
- M6 — negative probes: 13 real-repository mutations DETECTED and restored,
  plus 16 permanent synthetic failure-path tests. M6 also uncovered
  DEF-R12-1 and DEF-R12-2, both PRE_EXISTING and both repaired here.
- M7 — validation complete: canonical regression 3,428 / 3,415 / 13 / 0 at
  `506d64f`; `gate:local` PASS eleven groups; `gate:clean` PASS eleven groups
  on Node 20 with `siblingWrites: 0`.

## Work In Progress

M8 — integration and exact-head CI observation. Local validation is complete.

## Exact Next Action

Integrate by verified fast-forward (`node bin/nightwatch-session.mjs
integrate`), then observe the exact-head GitHub Actions run at the integrated
head. Check the CI synthetic receipt's `skipped` count is at least 3: that is
the ONLY decisive evidence for acceptance row 4, because
`DEFAULT_SIBLING_ROOT` is a hardcoded absolute path, so the read-only sibling
checkouts stay visible even to `gate:clean` on this machine and C-02a's
real-source block RUNS locally rather than skipping. Then record the CI result
truthfully, reconcile project truth, close the REPORT ledger, set the task
COMPLETE, release the session and remove the worktree and branch.

## Files Changed

- `.agent/ACTIVE_TASK.md` — routed to R-12
- `.agent/EXECUTION_PROMPT.md` — R-12 handoff header
- `.agent/tasks/nightwatch-certification-truth-r12-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-certification-truth-r12-v1/**` — new change
- `config/campaign-certification.v1.json` — NEW single registration authority
- `config/synthetic-campaign.v1.json` — +7 suites (the six, plus R-12's own)
- `bin/lib/campaign-certification.mjs` + `.d.mts` — NEW pure validator
- `bin/hardening-check.mjs` — six loops retired; one generic rule added
- `tests/unit/r12CampaignCertification.test.ts` — NEW, 32 cases
- `docs/CURRENT_STATE.md` — checkpoint prose reconciliation
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md` — ledger status

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS, `WORKSPACE_INTEGRITY_SATISFIED` |
| C-02a + C-06 suites at cdfe9d7 (canonical, siblings present) | 56 passed / 0 skipped / 0 failed |
| Registration census at cdfe9d7 | 238 on disk, 173 registered, 65 unregistered, 6 of them campaign certification suites |
| Campaign ledger census | 11 campaign task directories, all COMPLETE |
| `npm run campaign:synthetic` after registration | 34 files, **738 total / 738 passed / 0 failed**, `deepContainmentLane: PROVEN`, result PASS (baseline was 27 files / 619) |
| `tests/unit/r12CampaignCertification.test.ts` | 32 passed / 0 failed |
| `npm run typecheck` | PASS |
| `npm run hardening:check` | PASS, offline structural invariants hold |
| `npm run agent:check` | PASS (2 warnings: CHECKPOINT_ADVANCE, legacy v1 tasks) |
| `npm run handoff:check` | PASS |
| `npm run project:check` | PASS, `activeTaskContinuity: PASS` |
| `npm run workspace:check` | exit 0; owned=true drift=false base=CURRENT mayIntegrate=true:FAST_FORWARD_AVAILABLE canonicalSafe=true attention=0 |
| `npm run gate:inventory` | exit 0 |
| Negative probes P1-P10 (real repository) | 10/10 DETECTED, 10/10 restored, tree clean after each |
| Negative failure-path tests (synthetic input) | 16 permanent cases in `r12CampaignCertification.test.ts` |
| **canonical regression** at `506d64f` | **3,428 total / 3,415 passed / 13 skipped / 0 failed**, exit 0 (baseline 3,396/3,383/13/0; delta is exactly the 32 new cases, and skips are unchanged) |
| **`npm run gate:local`** at `506d64f` | **PASS, all eleven required groups**, `environmentClass: LOCAL`, Node 22, receipt `receipt:sha256:ec63fe57a093eb63e168ded5`; SEMANTIC_COMPATIBILITY 2,033/2,020/13/0; OWNER_PROVENANCE 91 passed; SYNTHETIC_CAMPAIGN 738/738/0 with `deepContainmentLane: PROVEN` |
| **`npm run gate:clean`** at `f02562d` | **PASS, all eleven required groups**, Node 20, `installResult: PASS`, `siblingWrites: 0`, `cleanBefore: true`, `cleanAfter: true`, `nodeModulesReused: false`; inner receipt `receipt:sha256:0efe20276b93f05ebe50ea53`, outer `clean-receipt:sha256:466ca84e35b4d5881a7d76ae` |

### Negative probe matrix

| # | Mutation | Verdict | Detected by |
|---|---|---|---|
| P1 | deregister C-02a from its lane | DETECTED | `hardening:check` registration conjunct |
| P2 | deregister C-06 | DETECTED | registration conjunct |
| P3 | deregister C-15b | DETECTED | registration conjunct |
| P4 | deregister a C-11 suite | DETECTED | registration conjunct |
| P5 | delete a declared suite from disk | DETECTED | existence conjunct |
| P6 | drop C-01's campaign entry from the registry | DETECTED | totality conjunct |
| P7 | claim `Status: COMPLETE` on a mid-flight task | DETECTED | `agent:check` `COMPLETE_HAS_WORK_IN_PROGRESS` |
| P8 | point the substantive anchor at an older commit | DETECTED | `agent:check` `STALE` implementation baseline |
| P9 | project `LIVE_COMPLETION_CLAIM: COMPLETE` while IN_PROGRESS | DETECTED | `project:check` `PROJECT_STATE_LIVE_COMPLETION_CLAIM_MISMATCH` |
| P10 | repoint a lane away from an authoritative manifest | DETECTED | lane-authority conjunct |
| P11 | broaden the checkpoint allowlist to `docs/design/**` | DETECTED | revived `checkAgentContinuityIntegrity` |
| P12 | add a filesystem mutation to the continuity protocol module | DETECTED | revived rule, read-only conjunct |
| P13 | remove the v2 protocol version constant | DETECTED | revived rule |

## Defects found

**DEF-R12-1 — a hardening rule that had never executed. PRE_EXISTING.**
`checkAgentContinuityIntegrity` was defined in `bin/hardening-check.mjs` and
never called: 50 `check*` functions were defined, 49 were invoked. It guards
that the continuity checker and the pure protocol module stay read-only, spawn
no child process, reach no network, define the v2 protocol constant, keep
`agent:audit` wired, and keep the documentation-checkpoint allowlist narrow —
none of which had been enforced. Found by auditing definition/call parity while
retiring the six registration loops, i.e. by looking for exactly the defect
class R-12 exists to close: a guard that looks like coverage and is not.
Repair: the call is added. Regression: probes P11-P13.

**DEF-R12-2 — the revived rule's allowlist assertion pointed at the wrong
module. PRE_EXISTING, and masked by DEF-R12-1.** It read
`bin/agent-state.mjs` and asserted a re-escaped regex-of-a-regex against it,
but the allowlist pattern `/^docs\/design\/[^/]+\.md$/` had been refactored
into `bin/agent-continuity-protocol.mjs`. Because the rule never ran, the stale
reference was invisible. Had it been enabled naively it would have failed on
correct code, which is the likeliest reason to disable rather than repair it.
Repair: the assertion is repointed at the module where the pattern lives and
matches the literal by containment instead of by re-escaping. Its negative
half additionally required comment stripping — the module's own prose says it
is "deliberately NOT `docs/design/**`", which a raw-text check reads as the
very violation it describes; `withoutComments` is now applied, as elsewhere in
this file.

## Method note

The first canonical regression run was started before the M6 mutation probes
and was still executing while they ran, so the working tree changed underneath
it. That run was STOPPED and DISCARDED rather than reported: a green result
would have been unearned and a red one unattributable. The canonical regression
is re-run against the final, stable tree with no concurrent writes. Recorded
because a discarded run is evidence about method, not an absence of evidence.

## Decisions Made During This Task

- Register C-02a as-is; its one real-source block already self-skips and the
  synthetic runner records the skip truthfully. No fabricated counterpart, and
  no claim of real-source execution in CI.
- Derive registry completeness from the campaign task ledger under
  `.agent/tasks/`, not from test filenames — §17 forbids a filename-only
  heuristic where stronger campaign metadata exists, and a filename rule would
  miss all four C-01 suites anyway.
- Delete the four hand-written registration loops rather than keep them beside
  the new registry; two authorities for one rule is what produced this debt.

## Measured Baseline

Three of the eleven required gate groups execute tests; none runs the full
canonical regression. Consequently the six suites below have never executed in
`gate:local`, `gate:clean` or CI:

| Campaign | Suite | Sibling-dependent |
|---|---|---|
| C-01 | `tests/unit/sourceOperationCompleteness.test.ts` | no |
| C-01 | `tests/unit/sourceInventoryCompleteness.test.ts` | no |
| C-01 | `tests/unit/cacheCurrentness.test.ts` | no |
| C-01 | `tests/unit/callScopedSourceRead.test.ts` | no |
| C-02a | `tests/unit/c02aOpenApiAdmission.test.ts` | one block, self-skipping |
| C-06 | `tests/unit/c06PhpReadOnlyProof.test.ts` | no |

C-02a + C-06 measured locally at cdfe9d7: 56 passed, 0 skipped, 0 failed
(siblings present).

## Discoveries

- C-01's four certification suites are unregistered as well; C-15b's recorded
  debt understated itself by four suites.
- `docs/CURRENT_STATE.md`'s checkpoint prose table has a malformed row —
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` carries six cells in a five-column
  table, concatenating a C-11 "Why" with an R-11 "Why".

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

C-15c owns the System Map V2 HTTP transport. C-16 owns the G-16 / EIG
ownership resolution the master ledger still lists as unowned.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-8. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-certification-truth-r-cd8904c5`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
