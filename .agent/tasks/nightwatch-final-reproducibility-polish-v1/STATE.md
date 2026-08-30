# Task State

## Identity

Task ID: nightwatch-final-reproducibility-polish-v1
Phase: FINAL_REPRODUCIBILITY_POLISH_V1
Status: COMPLETE
Starting SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
Last validated implementation SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last substantive checkpoint SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last documentation checkpoint SHA: 6769bb427d90c6b8c7b9a09aa396e433749b0f2d
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
LAST_VALIDATED_IMPLEMENTATION_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_FINAL_REPRODUCIBILITY_POLISH_V1_STATUS: COMPLETE
## Objective

Prove post-acceptance Nightwatch reproduces on a clean machine and in isolated topology, and requalify real DEV.

## Current Milestone

COMPLETE / STOP. M1–M4 are closed: clean-machine Node 20, exact canonical/detached-source parity, bounded DEV requalification, and final documentation/validator/Git/privacy reconciliation.

## Completed Milestones

- Git topology verified at d12b1d7 — main only, origin/main sync, clean tree
- M1 complete at d12b1d7 — clean Node 20 checkout, fresh dependency install, and full gate passed
- M2 complete at documentation checkpoint 82be077 — canonical and topology-correct detached-source full suites have exact parity: 2,661 enumerated, 2,648 expected passes, 13 skips, 0 unexpected failures, 0 flaky; isolated Nightwatch and six detached source clones clean before/after
- M3 complete at documentation checkpoint fe35220 — Phase 2C retry passed, Phase 5 passed, fresh Phase 7 prepare/resume completed cleanly; Phase 4 surfaced one known DEV product anomaly without a Nightwatch code change
- M4 complete at validation checkpoint 6769bb4 — all final documents reconciled; local and Node 20 clean gates passed; typecheck, hardening, agent, project, handoff, and history audit passed; pushed `HEAD == origin/main` and clean tree verified

## Work In Progress

Task complete. No implementation or documentation work remains in this task. The known Phase 4 DEV product anomaly is preserved as a sanitized follow-up, not a Nightwatch defect.

## Exact Next Action

STOP — task complete; any follow-up starts as a new authorized task.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/SPEC.md` | New task spec | done |
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/PLAN.md` | New task plan | done |
| `.agent/tasks/nightwatch-final-reproducibility-polish-v1/STATE.md` | New task state | done |
| `openspec/changes/nightwatch-final-reproducibility-polish-v1/*` | OpenSpec | done |
| `.agent/ACTIVE_TASK.md` | Activate successor and record final closure | done |
| `.agent/EXECUTION_PROMPT.md` | Final handoff | done |

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

Command: `npm run gate:local` at documentation checkpoint `69215117acc856ef4fcfaea847b842329b32ce7d`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: all 10 required groups PASS; semantic compatibility `1919 passed / 13 skipped / 0 failed`; owner provenance `91 passed`; synthetic campaign `73 passed`; Node 22; `receipt:sha256:fc00f7b051fc4110a2aeba46`.

Command: `npm run gate:local` at validation checkpoint `6769bb427d90c6b8c7b9a09aa396e433749b0f2d`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: all 10 required groups PASS; semantic compatibility `1919 passed / 13 skipped / 0 failed`; owner provenance `91 passed`; synthetic campaign `73 passed`; `receipt:sha256:b6d2e61df1c7c5969fb895a7`.

Command: `npm run gate:clean` at validation checkpoint `6769bb427d90c6b8c7b9a09aa396e433749b0f2d`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: source HEAD `6769bb427d90c6b8c7b9a09aa396e433749b0f2d`; Node 20; fresh `npm ci --ignore-scripts`; `cleanBefore=true`; `cleanAfter=true`; `nodeModulesReused=false`; `authStateProvided=false`; `ownerFindingStateProvided=false`; `siblingWrites=0`; all 10 required groups PASS; semantic compatibility `1919 passed / 13 skipped / 0 failed`; `receipt:sha256:1d402605037d763913e301ae`; `clean-receipt:sha256:7a00dd503f78cfb0f308d653`.

Command: `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`, and `npm run agent:audit` at validation checkpoint `6769bb427d90c6b8c7b9a09aa396e433749b0f2d`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: typecheck 0 errors; hardening PASS; project PASS with `OPERATIONALLY_ACCEPTED` preserved; handoff PASS; agent strict errors `0`; history audit strict errors `0` across `90` tasks, with the known `24` legacy-task warnings and the documented implementation-SHA checkpoint warning.

Command: `npm run agent:check` and `npm run handoff:check` after terminal-closure wording repair
Result: PASS
When: 2026-08-31
Relevant failure/output summary: strict agent validation `strict_errors=0`; handoff status `COMPLETE`; the only agent warnings remain the approved implementation-SHA checkpoint warning and `24` historical legacy-task warnings. M4 acceptance prose was made status-neutral after the parser correctly treated embedded terminal-state vocabulary as open milestone status.

