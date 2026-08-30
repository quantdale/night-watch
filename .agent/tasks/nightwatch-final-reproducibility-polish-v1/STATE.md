# Task State

## Identity

Task ID: nightwatch-final-reproducibility-polish-v1
Phase: FINAL_REPRODUCIBILITY_POLISH_V1
Status: IN_PROGRESS
Starting SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
Last validated implementation SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last substantive checkpoint SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
LAST_VALIDATED_IMPLEMENTATION_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_FINAL_REPRODUCIBILITY_POLISH_V1_STATUS: IN_PROGRESS
## Objective

Prove post-acceptance Nightwatch reproduces on a clean machine and in isolated topology, and requalify real DEV.

## Current Milestone

Milestone ID: M3
Milestone status: IN_PROGRESS
What is being attempted: Final contained DEV requalification with external auth fail-closed and no mutation

## Completed Milestones

- Git topology verified at d12b1d7 — main only, origin/main sync, clean tree
- M1 complete at d12b1d7 — clean Node 20 checkout, fresh dependency install, and full gate passed
- M2 complete at documentation checkpoint 82be077 — canonical and topology-correct detached-source full suites have exact parity: 2,661 enumerated, 2,648 expected passes, 13 skips, 0 unexpected failures, 0 flaky; isolated Nightwatch and six detached source clones clean before/after

## Work In Progress

M1 `gate:clean` and M2 isolated parity passed. M3 final DEV requalification is now in progress; M4 reconciliation remains.

## Exact Next Action

