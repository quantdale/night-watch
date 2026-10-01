# Active Task

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Title: Final product completion (terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6,7,8
TASK_GROUP_NEXT: 10
TASK_NEXT_ID: 10.2
TASK_GROUP_DEFERRED: 9.5b
Task directory: .agent/tasks/nightwatch-final-product-completion-v1
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last checkpoint: 2026-10-01 — PARENT RESUMED AFTER THE REVIEW-4 CHILD
CAMPAIGN CLOSED (all 24 findings dispositioned; exact-head CI run 36855178941
green at `17391ae6`; `gate:clean` `clean-receipt:sha256:c3c54d0540df6e7440fd7077`)
— the parent is once again paused canonical-routed at the same resume point. The corrective child campaign
`nightwatch-final-completion-corrections-v1` is COMPLETE and archived
(`2026-10-01-nightwatch-final-completion-corrections-v1`, `--skip-specs`): all
73 tasks, `npm test` 5848/0/34, `gate:local` 15/15 (receipt
`receipt:sha256:030bc83d1ef06cc219167f3d`), `gate:clean` PASS at `b4d0c611`
(`clean-receipt:sha256:bdae336ff5a8c9a182ac9430`), exact-head CI green at
`f887e76b`, `027367d9`, `14efed2e` and `b4d0c611`. The parent then resumed in
session `sess-83d720703401` and completed M9 10.2 resume batch 1
(`ai-local-canary` migrated to the shared operator-CLI contract; conformance
60/76 declared, 4 library-retained, 12 pending), with exact-head CI green at
`07dd9506` (run 36808189880) and at `ce289948` (run 36809415911). It is now
paused for the bounded review-4 child campaign
`nightwatch-final-completion-review4-v1` (canonical-routed: `SESSION WORKTREE:
NONE`, `Branch: main`, no live session). RESUME POINT: M9 task 10.2 remainder
(60/76 declared; next bin `auth-configure`), then 10.3-10.6, M10-M14 and the
13-section final report.
Previous checkpoint: 2026-09-27 — M8 COMPLETE (9.1-9.13): DEV-lane
preconditions + launcher guard, credential effect binding, bundle
transactions, PREPARED/TERMINAL records, guard acquisitions, bounded
body-read, run evidence, per-start nonce, relay invocation credential,
ChangeSet validation, child-process census, M8 guard totality, gate pair
5712/0 and exact-head CI green (run 36349771611 @ `badb6f88`).
Previous checkpoint: 2026-09-27 — M6 COMPLETE (7.1-7.11): the derived protocol
dossier readiness, the total Control Center status mapping, role-typed replay
contexts, the campaign-state subtree with dossier-family-first findings, the
newest-N run window, the read-only agent-campaign view, the measured Safety
Center, one resolveSiblingRoot() with a hardening rule and probe, the
SYNTHETIC_PREVIEW labelling, the status:local auth heading, and the UI/browser
coverage of the new view.
Previous checkpoint: 2026-09-27 — M5 COMPLETE (6.1-6.17): the durable
identity-bound agent finding record with its atomic store and verbatim
terminated resume, the full reasoner identity, resumed-budget conservation,
provider attribution with the honest termination class, tier-scaled failure
ceilings with bounded backoff, the `failures` rename, the streaming dispatcher
with signal-driven pause, HEAD-bound Git reproduction, environment-signature
refusal, the product run receipt, measured findings surfaces, malformed-state
refusal with marked presentation defaults, the bounded operator launch and the
synthetic hunt suite registered in the gate.
Previous checkpoint: 2026-09-26 — M4 COMPLETE (5.1-5.7): six release probes wired
(`d595c7c8`), the G20 accessibility record with its fail-closed parser
(`cab67d76`), the `implemented` honesty rule + X-04 demotion + A-19/A-20 schema
states + the CI block-record single authority (`a784e668`), and the final
integration `137207b1` after reconciling origin/main `946b52c4` and restoring
the ledger-governed README status block; gate:dev/gate:milestone 5520/0.
Current milestone: M9 task 10.2 remainder (70/76 declared)
10.2 IN PROGRESS (60/76 declared, 4 library-retained, 12 pending), then
10.3-10.6. The bounded review-4 child campaign
(`nightwatch-final-completion-review4-v1`) resolves the 24 review-4 findings
and then routes this campaign back to the resume point recorded above.
Next action: M9 task 10.2 remainder — the next bin is `auth-configure`, then
`change-intelligence`, `hardening-check`, `nightwatch-agent`,
`nightwatch-intelligence`, `phase22-dev`, `phase23-ci`, `phase23-dev`,
`phase23-predev`, `portfolio`, `review-mutation-campaign` and
`w11-historical-arm`; then 10.3-10.6, M10-M14 and the 13-section final report.

Authorization class: FINAL_PRODUCT_COMPLETION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LIVE_HEAD_AUTHORITY: GIT
PHASE_FINAL_PRODUCT_COMPLETION_V1_STATUS: IN_PROGRESS

## Mission

Execute the single terminal campaign that makes an honest
`PROJECT_COMPLETE_AND_CI_CERTIFIED` verdict reachable and stable (OD-1/OD-2):
disposition every audited census item, make the certification spine
checkpoint-neutral and CI-green, persist truthful autonomous-hunt results,
reconcile every operator-truth surface, close the ledger, and end with a
`main`-only clean topology equal to `origin/main`.

## Read order

1. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-product-completion-v1/{proposal,design,audit,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, and
   `docs/DECISIONS.md`
4. Current audit/OpenSpec ledgers and cited live source

## Routing and safety

```text
CAMPAIGN: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-product-complet-0e405e6b

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes; one bounded paid
  provider proof run; one npm registry advisory query.

CURRENT STATUS:
  IN_PROGRESS — RESUMED AT M9 TASK 10.2 REMAINDER (70/76 declared; 2 pending;
  next bin `nightwatch-agent`). The review-4 child campaign
  `nightwatch-final-completion-review4-v1` is COMPLETE and archived
  (`2026-10-01-nightwatch-final-completion-review4-v1`, with spec sync to
  `openspec/specs/review4-closure/`): all 24 findings dispositioned, exact-head
  CI run 36855178941 GREEN at `17391ae6`, close-out run 36859209949 GREEN at
  `e5ec64ca`, `gate:clean` PASS from canonical with no live session. The
  canonical checkout is clean at `origin/main`.

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
completion, exhaustion, or release readiness without evidence.
