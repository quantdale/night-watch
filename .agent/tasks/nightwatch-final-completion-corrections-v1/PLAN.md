# Corrective campaign (child of the terminal campaign) — Plan

Task ID: nightwatch-final-completion-corrections-v1
CHILD OF: nightwatch-final-product-completion-v1

## Purpose

Close the corrective change's 39 tasks so the parent campaign
`nightwatch-final-product-completion-v1` resumes at M9 task 10.2 (remainder:
59/76 declared) from sound foundations. The audit's 29 open findings (21
STILL_PRESENT + 5 CHANGED + 2 COMPLETED_LATER residual items + VE-01 repo
side) and 3 follow-on defects (CF-01..CF-03) each end with a fix plus
regression/probe where the task requires one.

## Starting State

- Task ID: `nightwatch-final-completion-corrections-v1`, child of
  `nightwatch-final-product-completion-v1`.
- Starting SHA: `1d47e2eef1ef029560ace12e31571624602eab0b` (= origin/main,
  clean canonical, one fresh C-00 session worktree
  `session/nightwatch-final-completion-corr-c45f0e9d`).
- Corrective change: `openspec/changes/nightwatch-final-completion-corrections-v1/`
  (proposal/design/audit/tasks + 3 delta specs), restored unchanged from the
  staging scratchpad; `audit.md` carries the 2026-09-28 re-verification table.
- Parent continuity at M9 task 10.2 (59/76 declared, 4 library-retained,
  13 pending); exact-head CI green at `32180001` (run 36366426608).
- Established facts not to rediscover: the 31 findings' file:line evidence
  at `d595c7c8` and at `1d47e2ee` (audit re-verification table), and the
  follow-on defects CF-01..CF-03.

## Scope

The corrective change's tasks 1.1-6.4 only: certification anchors (VB-*),
validation spine (VC-*), release probes (VD-* + CF-*), ledger/continuity
truth (VA-*), and hygiene/close-out (VE-01 + 6.x). Nightwatch source/tests/
hardening/schemas/config, synthetic fixtures, OpenSpec and task continuity
records, local bounded child processes, and C-00 integration from this
session only.

## Non-Goals

- The parent's M9-M14 work (10.2 remainder, 10.3-10.6, M10-M14) — resumed by
  the parent after this child closes.
- New authorizations beyond OD-3; L/XL contained-DEV redesigns; any
  production-track work.

## Safety Constraints

- LOCAL / OFFLINE / SYNTHETIC only; OD-3 external exceptions exactly: GitHub
  Actions read/observe, C-00 fast-forward pushes, one bounded paid provider
  proof run (parent 12.3), one npm registry advisory query (parent 15.4).
- No Alphaus DEV/NEXT/production contact, authenticated Alphaus runtime,
  credentials, customer data, database/data-plane/cloud access, sibling
  writes, external publication, force push, or history rewrite.
- One writer under C-00; never mutate another owner's worktree.
- Never write under the canonical checkout while this session is live; if
  canonical becomes dirty, STOP and report the exact files and mtimes
  (RESUME_PROMPT §2). No formatters over files this session did not change.
- Never back-date or fabricate anchors, receipts, CI results or evidence
  SHAs; tracked documents never predict the SHA or CI run of the commit
  that contains them.

## Architecture / Approach

RESUME_PROMPT order: task 6.1 FIRST (repository formatter policy:
`biome.json` with formatter + organize-imports disabled, `.editorconfig`,
and a test that a formatter run changes no tracked file), as the first
commit after the bootstrap. Then the groups in order:

1. Group 2 — certification anchors (tasks 2.1-2.8): VB-01..VB-07.
2. Group 3 — validation spine (tasks 3.1-3.12): VC-01..VC-11.
3. Group 4 — release probes (tasks 4.1-4.6): VD-01..VD-05 + CF-01..CF-03
   (probe-at-checkpoint binding; G18 UI-harness receipt; G12 yield-campaign
   receipt bound to S; then re-derive the M4-M9 probe results and demote any
   not bound to S).
4. Group 5 — ledger and continuity truth (tasks 5.1-5.6): VA-01..VA-05 +
   the VA-02 residual (Files Changed table).
5. Group 6 — hygiene and close-out (tasks 6.2-6.4).

Each finding's corrective task applies only where the re-verification shows
STILL_PRESENT or CHANGED; a COMPLETED_LATER finding is recorded with its SHA
and evidence and needs no code change.

## Milestones

- **M1** — bootstrap (change + continuity together) — COMPLETE at this
  commit.
- **M2** — task 6.1 formatter policy — NOT_STARTED.
- **M3** — group 2 (certification anchors, 2.1-2.8) — NOT_STARTED.
- **M4** — group 3 (validation spine, 3.1-3.12) — NOT_STARTED.
- **M5** — group 4 (release probes + follow-on defects, 4.1-4.6) —
  NOT_STARTED.
- **M6** — group 5 (ledger/continuity truth, 5.1-5.6) — NOT_STARTED.
- **M7** — group 6 (hygiene/close-out, 6.2-6.4) — NOT_STARTED.

## Validation Strategy

After each group: focused suites → `gate:dev` → `gate:milestone`; commit
every guard before `hardening:rules` (probe restores discard uncommitted
work); update STATE after every group. Close-out (6.2): typecheck,
typecheck:bin (ratchet), UI typecheck/test/build, schema:check,
hardening:check, hardening:rules, validation:universe, agent:check,
agent:audit, project:check, workspace:check, session:check,
campaign:synthetic, gate:local, npm test, `openspec validate --all --strict`.
6.3: integrate with `--expect-head`, observe exact-head CI green with `gh`,
release then remove (after the branch reachability proof), then `gate:clean`
from canonical with no live session.

## Decision Log

- (pending; every bounded reclassification of a check is recorded here and
  in `docs/DECISIONS.md`.)

## Discoveries

- The 31 audit findings were re-verified at `1d47e2ee` before any edit (see
  `audit.md`'s re-verification table): 21 STILL_PRESENT, 5 CHANGED, 2
  COMPLETED_LATER (VB-04 and VD-05's rule both landed in the parent's
  `a784e668`).
- Three follow-on defects (CF-01, CF-02, CF-03) exist because later parent
  work (M5-M9) built on the VD-01/VD-03 foundations; they are closed by
  group 4.

## Deferred Work

None deferred within this change's scope. The parent's M9-M14 work (10.2
remainder, 10.3-10.6, M10-M14) stays in the parent campaign.

## Completion Criteria

- Every one of the 31 audit findings has exactly one disposition with
  evidence (fix + regression/probe where the task requires one, or
  COMPLETED_LATER with its SHA), and CF-01..CF-03 are closed.
- The 39 tasks in `tasks.md` are ticked with DONE notes.
- Focused suites + `gate:dev` + `gate:milestone` + `hardening:rules` +
  `openspec validate --strict` all PASS at the close-out checkpoint; the
  full 6.2 command set is green.
- Exact-head CI green at the substantive close-out checkpoint (6.3).
- ACTIVE_TASK routes back to the parent at IN_PROGRESS with Next action
  "M9 task 10.2 remainder"; this change is archived with `--skip-specs`
  (6.4).
