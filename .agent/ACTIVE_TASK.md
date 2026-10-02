# Active Task

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Title: Final product completion (terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6,7,8
TASK_GROUP_NEXT: 10
TASK_NEXT_ID: 10.4
TASK_GROUP_DEFERRED: 9.5b
Task directory: .agent/tasks/nightwatch-final-product-completion-v1
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last checkpoint: 2026-10-02 — PARENT PAUSED FOR THE REVIEW-5 CHILD CAMPAIGN
(`nightwatch-final-completion-review5-v1`, owner decision D-152 in docs/DECISIONS.md). M9 task 10.2
is COMPLETE (76/76 declared: 72 operator-CLI + 4 library-retained, 0 pending)
and task 10.3 is COMPLETE (the shared-parser structural rule with its
HC-246..HC-250 probe family); exact-head CI run 36916725274 is GREEN (15/15)
at `2e0cfda0`. The review-4 child campaign is COMPLETE and archived
(`2026-10-01-nightwatch-final-completion-review4-v1`). RESUME POINT: M9 task
10.4 (annotate bins to zero diagnostics; measured baseline 77 non-conforming
bins / 1412 diagnostics), then 10.5-10.6, M10-M14 (including the single paid
run 12.3) and the 13-section final report.
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
Current milestone: M9 task 10.4 (annotate bins to zero diagnostics) — NOT
STARTED; tasks 10.2 and 10.3 are COMPLETE. The bounded review-5 child campaign
(`nightwatch-final-completion-review5-v1`) resolves the 18 review-5 findings
and then routes this campaign back to the resume point recorded above.
Next action: after the review-5 child closes, implement task 10.4 in
safety-critical-first batches with the gate plus probe campaign after each
batch; then 10.5 and 10.6.
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
  IN_PROGRESS — PAUSED AT M9 TASK 10.4 (10.2 76/76 and 10.3 COMPLETE) for the
  bounded review-5 child campaign `nightwatch-final-completion-review5-v1`.
  The review-4 child campaign `nightwatch-final-completion-review4-v1` is
  COMPLETE and archived (`2026-10-01-nightwatch-final-completion-review4-v1`,
  spec published as `openspec/specs/review4-closure/`); exact-head CI run
  36916725274 is GREEN at `2e0cfda0`. The canonical checkout is clean at
  `origin/main`.

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
