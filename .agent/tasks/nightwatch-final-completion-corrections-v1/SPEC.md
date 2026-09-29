# Corrective campaign (child of the terminal campaign)

Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
CHILD OF: nightwatch-final-product-completion-v1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Objective

Close the 29 open findings (and 3 follow-on defects) recorded in the
corrective change `audit.md`, re-verified at the parent base `1d47e2ee` on
2026-09-28, so the parent campaign `nightwatch-final-product-completion-v1`
resumes from sound foundations at M9 task 10.2 (remainder: 59/76 declared).

## Finding classifications at the live base (2026-09-28, `1d47e2ee`)

- STILL_PRESENT (21): VB-01, VB-02, VB-03, VB-05, VB-06, VC-01, VC-02,
  VC-03, VC-04, VC-05, VC-08, VC-09, VC-10, VC-11, VD-01, VD-02, VD-03,
  VA-01, VA-03, VA-04, VA-05.
- CHANGED (5): VB-07 (diagnostics 1571→<current> and 13/76→59/76 declared
  via the parent M9 10.1/10.2 work, but the ratchet mechanics (total ceiling,
  stale-ceiling failure, measured per-file ceilings) are absent), VC-06 (the
  clone cleanBefore/cleanAfter measurement landed in the parent M3 work; the
  sibling stand-in measurement and early-exit receipt omissions remain),
  VC-07 (the overflow loop was paced at `533eee97`; the 2s→20s poll-raise and
  its contradicting comment and the missing flake ledger remain), VD-04
  (G21/G19 now spawn the real hardening rules but retain hard-coded MET
  details and no refusal exercise), VE-01 (the owner/harness side is resolved
  — the 16 files were dispositioned disposable and the pi-lens mutation
  controls are disabled globally and at project scope outside the repos; the
  repository-side formatter policy is corrections task 6.1).
- COMPLETED_LATER (2): VB-04 (the `liveHeadSha` TDZ is gone —
  `certificationDemotionFor` is parameterized and the value is computed at
  line 1407 before use at line 1505, fixed in `a784e668`), VD-05 (the
  structural `implemented` honesty rule `checkReleaseImplementedHonesty` is
  in `bin/lib/hardening/rules/validation-and-gates.mjs:480` since
  `a784e668`; its includes-literal/pinned-detail test replacement is tracked
  under the VD-04 CHANGED path).
- Follow-on defects (new findings recorded in `audit.md` and REPORT):
  CF-01 — every M4 release-probe result since `d595c7c8` was measured by
  working-tree probes (VD-01 foundation): re-verify G14/G17/G18/G19/G21/G12
  and G20 after 4.1 and demote any result whose evidence is not bound to S.
  CF-02 — the G20 accessibility record carries `nightwatchSha`
  (`bin/lib/accessibility-record.mjs:49`) but its probe must resolve
  `NOT_AT_CHECKPOINT` when HEAD != S under 4.1. CF-03 — G12 accepts any
  `artifacts/nightwatch-*` run with `passed: boolean` and any 40-hex SHA and
  keeps the historical W13 aggregate load-bearing (VD-03 foundation).

## Declared Deletions

- `config/bin-typecheck.v1.json` REPORTING mode field semantics are replaced
  by BLOCKING (2.7/10.5 parent continuation): no tracked file is deleted.
- `DIFF_GUARDED_CHECKPOINT_PATHS` (dead constant in
  `bin/agent-continuity-protocol.mjs`) is removed (VB-06): its declaration
  lines are deleted within that file — no whole-file deletion.
- No other tracked-file deletions are declared. A file created and deleted
  within this session yields no net deletion.

## Read order

1. `openspec/changes/nightwatch-final-completion-corrections-v1/{audit,proposal,design,tasks}.md`
2. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE,REPORT}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`

## Routing and safety

```text
CAMPAIGN: nightwatch-final-completion-corrections-v1
CHILD OF: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-completion-corr-c45f0e9d

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3, CHILD SUBSET ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes. The parent's
  single-use grants (the one bounded paid provider proof run, task 12.3, and
  the one npm registry advisory query, task 15.4) are OWNED by those parent
  tasks and are NOT granted to this child.

CURRENT STATUS:
  IN_PROGRESS — corrections child campaign bootstrap.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never discard
a newer canonical tip, and never touch another owner's worktree. Do not claim
completion without evidence. Never write under the canonical checkout while
this session is live; if canonical becomes dirty, STOP and report the exact
files and mtimes.
