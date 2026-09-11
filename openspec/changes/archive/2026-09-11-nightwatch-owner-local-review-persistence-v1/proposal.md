# Proposal — owner-local review persistence & dossier identity enrichment

Repair the predecessor's terminal safety accounting first. One campaign
cannot hold two committed answers to "did a safety event occur". The
`REPORT.md` claim of `Safety events: NONE` is corrected to the event its
own `STATE.md` records, classified as a workspace/harness integrity event
detected by the repository's guard and repaired before closure, with zero
unauthorized repository, product or environment action. A narrow structural
check makes the contradiction unrepeatable: a task whose `STATE.md` records
safety events may not have a `REPORT.md` declaring none. This is a
cross-file field comparison, not prose analysis.

Make local review durable. The review lifecycle is certified but ephemeral:
a decision exists only for the life of the process that made it. This
change adds an owner-local review store built on the repository's existing
atomic no-replace publication primitive, so a decision survives restart,
cannot be overwritten, cannot be silently edited, and cannot outlive the
artifacts it bound to.

Persist the minimum. The stored envelope carries a store schema version,
the review identity, the existing `FindingReviewReceipt` and
`FindingReviewRecord` verbatim, and the store metadata needed to read it
back. No raw dossier, finding or handoff content is duplicated into the
store: the binding already carries digests, and copying the artifacts would
create a second privacy surface for no gain.

Key by binding, not by finding. A finding regenerated against new source
produces a new binding and therefore a new review identity, so a second
generation never overwrites the first and stale history stays auditable.
Deletion is never automatic.

Read fail-closed. Every read revalidates schema, envelope, record, receipt
identity, binding and authority through the canonical
`verifyReviewCurrent`, never through a weaker copy in the persistence
layer. The read path answers with exactly one of `NO_REVIEW`, `CURRENT`,
`STALE` or `CORRUPT`; corrupt or unknown-schema bytes can never become
`CURRENT`, and a stale receipt is never rendered as a live decision.

Write through a narrow local authority. The Control Center gains one
review-decision route under the existing loopback/origin/CSRF protections.
It accepts a validated decision enum, a bounded sentinel-scanned rationale
and the exact current binding; it can write review-store artifacts and
nothing else. It gains no authority to edit findings, dossiers, source or
config, and no path to external publication.

Propagate the identity that already exists. `FindingsDossierMetadata` and
the reviewer descriptor carry `expectationId` and `semanticContractId`
forward from `SemanticTriageEvidence` on v2 dossiers. Nothing is derived,
hashed from prose, or inferred: a v1 dossier, or a v2 dossier without
semantic triage evidence, keeps `null` and the surface keeps reporting
UNKNOWN. Because differing identities are already counterevidence in the
classifier, propagation must be measured for over-collapse as well as for
improvement, on a permanent synthetic corpus.

Preserve the measured performance envelope. The reviewer read path is
page-scoped; persisted-review lookup for a page must be bounded by the page,
not by the store. Measured at 1k/5k/10k against 0%/10%/50%/100% reviewed
corpora, before and after.