Read only auth-state metadata and launcher preflight requirements. If the external DEV state is valid, run the serial phase2c/phase4/phase5/prepare/resume/replay/second-run path with headed mode disabled; otherwise preserve fail-closed behavior and record the exact `HUMAN_AUTH_ACTION_REQUIRED` receipt without contacting DEV.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/SPEC.md` | New task spec | done |
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/PLAN.md` | New task plan | done |
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/STATE.md` | New task state | done |
| `openspec/changes/nightwatch-final-reproducibility-polish-v1/*` | OpenSpec | pending |
| `.agent/ACTIVE_TASK.md` | Activate successor and checkpoint M1/M2 | in progress |
| `.agent/EXECUTION_PROMPT.md` | New handoff | in progress |

## Validation Ledger

Command: `git fetch --prune origin && git rev-parse HEAD`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: HEAD e0c0c33 == origin/main, main-only

Command: `npm run gate:clean`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: source HEAD `d12b1d75886987356f3ab6d80ca5b25f0723c471`; Node 20; fresh `npm ci --ignore-scripts`; no reused node_modules, auth state, owner finding state, or sibling writes; clean before/after; all 10 required gate groups PASS; semantic compatibility `1919 passed / 13 skipped / 0 failed`; synthetic campaign `73 passed`; `clean-receipt:sha256:e8ca0d67dd02cf559e8e58b9`; nested `receipt:sha256:de32d1f7bf365176c246fe27`.

Command: `NIGHTWATCH_ENV=local NIGHTWATCH_HEADED=0 npx playwright test --project=nightwatch --workers=1 --reporter=json` (canonical full suite at documentation checkpoint `82be077ebc6ef695b3b52743204e0df8e93c6ecc`)
Result: PASS
When: 2026-08-31
Relevant failure/output summary: enumerated `2661`; expected/pass `2648`; skipped `13`; unexpected/fail `0`; flaky `0`. The 13 skip identities exactly matched the detached isolated run: the 12 Phase 14 C3 checks requiring the disposable `/tmp/nightwatch-ripple-snapshot-85e400a8` source snapshot and `tests/unit/selfDevSandboxConfinement.test.ts:143` UID/chown semantics.

Command: `NIGHTWATCH_ENV=local NIGHTWATCH_HEADED=0 NIGHTWATCH_SIBLING_ROOT=<isolated>/REPOSITORIES NIGHTWATCH_PROXY_PORT=20989 npx playwright test --project=nightwatch --workers=1 --reporter=json` (fresh no-hardlink Nightwatch checkout plus six detached approved source clones)
Result: PASS
When: 2026-08-31
Relevant failure/output summary: isolated HEAD `82be077ebc6ef695b3b52743204e0df8e93c6ecc`; enumerated `2661`; expected/pass `2648`; skipped `13`; unexpected/fail `0`; flaky `0`; exact skip identities equal canonical; Nightwatch checkout and all six detached source clones clean before/after. Source clone SHAs: `mobingilabs/ripple-ui@d80b161b684d9153c7e5acaa65ae1752d93d8ba9`, `mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7`, `mobingilabs/ouchan@565f00a87fb7616cc23c45d4ffeabee38a41c65f`, `alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`, `alphauslabs/blue-sdk-go@8883ee3d3a073352626c8c35e20e9fc5ed765373`, and `alphauslabs/grpc-chunk-parser@66802f281698dfcf0903f0a117d4637fce3fd945`.

Canonical/isolated skip identities (identical in both JSON reports):

```text
tests/unit/phase14ContractReport.test.ts:386:--snapshot builds a live inventory from the disposable source snapshot
tests/unit/phase14FreshSourceAdmission.test.ts:89:C3-01 inventory covers exactly the approved registry targets (no new targets)
tests/unit/phase14FreshSourceAdmission.test.ts:96:C3-02 B1-B4 historical blockers reproduce at the fresh SHA
tests/unit/phase14FreshSourceAdmission.test.ts:111:C3-03 four admitted targets remain admitted; historical/collection IDs and recipe versions preserved
tests/unit/phase14FreshSourceAdmission.test.ts:130:C3-04 every entry carries exact provenance and a probe or blocker (before/after record complete)
tests/unit/phase14FreshSourceAdmission.test.ts:146:C3-05 zero uplift: no new contract admitted, no depth uplifted, registry unchanged
tests/unit/phase14FreshSourceAdmission.test.ts:153:C3-06 deterministic repeats >=3 identical fresh inventory
tests/unit/phase14FreshSourceAdmission.test.ts:161:C3-07 privacy: no sentinels or local paths leak into the fresh inventory
tests/unit/phase14FreshSourceAdmission.test.ts:198:C3-10 live drift vs recorded prior probes: all six EVIDENCE_UNCHANGED_SHA_MOVED
tests/unit/phase14FreshSourceAdmission.test.ts:211:C3-11 resolver resolves every derived expectation against the correct fresh SHA
tests/unit/phase14FreshSourceAdmission.test.ts:225:C3-12 B5 wrong-SHA currentness fails closed at the fresh SHA (resolver SOURCE_STALE)
tests/unit/phase14FreshSourceAdmission.test.ts:240:C3-13 missing source never certifies CURRENT (inventory fails closed STALE/UNAVAILABLE)
tests/unit/selfDevSandboxConfinement.test.ts:143:G: a base owned by another uid fails closed where uid semantics and chown permit the setup
```

## Decisions Made During This Task

Decision: Create successor `nightwatch-final-reproducibility-polish-v1` at e0c0c33; reason: prior deep hardening deferred `gate:clean` and isolated parity; evidence: STATE e0c0c33.
Decision: Treat the current `d12b1d7` as the validated implementation checkpoint; reason: `gate:clean` exercises the clean checkout at the live HEAD and passes all required groups.
Decision: Use detached no-hardlink clones for isolated parity; reason: the first aggregate sibling-symlink topology correctly failed closed in `src/core/source/siblingSource.ts` because the source reader rejects symlink paths, while detached clones reproduced canonical results without weakening that safety contract.

## Discoveries

- Prior deep hardening gate local 10/10 at e0c0c33, real DEV b1debd41 valid
- Clean-machine qualification at d12b1d7: PASS; receipts recorded above
- Canonical and detached-source isolated full-suite parity: exact `2661/2648/13/0` enumeration/pass/skip/fail counts and identical skip identities; the aggregate-symlink diagnostic produced four expected no-snapshot failures and was not used as the parity result

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- None.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and live HEAD.
4. M1: run `npm run gate:clean` and capture both receipts — complete at d12b1d7.
5. M2: compare canonical and detached-source isolated full-suite counts and skip identities — complete at 82be077.
6. M3: inspect auth metadata only, then run or fail-closed the serial DEV requalification.

## Completion Snapshot

Not complete — IN_PROGRESS. M1 clean-machine PASS and M2 exact canonical/detached-source parity are complete; M3 DEV requalification is in progress.
