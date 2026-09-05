# Task Spec — Owner-Local Review Persistence & Dossier Identity Enrichment

Frozen intent.

Task ID: nightwatch-owner-local-review-persistence-v1
Phase: OWNER_LOCAL_REVIEW_PERSISTENCE_V1

## Objective

1. Repair the predecessor campaign's contradictory terminal safety
   accounting and make that contradiction structurally impossible.
2. Make the certified local review lifecycle durable through an owner-local,
   private, atomic, no-replace review store keyed by review binding.
3. Integrate a narrow local review write authority and a page-bounded read
   path into the Control Center reviewer surface.
4. Propagate the expectation and semantic-contract identities that already
   exist upstream into the dossier projection and the finding intelligence,
   without deriving, inferring or loosening anything.
5. Certify durability, atomicity, immutability, concurrency, crash
   consistency, corruption fail-closure, privacy, scale and documentation
   truth.

## Non-goals

Redesigning the review lifecycle. Rewriting the pairwise relationship
classifier for asymptotics. Introducing a database. Automatic deletion of
stale review history. Any organizational authority for a local decision.

## Authorization class

OWNER_LOCAL_REVIEW_PERSISTENCE_V1. Repository-local and offline. No
production, NEXT or DEV contact; no live C-12/C-13/C-14; no C-08b; no
Slack/Leslie/Pondr/Notion; no external filing; no credentials, deployments
or sibling writes; no force push or history rewrite.

## Declared Deletions

None.
