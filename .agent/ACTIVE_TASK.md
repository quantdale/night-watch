# Active Task

Task ID: nightwatch-release-success-contract-v1
Phase: RELEASE_SUCCESS_CONTRACT_V1
Title: Release success contract (R6) and the governed C-00 claim recovery
Status: COMPLETE
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3
TASK_GROUP_NEXT: NONE
TASK_NEXT_ID: NONE
Task directory: .agent/tasks/nightwatch-release-success-contract-v1
Starting SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Last validated implementation SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
Current milestone: COMPLETE — the governed engineering path is closed at S6
`d78e6c55b5c79ccb97e958e777a9c54e0dbcb742` with its green exact-head run
(39254273491) and 15/16 effective MET; the release success contract (R6), the
D-180 C-00 recovery and the D-181 spend admission are implemented, validated
and certified there.
Last checkpoint: 2026-10-19 — S6 certified: 25 checkpoint-bound receipts
re-earned and verified offline (25/25), canonical and independent fresh-clone
evaluators in exact per-condition agreement (15/16; `autonomous-yield-proof`
UNMET by design until a qualifying provider run).
Next action: STOP — task complete. Any further provider proof belongs to a new
task under a separate fresh owner authorization (parent-12.5 with its monetary
cap); nothing here is open.
Authorization class: RELEASE_SUCCESS_CONTRACT_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LAST_VALIDATED_IMPLEMENTATION_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LIVE_HEAD_AUTHORITY: GIT
PHASE_RELEASE_SUCCESS_CONTRACT_V1_STATUS: COMPLETE

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

1. `.agent/tasks/nightwatch-release-success-contract-v1/{SPEC,PLAN,STATE,REPORT}.md`
2. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`
   (especially D-129, D-174 through D-182)
3. `docs/RELEASE-ADVANCE-CONDITIONS.md`, `config/release-certification.v1.json`
4. Current ledgers and the cited live evidence

## Routing and safety

```text
CAMPAIGN: nightwatch-release-success-contract-v1
CHILD TASK: NONE
SESSION WORKTREE: NONE

CURRENT STATUS:
  COMPLETE — the governed engineering path is closed at S6
  `d78e6c55b5c79ccb97e958e777a9c54e0dbcb742`: exact-head CI green (run
  39254273491), 25 checkpoint-bound receipts re-earned and verified, and the
  canonical and independent fresh-clone evaluators agree per-condition
  exactly (15/16 effective MET; condition #3 UNMET by design). The twelve
  MANUAL_OWNER harnesses remain UNAVAILABLE_CAPABILITY with the approved
  revisit date 2026-11-14. Repository visibility stays PUBLIC. The one
  remaining step — a single qualifying provider campaign — requires the fresh
  parent-12.5 owner approval with its monetary cap and is a future task.

AUTHORIZATION HISTORY (owner instructions 2026-10-15 / 2026-10-18 /
2026-10-19):
  The terminal programme's engineering, governance repair (D-180), spend
  enforcement (D-181), certification re-earning (D-182) and provider-readiness
  preparation were authorized and are complete. NOT authorized and NOT done:
  paid provider execution without the fresh parent-12.5 approval and an
  enforced monetary ceiling; reuse of the spent parent-12.4 approval;
  unexecuted manual harnesses or DEV authentication; repository visibility
  changes; Alphaus contact; sibling-repository mutations; campaign archive;
  force pushes; history rewriting; deleting another live session's work;
  fabricating certification evidence.

EXTERNAL CONTACT PERFORMED:
  GitHub Actions read/observe; validated fast-forward Nightwatch pushes;
  one read-only sibling-scope preflight observation (no inference, no
  mutation). No provider call, no spend, no credential disclosure.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Live HEAD and ownership are discovered from Git and the session status tooling.
The terminal record is closed; the successor provider campaign opens only
after the owner's parent-12.5 approval and its monetary cap.
