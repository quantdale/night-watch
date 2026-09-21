# Active Task

Task ID: nightwatch-session-mutation-authority-binding-v1
Phase: SESSION_MUTATION_AUTHORITY_BINDING_V1
Title: Session mutation authority binding implementation
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-session-mutation-authority-binding-v1
Starting SHA: caab10e91b8d81f2b98597b3c6974db89638ae6c
Last validated implementation SHA: c13544a12d153daec1eb2f3915c94cb74bc93040
Last checkpoint: M0–M5 complete at validated checkpoint `6a8d6c71`; `gate:local` all twelve groups PASS.
Current milestone: COMPLETE / STOP — M0–M5 closed; change integrated through C-00
Next action: STOP — terminal record; only the post-removal documentation routing flip remains.
Authorization class: NW_AUD_006_IMPLEMENTATION
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: caab10e91b8d81f2b98597b3c6974db89638ae6c
LAST_VALIDATED_IMPLEMENTATION_SHA: c13544a12d153daec1eb2f3915c94cb74bc93040
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c13544a12d153daec1eb2f3915c94cb74bc93040
LIVE_HEAD_AUTHORITY: GIT
PHASE_SESSION_MUTATION_AUTHORITY_BINDING_V1_STATUS: COMPLETE

## Mission

Implement and validate the strict-valid OpenSpec change
`nightwatch-session-mutation-authority-binding-v1`: bind every mutating C-00
lifecycle command to the invoking checkout and executing CLI, require explicit
public session and HEAD expectations, admit continuity coherence, serialize
ownership-record transitions with a bounded lock and revision compare-and-swap,
restrict command roles, admit integration authority before network access, and
prove the cross-session and race boundaries non-vacuously.

## Read order

1. `.agent/tasks/nightwatch-session-mutation-authority-binding-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md` and `docs/CURRENT_STATE.md`
3. `openspec/changes/nightwatch-session-mutation-authority-binding-v1/`
4. `bin/nightwatch-session.mjs`, `bin/workspace-integrity.mjs`, focused tests

## Routing and safety

```
CAMPAIGN: nightwatch-session-mutation-authority-binding-v1
CHILD TASK: NONE
SESSION WORKTREE: NONE

IMPLEMENTATION AUTHORIZED:
  bin/nightwatch-session.mjs, bounded shared C-00 helpers,
  tests/unit/**, hardening rules and probes, AGENTS/docs/recipe updates,
  active task and OpenSpec continuity records.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never
discard a newer canonical tip, and never touch another owner's worktree.
