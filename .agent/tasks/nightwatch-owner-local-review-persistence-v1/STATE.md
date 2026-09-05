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

M8 — documentation and certification.

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
- M4: store-boundary hardening. `checkReviewStoreBoundary()` in
  `bin/hardening-check.mjs` enforces: the review cone holds no fs, network
  or child-process authority; publication is OCCURRENCE-COMPLETE (every
  `this.artifacts.<method>` call is enumerated against an allowlist rather
  than one positive `includes`); the canonical validators are INVOKED and
  not merely imported; no second copy of the receipt-digest or staleness
  logic exists; validation precedes publication and no raceable
  read-then-write check exists; identity is the whole binding and file
  names are hex-only; the error vocabulary is total in BOTH directions;
  the derived root is held outside the repository and the subtree union
  stays closed; recovery cannot touch an unknown file; no review artifact
  is Git-tracked; the write authority's import graph is confined; nothing
  in the cone references an external destination; the read path stays pure
  and per-row; and the binding builder is shared, not duplicated.
  21 mutations of the REAL guarded files, all caught.
- M5: durability. `tests/unit/reviewStoreDurability.test.ts` — seeded
  property suite (40 seeds; receipt determinism, per-field staleness over
  every one of the eight bound fields, terminal-receipt immutability,
  authority immutability, a ~90-case corruption corpus, unknown-schema
  refusal, source-artifact immutability, and a positive-totality check on
  the store's own method surface); 72 injected crash scenarios (24 fs
  injection points x EIO/ENOSPC/EACCES) proving the canonical file is
  always absent-or-complete, never partial and never zero-byte, with all
  residue an identifiable temporary; and a concurrency matrix (2/4/8/16
  competing writers for one binding, 12 readers interleaved into the
  publish path, 25 non-contending bindings, readers during recovery).
  `bin/review-mutation-campaign.mjs` (`npm run mutation:review`) is the
  behavioural campaign: 31 introduced, 29 detected, 2 survived — both
  declared, one CONTROL (comment-only) and one EQUIVALENT (`12 * 2` for
  `24`), restore drift NONE.
- M6: scale. `npm run review:scale` measures the served reviewer page at
  1k/5k/10k against 0/10/50/100% reviewed stores, one fresh OS process per
  cell. The FIRST run found a real defect and the fix is the milestone's
  main product — see `## Measured persistence scale envelope (M6)`.
- M7: browser and restart. `tests/browser/reviewPersistence.browser.ts`
  drives the built UI over the real loopback server: open reviewer, see
  an honest absence, submit a decision, confirm it reached the owner-local
  store, reload, navigate away and back, RESTART the server over the same
  store, then regenerate the artifact and watch the decision go visibly
  STALE without being deleted — followed by a second generation that
  leaves the first intact. Plus 30 consecutive decisions over 30 distinct
  findings, each re-read from the server after a reload, with the store
  asserted to grow by exactly one per pass. Every request is asserted to
  stay on 127.0.0.1 and the page is asserted never to render
  LESLIE_GENUINE or PONDR_APPROVED.
  This milestone found the campaign's most serious defect — see
  `## Discoveries`.

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

Execute M8: reconcile durable documentation and OpenSpec, write the
campaign REPORT, then run the certification set — full regression twice on
the committed tree, `gate:local`, and `gate:clean` with a proven fresh
install.

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
- M4: `hardening:check` PASS; `typecheck` PASS;
  `tests/unit/reviewStoreHardening.test.ts` 23/23 PASS — 21 mutations
  introduced, 21 caught, 0 survivors, every mutated file byte-identical
  afterwards; `hardeningRuleParity` PASS (no dead rule).
- M5: `typecheck` PASS; `hardening:check` PASS; `agent:check` PASS;
  `tests/unit/reviewStoreDurability.test.ts` 23/23 PASS;
  `npm run mutation:review` PASS (31/29/2, restore drift NONE);
  full unit regression 4072 passed / 0 failed / 13 skipped, TWICE
  consecutively.
- M6: `typecheck` PASS; `npm run review:scale` 12/12 cells measured, twice
  (before and after the fix); `npm run mutation:review` PASS after adding
  the two guards the fix introduced — 33 introduced, 31 detected, 2
  survived (both declared), restore drift NONE.
- M7: `typecheck` PASS; `control-center:ui:browser` 4/4 PASS (the two new
  persistence workflows plus the two pre-existing browser suites), with
  30/30 endurance passes.
  ONE unattributed one-off: an earlier full-suite run in this milestone
  reported `1 failed` without the failing test being captured. It did not
  reproduce in the two subsequent identical full runs, and the five new
  suites were then run 5x (152/152 each) and the mutation bite harness 3x
  (23/23 each) with no failure. It is recorded rather than dismissed, and
  the certification runs in M8 are the decisive evidence.

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

Recorded above and in the OpenSpec audit.

From M7, the defect the whole campaign most needed to find, and which no
unit test could have found:

- `createReviewDecisionHandler` read the campaign snapshot RAW, while the
  reviewer read path takes it through validation with a fallback to an
  unavailable snapshot. Both halves were individually correct. Together
  they could derive a DIFFERENT campaign id for the very same state — and
  since the campaign id is part of the review binding, every write would
  then be refused as `BINDING_MISMATCH`, with the surface offering the
  reviewer no way to tell that the refusal came from the server
  disagreeing with itself. The browser workflow hit it on its first run.
  The fix is `createControlCenterServices`, which builds the collector and
  the write handler over ONE snapshot seam; deriving the binding context
  twice is now structurally impossible rather than merely discouraged.

