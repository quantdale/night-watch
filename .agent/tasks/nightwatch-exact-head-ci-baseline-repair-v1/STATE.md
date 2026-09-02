# Task State

## Identity

Task ID: nightwatch-exact-head-ci-baseline-repair-v1
Phase: EXACT_HEAD_CI_BASELINE_REPAIR_V1
Status: COMPLETE
Starting SHA: c3fed38abd281e8648c039ac3befe8034c13e868
Branch: session/nightwatch-exact-head-ci-baselin-5b773376
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c3fed38abd281e8648c039ac3befe8034c13e868
LAST_VALIDATED_IMPLEMENTATION_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_EXACT_HEAD_CI_BASELINE_REPAIR_V1_STATUS: COMPLETE

## Objective

Root-cause and repair the two synthetic-campaign failures in exact-head Actions
run `33572572053`, make a future `SYNTHETIC_CAMPAIGN` failure debuggable from
its own authoritative receipt, reconcile project truth with what actually
happened, and restore an exact-head green CI baseline.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed.

## Completed Milestones

- M1 — Runner-shaped reproduction. Both failures reproduce deterministically,
  and the harness arithmetic matches the real run exactly.
- M2 — Root cause for both defects, including test-vs-production adjudication.
- M3 — `DEF-CI-02` repaired via `l6ContainmentAvailability()` and a two-branch
  classification invariant; 6/6 pass in both topologies with zero skips.
- M4 — `DEF-CI-01` repaired by asserting population before content; 4/4 pass in
  both topologies.
- M5 — Bounded diagnostics landed: manifest, launcher, gate boundary module,
  14 new diagnostic tests, mode-aware deep-lane requirement.
- M6 — Project truth reconciled and `PROJECT_STATE_CI_EVIDENCE_STALE` added.
- M7 — Full required stack green, including a 2,839-test canonical regression,
  `gate:local` and clean Node 20 `gate:clean`.
- M8 — Exact-head GitHub run `33590645175` at `b99ce4e` PASSED all eleven
  required groups, with `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` executing
  for the first time.

## Work In Progress

None. Every milestone is closed and validated.

## Exact Next Action

STOP — this campaign is complete. Do not begin another campaign in this task,
and do not run any implementation session in the canonical checkout. The next
critical-path campaign is C-10, the production privacy firewall, which requires
its own authorization and its own task directory.

## Starting evidence

- Base SHA `c3fed38abd281e8648c039ac3befe8034c13e868`, verified equal to
  `origin/main`; canonical checkout clean; `session:status` verdict `PASS`.
- `.agent/ACTIVE_TASK.md` was `COMPLETE` for
  `nightwatch-php-readonly-proof-c06-v1`, so no in-progress task was pre-empted.
- Run `33572572053` / job `100069494765` verified directly against GitHub:
  checkout, Node 20 setup and `npm ci --ignore-scripts` passed; `gate:ci`
  executed and emitted `receipt:sha256:1a55a1e307541c094dcbfb3f`.

## Defects

`DEF-CI-01` — `tests/unit/eligibilityCensus.test.ts:211`, "operator proof-chain
census is byte-stable across three fresh processes".
Assertion: `proofFamilyRanking.find(f => f.family === 'SEMANTIC_CONTRACT')
?.assessment` expected `NO_INDEPENDENT_GAP`, received `undefined`.
Source: `src/core/source/siblingSource.ts:17` — `DEFAULT_SIBLING_ROOT` is the
absolute path `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES`, which cannot
exist on a runner. `bin/nightwatch-intelligence.mjs:120` then takes the
`NO_MECHANICALLY_PROVABLE_SOURCE_SURFACE` branch and emits no `census` key.
Category: sibling-source assumption. Test wrong, production right: the operator
reports every approved repository as `SOURCE_UNAVAILABLE` with
`SOURCE_REPOSITORY_UNAVAILABLE: 1` and marks completeness `UNKNOWN`; consumers
read that state rather than the exit code. The test asserted census CONTENT
without first asserting the census POPULATION.

`DEF-CI-02` — `tests/unit/l6Containment.test.ts:10`, "rootless L6 qualification
proves direct process/network denial and relay transport".
Assertion: `capability.directDnsDenial` expected `PROVEN`, received
`NOT_PROVEN`.
Source: `src/core/oops/l6.ts` — `bwrapPath()` returns null because the
`ubuntu-24.04` runner image ships no Bubblewrap binary, so
`qualifyL6RuntimeCapability()` correctly returns
`failureCapability('UNAVAILABLE', 'BWRAP_UNAVAILABLE')`.
Category: process/network containment availability. Test wrong, production
right and already fail-closed. Because the suite is serial, the first failure
cascaded the remaining five cases into "did not run".

`DEF-CI-03` — `bin/quality-gate.mjs` `parseSafeDetails()` keyed only on
`nightwatch.semantic-compatibility.v1`, so no Playwright-backed group could
contribute diagnostics, and `parseCounts()` had no "did not run" pattern. The
CI receipt therefore showed `SYNTHETIC_CAMPAIGN` with 121 passed and 2 failed,
no locations, and five cases unaccounted for.

## Measurements

| figure | before | after |
|---|---|---|
| `campaign:synthetic` (host with containment + sibling source) | 128 | 128 |
| `campaign:synthetic` (runner-shaped topology) | 121 passed / 2 failed / 5 did not run | 128 |
| semantic-compatibility manifest files | 142 | 143 |
| synthetic-campaign skips, either topology | 0 | 0 |

## Files Changed

