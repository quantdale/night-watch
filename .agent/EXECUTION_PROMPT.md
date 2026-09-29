# Execution Prompt — corrective child campaign

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-final-completion-corrections-v1
OpenSpec: openspec/changes/nightwatch-final-completion-corrections-v1/
Planned-From: 1d47e2eef1ef029560ace12e31571624602eab0b
Target Branch: main
Predecessor Task ID: nightwatch-successor-campaign-engine-v1
Predecessor Status: COMPLETE

## Mission

One high-impact campaign: close the corrective change
`openspec/changes/nightwatch-final-completion-corrections-v1/` so the parent
campaign `nightwatch-final-product-completion-v1` resumes at M9 task 10.2
(remainder: 59/76 declared) from sound foundations. The 31 audit findings
(21 STILL_PRESENT, 5 CHANGED, 2 COMPLETED_LATER at `1d47e2ee`) and the 3
follow-on defects CF-01..CF-03 each end with a fix plus regression/probe
where the task requires one.

Lineage note: this is a CHILD OF `nightwatch-final-product-completion-v1`
(paused at its M9 10.2 checkpoint for this correction). The Predecessor
fields above follow the programme-lineage convention established by the
parent's own handoff (the completed predecessor campaign), because the
handoff header vocabulary has no token for a still-active parent.

## Scope

Nightwatch source, tests, hardening rules/probes, schemas/configuration,
synthetic fixtures, OpenSpec and task continuity records, local bounded
child processes, and C-00 commits/fast-forward integration from this owned
session only. Item scope is frozen by the change's `tasks.md` (6 groups,
39 tasks), `design.md` (D1-D8) and `audit.md` (the re-verification table
plus CF-01..CF-03).

## Ordered workstreams

1. Task 6.1 FIRST (RESUME_PROMPT §2): repository formatter policy —
   `biome.json` with formatter and organize-imports disabled, `.editorconfig`
   pinning the normalizers off, and the formatter-changes-nothing proof.
2. Group 2 — certification anchors (2.1-2.8): VB-01..VB-07.
3. Group 3 — validation spine (3.1-3.12): VC-01..VC-11.
4. Group 4 — release probes (4.1-4.6): VD-01..VD-05 + CF-01..CF-03.
5. Group 5 — ledger and continuity truth (5.1-5.6): VA-01..VA-05.
6. Group 6 — hygiene and close-out (6.2-6.4).

## Constraints

- LOCAL / OFFLINE / SYNTHETIC only. OD-3 external exceptions for THIS child exactly: GitHub
  Actions read/observe and C-00 fast-forward pushes. The single-use paid
  provider proof run (parent 12.3) and npm registry advisory query (parent
  15.4) belong to those parent tasks and are not used here.
- No Alphaus DEV/NEXT/production contact, authenticated Alphaus runtime,
  credentials, customer data, database/data-plane/cloud access, sibling
  writes, external publication, force push, or history rewrite.
- One writer under C-00; never mutate another owner's worktree; never write
  under the canonical checkout while this session is live; if canonical
  becomes dirty, STOP and report the exact files and mtimes.
- Never weaken a safety rule, gate, test, probe, skip policy, certification
  condition or evidence requirement. Any bounded reclassification must be
  negative-tested, mutation-probed and recorded in DECISIONS.
- Never back-date or fabricate anchors, receipts, CI results or evidence
  SHAs; tracked documents never predict the SHA or CI run of the commit that
  contains them. Never rewrite a task line's `N.M` prefix.

## Validation

After each group: focused suites, then `gate:dev`, then `gate:milestone`;
commit every guard before `hardening:rules`. Close-out (6.2): typecheck,
typecheck:bin, UI typecheck/test/build, schema:check, hardening:check,
hardening:rules, validation:universe, agent:check, agent:audit,
project:check, workspace:check, session:check, campaign:synthetic,
gate:local, npm test, `openspec validate --all --strict`.

## Acceptance / completion gates

Every one of the 31 findings has exactly one disposition with evidence and
CF-01..CF-03 are closed; the 39 tasks are ticked with DONE notes; the 6.2
command set is green; exact-head CI is green at the substantive close-out
checkpoint.

## Git and reporting requirements

Integrate with `--expect-session/--expect-head` (fast-forward only), observe
exact-head CI with `gh`, release then remove after the branch reachability
proof, run `gate:clean` from canonical with no live session, archive the
change with `--skip-specs`, record every finding's disposition in REPORT,
and route ACTIVE_TASK back to the parent at IN_PROGRESS with Next action
"M9 task 10.2 remainder". Then stop and hand off.