From M6, a second one of the same family:

- A listing decides which files a read opens, and nothing checked that
  what was found BELONGED to the finding asked for. A wrong or forged
  listing could surface another finding's perfectly valid review under
  this finding's name. `read()` now refuses that. The listing was one line
  away from being an authority.

From M4, the mutation harness earned its place twice before it was even
finished:

- M-05 (reintroduce a raceable read-then-write check) fired the WRONG
  rule. The `putDecision` body was extracted by slicing to the next
  occurrence of `fileNamesFor(`, so a mutation that inserted
  `this.fileNamesFor(...)` inside `putDecision` truncated the body under
  inspection and the check reported "publishes before validating" instead.
  The extraction is now anchored on the next method SIGNATURE. A rule that
  reports the wrong violation is a rule that will mislead the next reader.
- M-20 SURVIVED, correctly: it only added an unused import, which derives
  nothing. The rule was widened to refuse the import as well — the visible
  precursor is one line from the act — and the mutation was split so both
  are proven caught.

Two from M1 worth carrying:

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

## Measured persistence scale envelope (M6)

Served reviewer page (authority + projection, page limit 50), one fresh OS
process per cell. Baseline is the same page WITHOUT the store wired.

FIRST RUN — the defect:

```
 corpus  reviewed  store files   page baseline -> served   page lookup
  1000       100%        1000        231.7 ms -> 254.4 ms      30.44 ms
  5000       100%        5000        193.5 ms -> 392.0 ms     146.96 ms
 10000        50%        5000        400.0 ms -> 534.4 ms     144.50 ms
 10000       100%       10000        391.0 ms -> 702.6 ms     325.46 ms
```

The lookup cost grew with the STORE, not with the page: `fileNamesFor`
listed the whole store directory once PER FINDING, so a 50-row page over
a 10,000-review store scanned half a million directory entries. This is
exactly the shape the predecessor's page-scoping removed from the
intelligence path, reintroduced through persistence — and the design note
in `design.md` claimed "one directory listing serves a whole page", which
the implementation did not do. The measurement is what caught it; no
test would have, because every functional assertion still passed.

The fix is `ReviewStore.snapshotListing()`: one request-scoped directory
read, grouped by discovery key, taken once in `localReviewLookup`.

SECOND RUN — after the fix:

```
 corpus  reviewed  store files  store bytes   page baseline -> served   lookup   RSS
  1000        0%           0        0.0 KiB        251.4 ms -> 246.5 ms  0.10 ms  76.0 MiB
  1000       10%         100      160.8 KiB        239.4 ms -> 221.2 ms  0.68 ms  76.6 MiB
  1000       50%         500      804.2 KiB        253.5 ms -> 228.8 ms  1.62 ms  77.7 MiB
  1000      100%        1000     1608.4 KiB        226.6 ms -> 229.4 ms  3.72 ms  78.9 MiB
  5000        0%           0        0.0 KiB        210.4 ms -> 195.7 ms  0.10 ms  83.9 MiB
  5000       10%         500      804.2 KiB        212.3 ms -> 216.9 ms  2.74 ms  88.3 MiB
  5000       50%        2500     4021.0 KiB        203.5 ms -> 186.8 ms  2.12 ms  91.6 MiB
  5000      100%        5000     8042.0 KiB        187.8 ms -> 213.5 ms  3.20 ms  94.0 MiB
 10000        0%           0        0.0 KiB        424.4 ms -> 406.3 ms  0.09 ms 107.0 MiB
 10000       10%        1000     1608.4 KiB        400.2 ms -> 387.9 ms  0.76 ms 111.1 MiB
 10000       50%        5000     8042.0 KiB        428.5 ms -> 396.2 ms  3.17 ms 110.5 MiB
 10000      100%       10000    16084.0 KiB        393.6 ms -> 402.0 ms  3.45 ms 116.6 MiB
```

At the worst cell — 10,000 findings, 10,000 stored reviews, every row on
the page reviewed — the page lookup fell from 325.46 ms to 3.45 ms, and
the served page from 702.6 ms to 402.0 ms against a 393.6 ms baseline:
about 2% overhead for persistence, where it had been 80%.

Two cautions on reading these numbers. The baseline page here (~390-430 ms
at 10k) is NOT comparable to the predecessor's 359.5 ms worst-case: this
is a different corpus, built from six identity families that deliberately
produce more defect-class work, on a differently loaded machine. What IS
comparable within this table is baseline against served, measured in the
same process on the same corpus. And the durable regression guard is not a
latency bound — a latency bound on a shared machine is a flake generator.
It is a deterministic call count: `tests/unit/reviewStoreDurability.test.ts`
asserts a 40-row page costs exactly ONE directory read, with a control
proving the same page costs 8 reads without the listing.

## Deferred / Follow-Up

- One unattributed full-suite failure observed during M5 (see the
  validation ledger). Unreproduced across two identical full runs and
  targeted repetition. If it recurs at M8 certification it must be
  captured and attributed before COMPLETE is claimed.

## Resume Recipe

Read `AGENTS.md`, this `STATE.md`, then `PLAN.md`; run
`npm run session:status`; continue from `## Exact Next Action`.

## Completion Snapshot

Pending.
