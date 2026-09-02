# Task State

## Identity

Task ID: nightwatch-exact-head-ci-baseline-repair-v1
Phase: EXACT_HEAD_CI_BASELINE_REPAIR_V1
Status: IN_PROGRESS
Starting SHA: c3fed38abd281e8648c039ac3befe8034c13e868
Branch: session/nightwatch-exact-head-ci-baselin-5b773376
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c3fed38abd281e8648c039ac3befe8034c13e868
LAST_VALIDATED_IMPLEMENTATION_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_EXACT_HEAD_CI_BASELINE_REPAIR_V1_STATUS: IN_PROGRESS

## Objective

Root-cause and repair the two synthetic-campaign failures in exact-head Actions
run `33572572053`, make a future `SYNTHETIC_CAMPAIGN` failure debuggable from
its own authoritative receipt, reconcile project truth with what actually
happened, and restore an exact-head green CI baseline.

## Current Milestone

M7 — full required-stack regression in the owned session worktree.

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

## Work In Progress

M7 regression execution.

## Exact Next Action

Run the required validation stack in the owned session worktree, repair any
failure, then integrate and certify the exact-head GitHub run (M8).

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

Recorded as each check completes; see `REPORT.md` for the final table.

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

Read `SPEC.md`, then `PLAN.md`, then this file. The repairs are landed and
validated in focused suites in both topologies. Resume at M7: run the required
validation stack in the owned session worktree
`session/nightwatch-exact-head-ci-baselin-5b773376`, then M8 integrate and
certify the exact-head GitHub run.

## Completion Snapshot

Not complete. M7 and M8 remain.
