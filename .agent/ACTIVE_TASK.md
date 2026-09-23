# Active Task

Task ID: nightwatch-priority-audit-remediation-sequence-v1
Phase: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
Title: Priority audit remediation sequence implementation
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-priority-audit-remediation-sequence-v1
Starting SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
Last validated implementation SHA: 70104a0016183e103815c79ff1a7647b73e4e622
Last checkpoint: M5 COMPLETE at `70104a00` — gate:dev PASS; gate:milestone PASS (12/12 steps exit=0); full probe campaign 143/143; strict OpenSpec PASS; four defect pins A–D inverted; zero-upstream counters at five boundaries (fixture hits, wsConnections, redirect dst, proxy request/connection, relay fetchCalls).
Current milestone: M6 — Cross-phase audit, full certification, C-00 closure
Next action: Cross-phase adversarial audit of NW-AUD-010×014×019×018×020 (doc-descendant exactness, child-process totality re-run over every file the five remediations added, key-authority coherence, semantic-receipt persistence safety, helper bounds, generation×recorder teardown) with immediate fixes; re-verify the two recorded flakes + the advisory parse quirk; then ONE authoritative full certification, pre-integration C-00 checks, integrate/release/remove with exact expectations, gate:clean post-integration, terminal report, successor reassessment.
Authorization class: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
LAST_VALIDATED_IMPLEMENTATION_SHA: 70104a0016183e103815c79ff1a7647b73e4e622
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 70104a0016183e103815c79ff1a7647b73e4e622
LIVE_HEAD_AUTHORITY: GIT
PHASE_PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1_STATUS: IN_PROGRESS

## Mission

Implement and validate five owner-authorized audit remediations in strict
serial order — NW-AUD-010 release evidence lineage integrity, NW-AUD-014
child-process boundary totality, NW-AUD-019 private payload structural
screening, NW-AUD-018 authenticated evidence minimization, NW-AUD-020
semantic request admission — each with live reproduction, focused regression,
adversarial/mutation proof, honest OpenSpec/task truth, and a coherent
committed checkpoint; then run one cross-phase audit and one full
certification, close C-00, enumerate remaining audit backlog, and stop.

## Read order

1. `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md` and `docs/CURRENT_STATE.md`
3. `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/`
4. The active phase's remediation OpenSpec change and cited live source

## Routing and safety

```
CAMPAIGN: nightwatch-priority-audit-remediation-sequence-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-priority-audit-remedi-0e17af9c

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

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