Command: `git diff --check` and `test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" && git status --porcelain --branch`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: no whitespace errors; pushed main is synchronized with origin/main at `6769bb427d90c6b8c7b9a09aa396e433749b0f2d`; working tree clean.

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json` (first final run)
Result: FAIL / PRODUCT_ANOMALY
When: 2026-08-31
Relevant failure/output summary: Phase 2A safety gate `13/13` passed; the bounded six-context run reported sanitized strict replay divergence for `ripple-common-exchange-read` and stopped. No Nightwatch source or sibling repository writes occurred.

Command: same Phase 2C launcher (bounded retry)
Result: PASS
When: 2026-08-31
Relevant failure/output summary: Phase 2A safety gate `13/13` passed; all six serial fresh-context journeys completed with strict replay pass and zero strict mismatches.

Command: `NIGHTWATCH_HEADED=0 npm run explore:phase4 -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PARTIAL / PRODUCT_ANOMALY
When: 2026-08-31
Relevant failure/output summary: Phase 2A safety gate `13/13` passed; payer/common exploration paths passed, while `E3-J3-account-inventory` terminated `FATAL_ORACLE` on the known DEV malformed-JSON `GET /m/blue/billing/v1/billinggroups` response. This is product behavior, not a Nightwatch implementation failure.

Command: `NIGHTWATCH_HEADED=0 npm run api:phase5 -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: bounded source-generated DEV API corpus `1 passed / 0 failed`; traces and raw response persistence remained disabled.

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --prepare-only --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: fresh checkpoint `PHASE_7_NEW_REAL_CAMPAIGN_READY`; campaign `campaign:sha256:914bb649e928692a4dd2b9ba`; manifest `manifest:sha256:e12e6fd21767017047177259`; source implementation SHA `69215117acc856ef4fcfaea847b842329b32ce7d`; 5 work items; `PREPARE_GATE_PASS`.

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --resume-campaign=campaign:sha256:914bb649e928692a4dd2b9ba --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS / COMPLETE_CLEAN
When: 2026-08-31
Relevant failure/output summary: all 5/5 work items completed; 0 anomaly observations; 0 unique clusters; privacy `PASS`; safety production attempts, proxy violations, unknown destinations/approvals, product mutations, action-caused-unknown, database queries, infrastructure queries, and external publication attempts all `0`; L4 `OUT_OF_SCOPE_BY_OWNER`; headline `NO ANOMALIES OBSERVED`.

## Decisions Made During This Task

Decision: Create successor `nightwatch-final-reproducibility-polish-v1` at e0c0c33; reason: prior deep hardening deferred `gate:clean` and isolated parity; evidence: STATE e0c0c33.
Decision: Treat the current `d12b1d7` as the validated implementation checkpoint; reason: `gate:clean` exercises the clean checkout at the live HEAD and passes all required groups.
Decision: Use detached no-hardlink clones for isolated parity; reason: the first aggregate sibling-symlink topology correctly failed closed in `src/core/source/siblingSource.ts` because the source reader rejects symlink paths, while detached clones reproduced canonical results without weakening that safety contract.
Decision: Accept the final DEV evidence with the Phase 2C bounded retry and retain the Phase 4 malformed-JSON result as a product anomaly; reason: the required clean Phase 2C/Phase 5/campaign evidence passed, while Nightwatch must not hide a real DEV oracle failure or relabel it as a framework defect.
Decision: Close the task without changing the project’s operational verdict; reason: all M1–M4 evidence and final validators passed, while the project-state block correctly remains the existing `OPERATIONALLY_ACCEPTED` authority.
Decision: Keep M4 milestone prose status-neutral where it describes acceptance conditions; reason: the continuity parser uses the last recognized status token on each milestone bullet, so incidental vocabulary must not create a false open milestone.

## Discoveries

- Prior deep hardening gate local 10/10 at e0c0c33, real DEV b1debd41 valid
- Clean-machine qualification at d12b1d7: PASS; receipts recorded above
- Canonical and detached-source isolated full-suite parity: exact `2661/2648/13/0` enumeration/pass/skip/fail counts and identical skip identities; the aggregate-symlink diagnostic produced four expected no-snapshot failures and was not used as the parity result
- Final DEV: Phase 2C retry clean, Phase 5 `1/1` pass, Phase 7 fresh prepare/resume `5/5 COMPLETE_CLEAN`; Phase 4 separately surfaced the known `billinggroups` malformed-JSON product anomaly
- Final closure at 6769bb4: local and Node 20 clean gates passed with 10/10 groups, all individual validators passed, and Git main/origin parity was clean

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Known DEV product follow-up: `GET /m/blue/billing/v1/billinggroups` returned malformed JSON during Phase 4; it remains attributed to DEV product behavior and is outside this Nightwatch task.
- External CI was not run and is not claimed green; any future CI observation requires separate policy/authorization.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

COMPLETE. M1–M4 are closed; clean-machine and isolated reproducibility passed, required DEV evidence passed with the Phase 4 product anomaly retained truthfully, final validators passed, and pushed main is clean and synchronized.
