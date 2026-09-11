# Design — Replay Budget and Dossier Closure

## Problem

The current bounded Phase 7 campaign uses all three allowed journey contexts
for collection before reproduction is considered. A fresh product candidate can
therefore be admitted correctly yet fail reproduction reservation with
BUDGET_EXHAUSTED before replay executor entry.

## Design requirement

The fix must preserve boundedness while making replay capacity intentional.

The implementation MUST NOT simply add an unbounded retry path, raise the
collection limits, or bypass the existing budget authority.

## Chosen architecture

Use a dedicated, campaign-level replay reservation ledger without adding a new
policy dimension or increasing `maxTotalBrowserContexts`.

- The existing real profile's `maxPromotedClusters` is the finite maximum
  number of browser replay reservations. For that profile, collection browser
  reservations are capped at `maxTotalBrowserContexts -
  maxPromotedClusters`; the protected slot is never silently consumed by
  JOURNEY or EXPLORATION collection work. Synthetic fixture profiles keep their
  existing resource model because their executors do not contact DEV.
- A replay reservation consumes `replays`, any explicitly estimated
  `apiExecutions` and `totalActions`, and one aggregate `browserContexts` slot
  when the replay creates a browser context. Replay does not consume the
  collection-only `journeyContexts` or `explorationContexts` sub-budgets. If
  an adapter reports a category context estimate, the normalized physical
  browser requirement is the maximum of the aggregate/category estimates, not
  their sum. This is the deterministic rule that prevents a browser replay
  from being rejected because the collection category counter is full.
- Each reservation is persisted by deterministic campaign/cluster identity
  with its normalized requirements and `RESERVED`/`CONSUMED` state. Reusing a
  `RESERVED` record after a checkpoint does not charge again. A
  `REPLAY_REQUIRED`/consumed reservation is terminal on resume and is never
  re-entered, so an interruption after executor entry cannot duplicate
  contact.
- Eligibility remains upstream of reservation: only a current, non-unknown,
  non-reproduced product candidate bound to the manifest source changeset can
  reserve real replay capacity. Auth, capture/framework, environment,
  known-defect, stale, incomplete, and duplicate candidates are rejected
  before the replay callback.

This is smaller and safer than arbitrary limit growth, broad sub-budget
reallocation, or transfer heuristics: the existing aggregate browser and
replay ceilings remain authoritative, while the one missing protected
collection/replay boundary becomes durable and inspectable.

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
