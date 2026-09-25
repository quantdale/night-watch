# Final product completion (terminal campaign) — Specification

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
OpenSpec change: openspec/changes/nightwatch-final-product-completion-v1/
Status: IN_PROGRESS

## Purpose

Execute the single terminal campaign that makes an honest
`PROJECT_COMPLETE_AND_CI_CERTIFIED` verdict reachable and stable: every one of
the 228 audited census items ends in one recorded disposition, the
certification spine becomes checkpoint-neutral and CI-green, the autonomous
hunt path persists truthful results, operator surfaces stop misreporting, and
the ledger closes with only `main`, one worktree-free canonical checkout, and a
clean tree.

## Authorization block (OD-1..OD-4, verbatim from audit.md)

| ID | Decision |
| --- | --- |
| OD-1 | Scope rule: **tiered terminal disposition**. Every item ends in one recorded disposition; T0/T1/T2-FIX fixed; T2-GATE quarantined; T3 accepted-residual unless S; no discovery loop. |
| OD-2 | Target **`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129**: all 16 conditions MET, bin type-check BLOCKING with 0 exemptions, all 76 entry points on the CLI contract, exact-head CI green at S. |
| OD-3 | Authorized: GitHub CI read/observe; one bounded paid provider proof run; one npm registry advisory query (root + UI lockfiles); delete local branch `session/nightwatch-successor-campaign-en-c8bcb74c` after recording SHA `1441cc8a`. |
| OD-4 | This proposal is written uncommitted in canonical. The implementation session moves it into its worktree and commits it with its task continuity in the M1 bootstrap checkpoint. While it is untracked in canonical, `agent:check`/`project:check`/`handoff:check` fail with `LEDGER_CHANGE_WITHOUT_TASK` (measured, expected). |

Authorization class: FINAL_PRODUCT_COMPLETION_V1
PROJECT_VERDICT_EFFECT: PRESERVE

## Scope

Nightwatch source, tests, hardening rules/probes, schemas/configuration,
synthetic fixtures, OpenSpec/task continuity records, local bounded child
processes, and C-00 commits/fast-forward integration from the owned session
only. Task-by-task scope is frozen in
`openspec/changes/nightwatch-final-product-completion-v1/tasks.md` (phases
1-15) with its design decisions in `design.md` and the item census in
`audit.md`.

## Non-Goals

- Full redesigns of L/XL contained-DEV items (NW-AUD-016 full, 025 full, 026,
  037, 038): quarantined behind the DEV-lane precondition registry, not built.
- Changing owner scope, the production track (C-12/C-13/C-14/P4), Phase 6
  execution, or any authorization beyond OD-3.
- New reproduction executors (W10 NO-GO stands; the ouchan-only ceiling is
  stated, not expanded).
- Re-admitting ripple-api at its new SHA (owner-only, recurring).
- Paying down unused exports or dependency majors beyond a ratchet.

## Safety Constraints

- LOCAL / OFFLINE / SYNTHETIC only. No Alphaus DEV/NEXT/production contact,
  authenticated Alphaus runtime, credentials, customer data, database or
  cloud access, sibling writes, external publication, force push, or history
  rewrite.
- External contact limited to OD-3: GitHub Actions read/observe, C-00
  fast-forward pushes, one bounded paid provider proof run, one npm registry
  advisory query.
- One writing agent: ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY.
  Alphaus sibling repositories are read-only.
- Real findings remain in the owner-only local store; nothing customer-derived
  enters source, artifacts, or `.agent` files.

## Acceptance / completion criteria

1. Every `audit.md` census item carries exactly one recorded disposition
   (OD-1); no hidden backlog.
2. All 16 release conditions MET under D-129 with exact-head CI
   `EXECUTED_PASS` at the final substantive checkpoint S (OD-2).
3. Bin type-check BLOCKING with 0 exemptions; all 76 operator entry points on
   the shared CLI contract (OD-2).
4. Operator proof completed (synthetic hunt + one authorized bounded paid run
   or recorded `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, and the clean-clone
   install proof).
5. Ledger closure: every other active change archived with a recorded
   disposition; this change archived last in the documentary step.
6. Terminal topology: `main` only, no worktree, clean tree equal to
   `origin/main`; final 13-section completion report delivered.

## Declared Deletions

Planned tracked-file deletions are declared here before they happen (exact
paths, one per line, per the WORKSPACE_DECLARED_DELETIONS gate). Deletions
identified later (for example the M9 retirement of superseded `bin/*.mjs`
entry points under tasks 10.1) are appended to this section before the
deletion is made. Session-created files that are deleted again inside the
same session produce no net deletion and need no declaration.

NONE
