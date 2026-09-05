# Task Spec — Review Operations, History Intelligence & Human-Filing Completion

Frozen intent.

Task ID: nightwatch-review-operations-history-filing-v1
Phase: REVIEW_OPERATIONS_HISTORY_FILING_V1

## Objective

1. Make the owner-local review store operationally visible: a deterministic,
   structurally read-only inventory of counts, sizes, integrity, health,
   temporaries and unrecognized entries.
2. Expose per-finding review history across artifact generations, with a
   deterministic chronology and an explicitly identified current generation.
3. Make the human filing report review-state aware — CURRENT, STALE, CORRUPT
   and NO_REVIEW render distinctly — and give it a production-local
   generation path.
4. Propagate real historical identity into finding history: the honest source
   identity in place of a fabricated one, plus expectation and
   semantic-contract identity, and repair the vacuous regression-candidate
   lineage guard.
5. Repair the predecessor terminal report's implementation anchor and make a
   live-authority marker standing in for a historical anchor mechanically
   impossible.
6. Certify determinism, order-independence, concurrency, corruption,
   privacy, scale beyond 10k, browser workflow and documentation truth.

## Non-goals

Redesigning the review store, its schema, its identity or its publication
primitive. Any retention, archival, pruning or deletion policy. Any derived
index unless measurement proves directory scans inadequate. Any
organizational authority for a local decision. Any external filing path.

## Authorization class

REVIEW_OPERATIONS_HISTORY_FILING_V1. Repository-local and offline. No
production, NEXT or DEV contact; no live C-12/C-13/C-14; no C-08b; no C-07
DEV; no Slack/Leslie/Pondr/Notion; no external filing; no credentials,
deployments or sibling writes; no force push or history rewrite; no
destructive review-store operation of any kind.

## Declared Deletions

None.
