# Proposal — Review Operations, History Intelligence and Human-Filing Completion

## Why

The owner-local review store is durable and certified, and completely opaque.
Nothing can tell an operator how many reviews exist, how many are corrupt,
whether an interrupted publish left residue, or what a finding's review looked
like two dossier generations ago. The store is designed to grow forever, which
is the right default only if growth is observable.

Two smaller truths are also unfinished: the human filing report — the artifact
a person actually copies into Leslie or Pondr — has no production caller and
cannot express a stale or corrupt review at all; and the finding history that
recurrence reasons over carries a fabricated forty-zero source SHA and no
semantic identity.

## What changes

1. A deterministic, structurally read-only review-store inventory: counts,
   sizes, health, corruption, temporaries, and unknown entries reported
   categorically without echoing an unknown file's name.
2. A per-finding review history with a deterministic chronology, an explicit
   current generation, and preserved stale generations.
3. A repository-native `nightwatch-review` CLI and a Control Center
   review-operations view over both, with bounded rows and global counts.
4. The human filing report becomes review-state aware — CURRENT, STALE,
   CORRUPT, NO_REVIEW are four distinct renderings — and gains a real
   production-local generation path.
5. Historical identity propagation: the fabricated source SHA is replaced by
   the honest named absence the review binding already uses, and
   `IntelHistoryEntry` carries expectation and semantic-contract identity so
   recurrence and defect-class analysis rest on real evidence.
6. The vacuous regression-candidate lineage guard is repaired: a moved source
   lineage is now actually required.
7. The predecessor REPORT's implementation anchor is repaired and a mechanical
   rule stops a live-authority marker standing in for a historical anchor.

## What does not change

The review lifecycle. The store schema, identity or file-name shape. The
no-replace publication primitive. `verifyReviewCurrent` as the only binding
validator. The organizational-authority boundary. No retention or deletion
policy is invented, designed-in, or implemented; the inventory is read-only by
construction and the analysis in `design.md` is evidence for an owner
decision, not a decision.

## Impact

New: `src/core/reviewStore/{inventory,history}.ts`,
`src/controlCenter/{contracts,adapters}/reviewStore.ts`,
`src/controlCenter/authorities/{reviewStoreAuthority,filingReportAuthority}.ts`,
`bin/nightwatch-review.mjs`, a Control Center review-operations view.

Changed: `PrivateArtifactStore` gains one read-only enumeration primitive;
`findingReview/report.ts` gains review states; `findingIntel` history gains
two identity fields and a real lineage requirement; `reviewerAuthority` stops
fabricating a source SHA.
