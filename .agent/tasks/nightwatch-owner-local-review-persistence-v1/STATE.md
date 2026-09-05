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

M4 — store-boundary hardening.

## Completed Milestones

- M0: predecessor safety-event truth repaired. DEF-RP-1 allocated for the
  contradictory terminal accounting. The predecessor `REPORT.md` line now
  records the ONE workspace-integrity event its own `STATE.md` documents,
  classified `WORKSPACE_HARNESS` — harness `ScheduleWakeup` wrote patterns
  into the shared `$GIT_COMMON_DIR/info/exclude`, `agent:check` caught it,
  the stock template was restored — and states explicitly that no
  authorization boundary was crossed. The history is preserved, not
  rewritten, and the event is not inflated into production contact.
  `assertsNoSafetyEvents` / `findReportSafetyEventsClaim` in
  `bin/agent-continuity-protocol.mjs` add the structural rule; it fires
  only in the asymmetric direction that can be false and, run against all
  127 task directories, produced exactly one hit: the real defect.
- M1: review store core. `privateArtifacts` gained the CLOSED `subtree`
  union (`findings` | `reviews`) so a derived root is chosen from a table
  rather than from a caller-supplied path, is held to the same
  absolute / symlink-free / owner-only / outside-the-repository contract,
  and reports `rootClass: OUTSIDE_REPOSITORY` truthfully; plus
  `listJson` / `listTemporaries` / `removeTemporary`, where recovery
  recognizes only the publisher's pinned temporary name shape so an
  unknown file is structurally unreportable and unremovable.
  `verifyReceiptIntegrity` was extracted from `verifyReviewCurrent` so the
  store validates receipt identity through the canonical formula rather
  than a second copy, and so tampering is reported as tampering even when
  the receipt is also stale. `src/core/reviewStore/` adds only schema,
  identity and read policy over `writeImmutableJson`.
- M2: dossier identity propagation. `FindingsDossierMetadata` gained
  `expectationId` / `semanticContractId`, read from
  `semanticTriageEvidence.expectationId` / `.invariantDefinitionId`, and
  `descriptorFor` now passes them through instead of hardcoding `null`.
  No dossier schema changed: the identities already existed in v2.
  `projectedIdentity` applies BOTH the safe-id pattern and the canonical
  `containsPrivatePayloadShape` screen, because either alone is
  insufficient — the id pattern accepts `CUSTOMER_SENTINEL`, and the
  sentinel screen accepts a path-shaped value.
  `tests/helpers/reviewerCorpus.ts` is the permanent synthetic corpus,
  built from six named families so over-collapse is measurable rather
  than assumed.
- M3: Control Center integration. The reviewer surface projects real
  persisted review state, page-bounded by construction: the authority
  invokes `localReviewLookup` / `reviewIdentityFor` only for rows it
  selected, so cost scales with rows RENDERED, not findings held, and
  `reviewerAuthority` stays pure. One `reviewBindingFor` serves both the
  read and the write path, because two independent derivations would
  eventually disagree and the symptom would be every stored review
  silently going stale. The write route is OPT-IN: without an authority
  the server is exactly as read-only as before, answering POST with
  `405 Allow: GET, HEAD` for every path. The client never chooses its
  binding — it submits the identity it was shown and the server
  recomputes. `contentDigest` binds to the WHOLE parsed dossier, so an
  edit to an unprojected field still makes a review stale. The UI offers
  the five canonical decisions and nothing else, removes them once a
  decision is terminal, and refuses a response claiming organizational
  authority even if the server sent one.

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

Execute M4: add occurrence-complete store-boundary hardening rules, and
prove each one bites by mutating the artifact it guards.

## Files Changed