Added: `config/synthetic-campaign.v1.json`, `bin/campaign-synthetic.mjs`,
`bin/lib/gate-receipt.mjs`,
`tests/unit/syntheticCampaignDiagnostics.test.ts`,
`.agent/tasks/nightwatch-exact-head-ci-baseline-repair-v1/{SPEC,PLAN,STATE,REPORT}.md`,
`openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/{proposal,design,tasks,audit}.md`
and `specs/exact-head-ci-baseline/spec.md`.

Modified: `src/core/oops/l6.ts`, `bin/quality-gate.mjs`,
`bin/quality-gate-inventory.mjs`, `bin/hardening-check.mjs`,
`bin/project-state-check.mjs`, `config/semantic-compatibility.v1.json`,
`package.json`, `tests/unit/l6Containment.test.ts`,
`tests/unit/eligibilityCensus.test.ts`, `tests/unit/projectState.test.ts`,
`docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`,
`.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`.

No file was deleted; `## Declared Deletions` is NONE.

## Validation Ledger

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- `npm run handoff:check` — PASS.
- `npm run project:check` — PASS.
- `npm run agent:check` / `npm run agent:audit` — PASS (99 tasks, 0 strict
  errors).
- `npm run gate:inventory` — PASS; the `SYNTHETIC_CAMPAIGN` group still
  enumerates all 12 files from the new manifest.
- `npm run test:semantic-compat` — PASS, 1,967 total / 1,954 passed / 13
  skipped / 0 failed (143 files).
- `npm run campaign:synthetic` — PASS, 128/128, `deepContainmentLane: PROVEN`.
- Runner-shaped topology (no sibling root, no Bubblewrap, Node 20.20.2) —
  `campaign:synthetic` 128/128 with `deepContainmentLane:
  NOT_EXERCISED_BWRAP_UNAVAILABLE`, and a full `gate:ci` PASS whose receipt
  digest `receipt:sha256:120582acb7bb971190a3a05d` matched the eventual real
  GitHub receipt EXACTLY.
- Focused suites, each run in BOTH topologies: `l6Containment` 6/6,
  `eligibilityCensus` 4/4, `syntheticCampaignDiagnostics` 14/14,
  `projectState` 56/56, `phase23QualityGate` + `phase23CiAuthority` 15/15.
- Canonical Playwright regression — 2,839 tests in 226 files; 2,826 passed, 13
  skipped, 0 failed. Baseline at `c3fed38` measured 2,822 in 225 files, so the
  delta is exactly the 17 tests added. No test was removed.
- `npm run gate:local` at `b99ce4e` — PASS, all eleven groups, receipt
  `receipt:sha256:1418a489942c4a4154389fc1`.
- `npm run gate:clean` at `b99ce4e` — Node 20 clean checkout,
  `installResult: PASS`, `gateResult: PASS`, all eleven groups, gate receipt
  `receipt:sha256:3a629d413edbebb4b8d42b80`, clean receipt
  `clean-receipt:sha256:fc6d35a027e0fe3128ed865b`.
- GitHub Actions run `33590645175` / job `100123768379` at `b99ce4e` — SUCCESS,
  all eleven required groups PASS, receipt
  `receipt:sha256:120582acb7bb971190a3a05d`.

## Decisions Made During This Task

See `PLAN.md` Decision Log. The load-bearing one is that `DEF-CI-01` is a test
defect: the operator already fails closed and every consumer reads its
completeness state, so operator exit semantics were left untouched.

## Discoveries

- `gate:clean` runs on the same host it clones from, so it structurally cannot
  catch a runner-topology defect.
- Playwright's "did not run" is a distinct bucket from "skipped".
- `bin/quality-gate-inventory.mjs` used a `/g`-flagged regex with `.test()`.

## Blockers

None.

## Safety Events

None. No production, NEXT or DEV contact; no credential or auth-state
inspection; no datastore, cloud, IAM or Kubernetes access; no
sibling-repository write; no publication. Sibling repositories were read only
through the existing confined read-only boundary.

## Deferred / Follow-Up

- A CI-topology clean gate (see `PLAN.md` Deferred Work).
- `ART-SBX-01` local-sandbox `$HOME` artifact affecting five `selfDev*` cases.

## Resume Recipe

Task complete. Do not resume this task. The exact-head CI baseline repair is
closed and its session worktree is released; a future campaign requires a new
authorization and its own task directory.

## Completion Snapshot

- The campaign is COMPLETE: M1 through M8 are closed and the exact-head GitHub
  baseline is green.
- `DEF-CI-01` and `DEF-CI-02` have exact root causes and permanent regressions
  that fail if either defect returns. Both were TEST defects over correct,
  already-fail-closed production paths.
- No safety invariant was weakened. No `test.skip` was added, no required group
  became optional, no file left `campaign:synthetic`, no fail-closed state
  became a pass, no retries or timeout inflation were introduced, no invariant
  was bypassed on `CI`, no child exit code is ignored, and no test was deleted.
- Adversarial coverage INCREASED: each repaired suite now also proves the
  fail-closed path on a host lacking the capability, which nothing asserted
  before, and the deep containment lane is newly REQUIRED to be proven in
  `local`, `clean` and `predev`.
- `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` executed on GitHub for the first
  time in the project's history, and both passed.
- Project truth now describes the real CI state, historical zero-step runs are
  preserved unrewritten, and `PROJECT_STATE_CI_EVIDENCE_STALE` mechanically
  detects the staleness class that existed at campaign start.
- C-06 is untouched and remains fail-closed. C-10 was NOT implemented.
