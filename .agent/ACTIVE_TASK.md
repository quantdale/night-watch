# Active Task

Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
Title: Corrective campaign (child of the terminal campaign)
CHILD OF: nightwatch-final-product-completion-v1
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-completion-corrections-v1
Starting SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
Last validated implementation SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
Last checkpoint: 2026-09-28 — VC-02..VC-06 validation-spine corrections at
clean checkpoint `6b19e428`: focused suites green (routing 15/15, phase23
15/15, receipt 41/41, census 14/14), probe campaigns HC-180..HC-183 DETECTED,
typecheck:bin PASS at 1560 / 14 of 76, universe PASS. The full `gate:clean`
receipt at this anchor proved the VC-06 real-root measurement; inner
PROJECT_TRUTH failed on PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE (the
baseline lagged the task) and is repaired by advancing the baseline to this
anchor in this documentation-only descendant.
Previous checkpoint: 2026-09-28 — VC-01 skip correction at clean checkpoint
`c736ab9b`; the exact committed tree passed the 34-test DEV-login/storage-state
suite with all four browser-backed assertions executed and 0 skips. Exact-head
GitHub Actions proof remains pending the M4 group integration.
Current milestone: M4 Validation spine (group 3, tasks 3.1-3.12: VC-01..VC-11).
M1, M2, and M3 are COMPLETE. Tasks 3.2 (VC-02 skip-identity enforcement),
3.3 (VC-03 truthful topology classification, PATH-based Bubblewrap,
bounded gate-receipt details, SHA-pinned CI artifact), and 3.4 (VC-04
D-04 CI/CLEAN-only relaxation with exact branch equality; semantic-compat
forwards the parent gate label; HC-180 registered and DETECTED 2/2), and
3.5 (VC-05 `gate:ui` `--ignore-scripts`, esbuild build verified with NO
declared exception, HC-181 DETECTED 4/4), and 3.6 (VC-06 clean-checkout
verdict purity, real-root read-only measurement, early receipts with
siblingMode/versions; probes HC-182/HC-183 DETECTED; gateReceiptPersistence
41/41) are implemented and focused-validated in the worktree. The full
`gate:clean` proof and the semantic-compatibility clean-tree rerun are
COMPLETE at `9a1abf28` (clean gate 15/15 groups PASS, receipt
`clean-receipt:sha256:7ce5fa02f058a2c37ecc4a93`; semantic-compat 2177/2163/
14 declared/0 failed with skipPolicy PASS). The gate:clean arc also exposed
and repaired three real defects: PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE
(baseline advanced to `6b19e428` in `e9ad3300`), HARDENING APPEND_ONLY on the
reconciled prose row (CORR-CORR-002), and the VC-04 report-authorization
regression (lane-identity authorization in `9a1abf28`). M4 group gates and
exact-head CI/artifact observation remain pending.
Next action: proceed to task 3.7 (VC-07 flake reproduction at the 2 s bound
+ root-cause comment + tracked flake ledger). VC-01's stale skip guards
and allowlist entries are removed; all four browser-backed tests passed locally,
with exact-head GitHub Actions proof pending M4 close-out.

Authorization class: COMPLETION_CORRECTIONS_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
LAST_VALIDATED_IMPLEMENTATION_SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_COMPLETION_CORRECTIONS_V1_STATUS: IN_PROGRESS

## Mission

Close the corrective change `nightwatch-final-completion-corrections-v1`
(39 tasks) so the parent campaign `nightwatch-final-product-completion-v1`
resumes from sound foundations at M9 task 10.2 (remainder: 59/76 declared).

## Read order

1. `.agent/tasks/nightwatch-final-completion-corrections-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-completion-corrections-v1/{proposal,design,audit,tasks}.md`
3. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE,REPORT}.md`
4. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`

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

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes; one bounded paid
  provider proof run; one npm registry advisory query.

CURRENT STATUS:
  IN_PROGRESS — M4 validation spine through VC-06; M3 certification anchors
  validated at `d6fd98b1`; exact-head CI/artifact observation remains pending.

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
