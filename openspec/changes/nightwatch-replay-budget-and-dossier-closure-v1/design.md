# Design — Replay Budget and Dossier Closure

## Problem

The current bounded Phase 7 campaign uses all three allowed journey contexts
for collection before reproduction is considered. A fresh product candidate can
therefore be admitted correctly yet fail reproduction reservation with
BUDGET_EXHAUSTED before replay executor entry.

## Design requirement

The fix must preserve boundedness while making replay capacity intentional.

The implementation should prefer the smallest deterministic model that can be
proven safe. Candidate designs include:

- a dedicated reproduction reserve;
- separate collection and reproduction sub-budgets;
- deterministic transfer of explicitly unused collection capacity;
- a campaign-level reserve committed at prepare time.

The implementation MUST NOT simply add an unbounded retry path or bypass the
existing budget authority.

## Required invariants

1. Total contact authority is explicit and finite.
2. At most the authorized number of replay executions can occur.
3. Reproduction budget is consumed only by fresh current admitted candidates.
4. Historical/stale candidates cannot spend reserve.
5. Incomplete capture/framework outcomes cannot become replay authority.
6. Duplicate candidate/cluster identities cannot multiply replay allowance.
7. Checkpoint/resume cannot double-spend reserve.
8. Source/version drift invalidates stale prepared replay authority.
9. Interruption before executor entry preserves exact remaining budget.
10. Interruption after executor entry cannot cause duplicate execution on resume.
11. Zero-candidate campaigns perform zero reproduction contact.
12. Budget exhaustion remains a truthful terminal condition.
13. Minimize/dossier stages remain downstream of successful admitted replay.
14. Safety/privacy/containment rules remain unchanged.

## DEV confirmation

After local validation, use a newly prepared current-source campaign and
owner-managed auth. No predecessor checkpoint or historical finding may be
resumed. Run the minimum real sample needed to observe one fresh admitted
candidate and prove the new budget can actually enter replay.
