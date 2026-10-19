# Active Task

Task ID: nightwatch-release-success-contract-v1
Phase: RELEASE_SUCCESS_CONTRACT_V1
Title: Release success contract (R6) and the governed C-00 claim recovery
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2
TASK_GROUP_NEXT: 3
TASK_NEXT_ID: 3.1
Task directory: .agent/tasks/nightwatch-release-success-contract-v1
Starting SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Last validated implementation SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
Current milestone: M5 — gates and governed integration: run the full gate set on
the R6 + C-00-recovery implementation, integrate it through the C-00
fast-forward protocol at exact HEAD, observe exact-head GitHub CI, then execute
the S6 substantive-checkpoint certification choreography (re-earn every
checkpoint-bound release condition at S6) and prepare the parent-12.5 provider
readiness package without spending anything.
Last checkpoint: 2026-10-19 — the C-00 owner-approved `retarget-task` recovery
corrected this session's misassigned claim
(`nightwatch-final-product-completion-v1` → `nightwatch-release-success-contract-v1`)
through the governed record transition; the predecessor session's claim and S5
worktree are preserved byte-for-byte. The R6 release-success-contract
implementation (fe193a3a) and its diagnostics/resume repairs are complete and
green on the focused gates.
Next action: run the full prepush/milestone gate set at the corrected-continuity
tip, then `integrate --expect-session sess-6d6ce5780dfc --expect-head <tip>`,
observe exact-head CI, and continue M5.
Authorization class: RELEASE_SUCCESS_CONTRACT_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LAST_VALIDATED_IMPLEMENTATION_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LIVE_HEAD_AUTHORITY: GIT
PHASE_RELEASE_SUCCESS_CONTRACT_V1_STATUS: IN_PROGRESS

## Mission

Close the release-success-contract gap (R6) so a qualifying provider campaign
is genuinely reachable, keep every certification requirement intact, and finish
the governed engineering path of the terminal product-completion programme:
C-00 recovery, validated fast-forward integration, exact-head CI, the S6
substantive checkpoint with re-earned evidence, and a fully prepared (but
unexecuted) parent-12.5 provider proof. The release status advances only under
D-129: all sixteen conditions MET at the certified checkpoint with exact-head
CI green. Condition #3 (autonomous-yield-proof) stays UNMET until a genuinely
qualifying provider campaign runs under a fresh owner authorization.

## Read order

1. `.agent/tasks/nightwatch-release-success-contract-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`
   (especially D-129, D-174 through D-180)
3. `docs/RELEASE-ADVANCE-CONDITIONS.md`, `config/release-certification.v1.json`
4. Current ledgers and the cited live evidence

## Routing and safety

```text
CAMPAIGN: nightwatch-release-success-contract-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-product-complet-12cbddff

CURRENT STATUS:
  IN_PROGRESS — M5. The owner's 2026-10-19 "FINAL END-TO-END COMPLETION
  MISSION" instruction EXPLICITLY AUTHORIZES Nightwatch-local engineering,
  the C-00 session-governance repair (the one narrow owner-approved
  mistaken-claim correction recorded in D-180), testing, governed
  integration, checkpoint certification and documentation closure. The R6
  release-success-contract implementation and the C-00 `retarget-task`
  recovery are IMPLEMENTED and locally validated. The twelve
  MANUAL_OWNER harnesses remain UNAVAILABLE_CAPABILITY with the approved
  revisit date 2026-11-14 (Decision B, unchanged). Condition 3 stays
  owner-gated: no provider call, no spend and no new grant without the fresh
  parent-12.5 owner approval and its monetary cap. Repository visibility
  stays PUBLIC (Decision D): the privacy change is an OWNER/ADMIN action and
  is NOT authorized here.

IMPLEMENTATION AUTHORIZED (owner instruction 2026-10-19):
  The R6 release-success-contract work (campaign completion verdict,
  diagnostics, sibling-scope separation, resume-path repair), the narrow C-00
  `retarget-task` recovery with its governance tests, all subsequent
  Nightwatch-local validation, governed Nightwatch commits, authorized
  fast-forward integration, exact-head CI observation, the S6 substantive
  checkpoint with full checkpoint-bound evidence re-earning, canonical and
  fresh-clone verification, provider-readiness preparation that spends
  nothing, and accurate campaign/decision documentation. NOT authorized:
  executing a paid provider campaign without the fresh parent-12.5 owner
  approval and an enforceable monetary ceiling, reusing the spent parent-12.4
  approval, unexecuted manual harnesses or DEV authentication, repository
  visibility changes, Alphaus contact, sibling-repository mutations, campaign
  archive, force pushes, history rewriting, deleting another live session's
  work, fabricating certification evidence, or any general weakening of the
  certification rules.

EXTERNAL CONTACT AUTHORIZED:
  GitHub Actions read/observe; validated fast-forward Nightwatch pushes;
  public read-only provider documentation and npm advisory queries for the
  provider-readiness preparation (no authenticated provider call without the
  fresh approval). No provider execution, no spend, no repository visibility
  change and no campaign archive is authorized here.

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