- `openspec/changes/nightwatch-owner-local-review-persistence-v1/**` (new)
- `.agent/tasks/nightwatch-owner-local-review-persistence-v1/**` (new)
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`

## Validation Ledger

- Campaign open: `session:status` PASS (`WORKSPACE_INTEGRITY_SATISFIED`).
- M0: `typecheck` PASS; `hardening:check` PASS; `agent:check` PASS (2 known
  warnings); `tests/unit/safetyEventAccounting.test.ts` 12/12 PASS. Before
  the repair the same rule reported
  `SAFETY_EVENT_ACCOUNTING_CONTRADICTION` at
  `.agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1/REPORT.md:23`.
- M1: `typecheck` PASS; `hardening:check` PASS;
  `tests/unit/reviewStore.test.ts` 54/54 PASS;
  `privateArtifactAtomic` + `findingReviewLifecycle` + `privateTriage` +
  `reviewerProjection` 67/67 PASS (no regression from the
  `verifyReceiptIntegrity` extraction).
- M2: `typecheck` PASS; `hardening:check` PASS;
  `tests/unit/dossierIdentityPropagation.test.ts` 24/24 PASS;
  `controlCenterFindingsAuthority` + `reviewerProjection` + `findingIntel`
  + `reviewStore` 105/105 PASS.
- M3 (backend): `typecheck` PASS; `hardening:check` PASS;
  `tests/unit/reviewerPersistence.test.ts` 30/30 PASS;
  FULL unit regression 4017 passed / 0 failed / 13 skipped
  (the same 13 skips the predecessor recorded).
- M3 (UI): `control-center:ui:typecheck` PASS; `control-center:ui:test`
  20/20 PASS (6 new review-persistence cases);
  `control-center:ui:build` PASS — 3 built files, no external references.

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
- D-RP-5: the safety-accounting rule compares the opening token of two
  declared claims and fires only when a REPORT asserts NONE over a STATE
  section that does not. It is deliberately asymmetric: absence of a claim
  is not a claim of absence, and only 17 of 127 REPORTs carry the field, so
  requiring one would be inventing history rather than checking it.
- D-RP-4: no dossier schema version changes. The identities exist in v2
  already; v1 keeps `null` and stays UNKNOWN.

## Discoveries

Recorded above and in the OpenSpec audit. Two from M1 worth carrying:

- The pre-publish validation earned its place immediately: the store
  validates the exact bytes it is about to write, in the shape the reader
  will see, and that caught a wrong key ordering in the envelope-key
  constant before any file was created. A store that can write what it
  cannot read back has no corruption semantics.
- `../../escape` is a VALID finding id — the lifecycle's id vocabulary
  permits dots and slashes — and it still cannot traverse, because the id
  never reaches the filesystem as a path: the discovery key is a digest, so
  every file name the store produces is hex. Narrowing the id vocabulary
  here would have been a change to review semantics this cone does not own.
  The test now asserts that stronger property, and a companion test proves
  the underlying publisher would refuse a hand-built traversal name anyway,
  so the safety does not rest on the digest alone.

## Safety Events

None yet in this campaign.

## Measured identity-propagation effect (M2)

Permanent synthetic corpus, 300 findings, six families, deterministic
seed. Identical corpus with and without the identities, so any difference
is attributable to the carry and to nothing else.

```
                        before   after
defect-class members         0     150
duplicate suggestions      146     146
UNKNOWN relationships        1       1
RELATED_FINDING            225     151
SHARED_DEFECT_CLASS          0      74
PROBABLE_DUPLICATE          74      37
EXACT_SAME_FINDING           0      37
```

Read carefully, this is refinement rather than inflation. Duplicate
suggestions — the strongest and most consequential claim the surface
makes — are UNCHANGED at 146. UNKNOWN is unchanged, because a finding
with no identity gains nothing from other findings having one. The two
movements are both reclassifications of pairs the classifier already
related: 74 `RELATED_FINDING` became the more specific
`SHARED_DEFECT_CLASS`, and 37 `PROBABLE_DUPLICATE` became
`EXACT_SAME_FINDING` where the expectation AND the fingerprint agree.
Defect classes went from impossible to 150 members, because a class
requires a shared semantic invariant and there was no identity to share.

No classifier rule was changed to produce any of this.

The most valuable single result is in the counterevidence direction. For
a pair sharing a fingerprint but carrying different expectations, the
classifier could previously only record `MISSING_COMPARISON_INPUT` — "I
do not know". With the identities it records `DIFFERENT_EXPECTATION` and
`DIFFERENT_SEMANTIC_CONTRACT` — "these genuinely differ". Propagation
made the surface more careful, not less.

## Deferred / Follow-Up

None yet.

## Resume Recipe

Read `AGENTS.md`, this `STATE.md`, then `PLAN.md`; run
`npm run session:status`; continue from `## Exact Next Action`.

## Completion Snapshot

Pending.
