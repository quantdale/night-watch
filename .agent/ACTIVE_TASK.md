# Active Task

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Title: Final product completion (terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6,7,8,9,10,11,12,13,14
TASK_GROUP_NEXT: 15
TASK_NEXT_ID: 15.4
Task directory: .agent/tasks/nightwatch-final-product-completion-v1
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: efae50ce5516d0d919bb8c5a6463dbb51caf3dc8
Last checkpoint: 2026-10-15 — D-173's guarded measurement root implemented
(D-174) in the C-00 session worktree
`nightwatch-final-product-complet-5054d550` (session `sess-158bca2d98a8`, base
`907ebbcd`): the COMMAND producer measures S through a verified exact-checkout
measurement root, BM-078 is reissued against the corrected invariant with five
new behavioural mutants (census 117 -> 122), and 24 focused regressions pass.
Current milestone: M15 — land the D-173/D-174 certification-machinery repair as
substantive checkpoint S3, validate and integrate it through C-00, observe
exact-S3 CI, then rebuild the certification evidence at S3 (six command lanes
re-earned through the guarded measurement root, gate/clean imports, fresh
receipts, values-only binding) toward 15/16 effective MET.
Next action: commit the validated repair with its continuity records and
regressions, run `npm run gate:milestone` and `npm run prepush` at that exact
HEAD S3, integrate through C-00, observe the run at S3, advance the anchor in a
documentary descendant, and execute the S3 certification choreography.
Authorization class: FINAL_PRODUCT_COMPLETION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: efae50ce5516d0d919bb8c5a6463dbb51caf3dc8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: efae50ce5516d0d919bb8c5a6463dbb51caf3dc8
LIVE_HEAD_AUTHORITY: GIT
PHASE_FINAL_PRODUCT_COMPLETION_V1_STATUS: IN_PROGRESS

## Mission

Continue the existing terminal campaign. CI recovery is executed and green at
S (run 38382773612, all 15 groups PASS). The campaign is NOT_COMPLETE;
release advancement still requires all 16 verified conditions under D-129.
No new campaign or additional paid provider proof is authorized by this recovery.

## Read order

1. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-product-completion-v1/{proposal,design,audit,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`
4. Current ledgers and the cited live evidence

## Routing and safety

```text
CAMPAIGN: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-product-complet-5054d550

CURRENT STATUS:
  IN_PROGRESS — M15. The owner's 2026-10-15 "TERMINAL PRODUCT COMPLETION /
  FINAL EXECUTION MISSION" instruction EXPLICITLY AUTHORIZES completing the
  D-173 certification-machinery repair, including the narrowly necessary
  replacement of behavioural mutant BM-078 and its focused negative tests,
  plus all subsequent Nightwatch-local validation, receipt production,
  evidence binding and governed GitHub integration needed for certification.
  The repair is IMPLEMENTED (D-174, guarded measurement root) in this session
  worktree and pending its S3 gates. The twelve MANUAL_OWNER harnesses remain
  UNAVAILABLE_CAPABILITY with the approved revisit date 2026-11-14 (Decision B,
  unchanged). Condition 3 stays owner-gated: no provider call, no spend, no new
  grant (Decision C). Repository visibility stays PUBLIC (Decision D): the
  privacy change is an OWNER/ADMIN action and is NOT authorized here.

IMPLEMENTATION AUTHORIZED (owner instruction 2026-10-15):
  The D-173 guarded-measurement-root repair of release condition #1 (changes to
  certification producer code and CLI, checkpoint source-measurement plumbing,
  security regression tests, guarded measurement-root tests, behavioural
  mutation tests including the BM-078 replacement, TypeScript declaration
  changes, small justified configuration changes), governed Nightwatch-local
  commits, authorized fast-forward integration, exact-checkpoint CI, fresh
  receipt production, release evidence binding, canonical and fresh-clone
  verification, and accurate campaign/decision documentation. NOT authorized:
  provider execution or spending money, a new GRANTED provider authorization,
  unexecuted manual harnesses or DEV authentication, repository visibility
  changes, Alphaus contact, sibling-repository mutations, campaign archive, or
  any general weakening of the certification rules.

EXTERNAL CONTACT AUTHORIZED:
  GitHub Actions read/observe; validated fast-forward Nightwatch pushes;
  public read-only provider documentation and npm advisory queries for the
  provider-readiness preparation (no authenticated provider call).
  No provider execution, no spend, no repository visibility change and no
  campaign archive is authorized here.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Live HEAD and ownership are discovered from Git and `session:status`. Do not
claim release completion, run paid proof, change visibility or archive without
the required owner actions and verified evidence.
