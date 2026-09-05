# Task State

## Identity

Task ID: nightwatch-owner-local-review-persistence-v1
Phase: OWNER_LOCAL_REVIEW_PERSISTENCE_V1
Status: IN_PROGRESS
Starting SHA: 47c00883461fe689393d35e275b51eac0b78ed15
Last validated implementation SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e
Last substantive checkpoint SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e
Last documentation checkpoint SHA: 47c00883461fe689393d35e275b51eac0b78ed15
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-owner-local-review-pe-bef49826
Last checkpoint: campaign opened — repository truth verified, session worktree claimed, OpenSpec written
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 47c00883461fe689393d35e275b51eac0b78ed15
LAST_VALIDATED_IMPLEMENTATION_SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e
LAST_DOCUMENTATION_CHECKPOINT_SHA: 47c00883461fe689393d35e275b51eac0b78ed15
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_OWNER_LOCAL_REVIEW_PERSISTENCE_V1_STATUS: IN_PROGRESS

## Objective

Repair the predecessor campaign's contradictory terminal safety accounting;
make the certified local review lifecycle durable through an owner-local,
atomic, no-replace, binding-keyed review store; integrate a narrow local
write authority and a page-bounded read path into the Control Center
reviewer surface; propagate the expectation and semantic-contract
identities that already exist upstream; and certify durability, atomicity,
immutability, concurrency, crash consistency, corruption fail-closure,
privacy, scale and documentation truth. No production, NEXT, DEV, or live
C-12 contact.

## Current Milestone

M0 — predecessor safety-event truth.

## Completed Milestones

None yet.

## Work In Progress

Repository truth established at campaign open:

- `HEAD == origin/main == 47c0088`, canonical checkout clean, one worktree,
  `$GIT_COMMON_DIR/info/exclude` holds zero effective patterns (the
  predecessor's restoration held), `session:status` verdict PASS.
- Session worktree `session/nightwatch-owner-local-review-pe-bef49826`
  claimed as `sess-e49dcc5fc04a`; `npm ci` installed 7 packages.

Audit conclusions that shape the whole campaign are recorded in
`openspec/changes/nightwatch-owner-local-review-persistence-v1/audit.md`.
The two load-bearing ones:

- The atomic owner-local no-replace primitive ALREADY EXISTS as
  `PrivateArtifactStore.writeImmutableJson` (`link(2)`, `EEXIST` without
  replacement, `O_EXCL` temporary, `fsync` of file and directory, published
  byte verification, explicit `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED`
  rather than silent degradation to a replacing rename). The review store is
  a schema over it.
- The expectation and semantic-contract identities ALREADY EXIST upstream as
  `SemanticTriageEvidence.expectationId` and `.invariantDefinitionId` on
  `nightwatch.bug-dossier.private.v2`, already privacy-validated at
  construction. No dossier schema evolution is required; the work is
  propagation through `FindingsDossierMetadata` and `descriptorFor`, which
  currently hardcode `null`.

## Blockers

None.

## Exact Next Action

Execute M0: allocate the defect id, correct the predecessor REPORT safety
accounting, and add the narrow structural `agent:check` rule with its
regression.

## Files Changed

- `openspec/changes/nightwatch-owner-local-review-persistence-v1/**` (new)
- `.agent/tasks/nightwatch-owner-local-review-persistence-v1/**` (new)
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`

## Validation Ledger

- Campaign open: `session:status` PASS (`WORKSPACE_INTEGRITY_SATISFIED`).

## Decisions Made During This Task

- D-RP-1: the review store is built on the existing
  `PrivateArtifactStore` no-replace primitive rather than a new storage
  pattern, because that primitive is already stronger than the
  rename-based semantics the campaign brief describes as preferred.
- D-RP-2: review identity is the digest of the complete binding, so a
  regenerated artifact yields a distinct stored review and never overwrites
  a historical generation.
- D-RP-3: discovery uses a derived, recomputed file-name key rather than an
  index file. There is no index to corrupt, and one directory listing serves
  a whole page.
- D-RP-4: no dossier schema version changes. The identities exist in v2
  already; v1 keeps `null` and stays UNKNOWN.

## Discoveries

Recorded above and in the OpenSpec audit.

## Safety Events

None yet in this campaign.

## Deferred / Follow-Up

None yet.

## Resume Recipe

Read `AGENTS.md`, this `STATE.md`, then `PLAN.md`; run
`npm run session:status`; continue from `## Exact Next Action`.

## Completion Snapshot

Pending.
