# Owner-Local Review Persistence & Dossier Identity Enrichment — Report

Status: COMPLETE

- Task ID: nightwatch-owner-local-review-persistence-v1
- Starting SHA: `47c00883461fe689393d35e275b51eac0b78ed15`
- Implementation anchor: DISCOVER_FROM_GIT
- Live HEAD: DISCOVER_FROM_GIT
- origin/main: DISCOVER_FROM_GIT

## Objective

Repair the predecessor campaign's contradictory terminal safety accounting;
make the certified local review lifecycle durable through an owner-local,
atomic, no-replace, binding-keyed review store; integrate a narrow local write
authority and a page-bounded read path into the Control Center reviewer
surface; propagate the expectation and semantic-contract identities that
already exist upstream; and certify durability, atomicity, immutability,
concurrency, crash consistency, corruption fail-closure, privacy, scale and
documentation truth.

## Predecessor truth repair (DEF-RP-1)

The reviewer-surface campaign closed with two committed answers to one
question. Its `STATE.md` recorded, under `## Safety Events`, a
workspace-integrity event: an agent-harness `ScheduleWakeup` call wrote ten
`**/.claude/...` patterns into the SHARED `$GIT_COMMON_DIR/info/exclude`,
which C-00 requires to hold zero effective patterns. `agent:check` failed
closed with ten `WORKSPACE_EXCLUDE_DRIFT` errors; the stock comment-only git
template was restored and the stale lock removed. Its `REPORT.md` — the
campaign's terminal accounting — said `Safety events: NONE`.

`agent:check` returned PASS on both documents, because no rule compared them.

The repair corrects the REPORT to record the event, classified as a
workspace/harness integrity event detected by the repository's own guard and
repaired before closure, and states explicitly that no authorization boundary
was crossed. The history is preserved rather than rewritten, and the event is
not inflated into production contact.

The rule added is a field comparison, not prose analysis. Both documents
already follow one convention across the whole recorded history — the claim
opens with a NONE token, or it records events — so the rule reads the opening
token of each and fires only in the asymmetric direction that can be false: a
REPORT asserting NONE over a STATE section that does not. Run against all 127
task directories it produced exactly one hit, the real defect. Absence of a
claim is not treated as a claim of absence, because only 17 of 127 REPORTs
carry the field at all.

## Review store architecture

- **Location model.** `$NIGHTWATCH_REVIEW_STORE_DIR`, defaulting to
  `$HOME/.nightwatch/reviews`. Absolute, symlink-free at every component,
  owner-only `0700`, refused if it resolves inside the repository or the
  sibling workspace. `PrivateArtifactStore` takes a CLOSED `subtree` union
  (`'findings' | 'reviews'`), so callers name a subtree and never a path, and
  a derived root reports `rootClass: OUTSIDE_REPOSITORY` truthfully.
- **Schema.** `nightwatch.review-store.v1`: store schema version, review
  identity, finding id, the `FindingReviewReceipt` and `FindingReviewRecord`
  verbatim, and `storedAt`. No raw dossier, finding or handoff content — the
  binding carries digests, and duplicating the artifacts would add a privacy
  surface for no gain.
- **Identity and key.** `sha256(stableJsonSorted(binding))[0..24]`; file name
  `review.<findingIdDigest12>.<reviewIdentity24>.json`. Keyed by the COMPLETE
  binding, never the finding id.
- **Atomicity.** `PrivateArtifactStore.writeImmutableJson`: `O_EXCL`
  temporary, `fsync`, publication by `link(2)`, published-byte verification,
  temporary unlink, directory `fsync`. The store opens no file itself.
- **No-replace semantics.** `link(2)` is atomic and fails `EEXIST` without
  replacing; a filesystem that cannot do it raises
  `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` rather than degrading to a
  replacing rename. It is also the concurrency arbiter, so there is no
  read-then-write existence check anywhere in the store to race.
- **Read semantics.** `NO_REVIEW | CURRENT | STALE | CORRUPT`, keyed by
  FINDING (a binding-keyed read would report NO_REVIEW for exactly the case
  that must report STALE). Discovery uses one request-scoped directory
  listing; the listing decides which files are opened and nothing about
  whether what is found is valid.
- **Stale semantics.** `verifyReviewCurrent` is the ONLY binding validator.
  Any of the eight bound fields changing yields STALE, and a STALE review is
  displayed as UNKNOWN rather than as a live decision.
- **Corruption semantics.** A closed categorical vocabulary
  (`REVIEW_STORE_CORRUPT`, `_VERSION_UNSUPPORTED`, `_BINDING_INVALID`,
  `_RECEIPT_TAMPERED`, `_IDENTITY_MISMATCH`, `_AUTHORITY_INVALID`,
  `_STATE_INVALID`, `_RECORD_RECEIPT_MISMATCH`, `_ALREADY_DECIDED`,
  `_NO_REPLACE_UNSUPPORTED`), total in both directions by hardening. Corrupt
  or unknown-schema bytes never become CURRENT, and a corrupt generation is
  reported rather than hidden by a valid sibling.
- **Recovery semantics.** Interrupted publishes leave only temporaries in the
  publisher's pinned name shape. Recovery reports them, and removes only
  those — an unknown file is structurally unreportable and unremovable.
  Nothing is ever deleted because artifacts changed.

## Reviewer integration

**Write.** `POST /api/v1/reviewer/decision`, existing ONLY when the server is
constructed with a review authority; without one the server answers
`405 Allow: GET, HEAD` for every path, exactly as before. The client submits
the review identity the surface showed it and the server REBUILDS the binding
from current state, refusing a mismatch. Guards in order: loopback host,
Origin, POST only, a custom header no cross-origin form can set without a
preflight Origin already governs, no query string, `application/json` only,
and a body bounded on bytes actually received. Timestamps are taken
server-side.

**Read.** Page-bounded by construction: the authority invokes the lookup only
for rows it selected, so cost scales with rows rendered rather than findings
held, and `reviewerAuthority` stays free of persistence authority. Unreviewed
findings report `NO_LOCAL_REVIEW`; with no store at all they report
`NO_LOCAL_REVIEW_STORE`; stale reviews report `LOCAL_REVIEW_STALE` and project
as UNKNOWN.

**UI.** The five canonical decisions and nothing else, a bounded rationale, no
control at all where no store is configured, and no controls once a decision
is terminal — replaced by the receipt. The client refuses a response claiming
organizational authority.

## Dossier identity

`SemanticTriageEvidence.expectationId` and `.invariantDefinitionId` are
carried through `FindingsDossierMetadata` and `descriptorFor`. No dossier
schema changed: v2 carries the identity, v1 does not and keeps `null`, and
`null` still means UNKNOWN. `projectedIdentity` applies both the safe-id
pattern and the canonical sentinel screen — either alone is insufficient — and
can only drop an identity.

Measured on a permanent 300-finding synthetic corpus of six named families,
identical with and without the identities:

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

Refinement, not inflation: the strongest claim is unchanged, and the movements
are pairs the classifier already related being classified more specifically.
No classifier rule changed. The most valuable effect is in the counterevidence
direction — a pair sharing a fingerprint but carrying different expectations
moved from `MISSING_COMPARISON_INPUT` ("I do not know") to
`DIFFERENT_EXPECTATION` + `DIFFERENT_SEMANTIC_CONTRACT` ("these differ").

## Performance

Served reviewer page (limit 50), one fresh OS process per cell. Full table in
`STATE.md` `## Measured persistence scale envelope (M6)`.

The first measurement found a real regression: persisted-review lookup listed
the store directory once PER FINDING, so a fifty-row page over a 10,000-review
store scanned half a million entries.

```
 corpus  reviewed   lookup before   lookup after   served page after (baseline)
  1000      100%        30.44 ms        3.72 ms      229.4 ms (226.6 ms)
  5000      100%       146.96 ms        3.20 ms      213.5 ms (187.8 ms)
 10000       50%       144.50 ms        3.17 ms      396.2 ms (428.5 ms)
 10000      100%       325.46 ms        3.45 ms      402.0 ms (393.6 ms)
```

Store size at 10k/100%: 10,000 files, 16,084.0 KiB. Peak RSS 116.6 MiB. At the
worst cell persistence costs about 2% of the served page, where it had cost
80%. The durable guard is a deterministic call count — a 40-row page must cost
exactly ONE directory read — not a latency bound.

## Concurrency

- 2, 4, 8 and 16 writers racing one binding: exactly one winner each time,
  every loser receiving `REVIEW_STORE_ALREADY_DECIDED`, the winner's bytes
  intact and valid.
- 12 readers interleaved directly into the publish path (before and after the
  `link(2)`): only `CURRENT` and `NO_REVIEW` ever observed — never a partial
  file, never CORRUPT.
- 25 distinct bindings written concurrently: no contention, 25 distinct
  identities, all readable as CURRENT.
- Readers during recovery of 6 temporaries: valid state throughout.

## Crash testing

72 injected failures: 24 fs injection points spanning the whole publish path
(directory preparation, temporary creation, write, fsync, close, chmod, stat,
`link`, verification, unlink, directory fsync, final verification) x `EIO`,
`ENOSPC`, `EACCES`.

After each, a fresh store — as a restarted process would see it — found the
canonical file either ABSENT or COMPLETE AND VALID. Never partial, never
zero-byte, never malformed. All residue was an identifiable temporary, and
recovery removed only those. The harness asserts faults actually fired.

Plus two targeted cases: a crash before publication leaves nothing canonical
and the decision can be made again; a crash after publication but before the
caller learns of it leaves the decision made and refuses a second one.

## Mutation

Two campaigns, deliberately different in kind.

Structural (`tests/unit/reviewStoreHardening.test.ts`) — mutate the real
guarded file, run the real `hardening:check`, assert the specific failure:

```
introduced:            21
detected:              21
equivalent/controls:    0
survived:               0
restore drift:       NONE (every mutated file byte-identical afterwards)
```

Behavioural (`npm run mutation:review`) — mutate real source, run the suites
that should have an opinion:

```
introduced:            33
detected:              31
equivalent/controls:    2 (B-30 comment-only CONTROL; B-31 `12 * 2` for `24` EQUIVALENT)
survived:               2 (both declared)
unexplained survivors:  0
restore drift:       NONE
```

Four behavioural survivors were found and CLOSED rather than explained away,
each a real coverage gap: the identity privacy screen was unreachable through
the authority path and is now tested at its own boundary; nothing asserted the
reviewer authority honours its page limit; the write authority's decision
check was distinguishable only by ORDER, not by result; and the terminal-state
check was masked by accepting "one of two" corruption codes.

## Property tests

`tests/unit/reviewStoreDurability.test.ts`, 40 fixed seeds derived from a
deterministic mixer — never `Math.random`.

Properties: identical inputs give an identical receipt AND identical published
bytes; a different rationale or instant gives a different receipt but the SAME
identity, so both collide on one file and only one can be stored; each of the
eight bound fields independently causes staleness (10 seeds each); a terminal
receipt refuses all five decisions (20 seeds); a review never acquires
organizational authority under any edit (15 seeds x 5 claimed values); a
~90-case corruption corpus never reads CURRENT; no unknown schema reads
CURRENT; a write never mutates a source artifact; the store's method surface
is asserted positively.

## Browser

`npm run control-center:ui:browser`: **4 passed / 0 failed**, comprising the
two pre-existing suites and two new persistence workflows.

- Full workflow: open reviewer, observe honest absence, submit a decision,
  confirm it reached the owner-local store, reload, navigate away and back,
  RESTART the server over the same store, regenerate the artifact and observe
  the decision go visibly STALE without deletion, then record a second
  generation that leaves the first intact.
- Endurance: **30 consecutive decisions** over 30 distinct findings, each
  re-read from the server after a reload, with the store asserted to grow by
  exactly one per pass.

Every request asserted to stay on 127.0.0.1; the page asserted never to render
`LESLIE_GENUINE` or `PONDR_APPROVED`.

## Server restart proof

Covered in both lanes. Server A writes a decision and stops; server B, a new
process-level server over the same store, reads it as `CURRENT`; server C over
a regenerated artifact reads the same stored receipt as `STALE` while the file
remains present.

## Full regression

See `## Validation Ledger` in `STATE.md` for the run-by-run record, including
the two failures that were attributed rather than retried away.

## Clean gate

See `## Validation Ledger` in `STATE.md`.

## CI

Not inspected in this campaign. `FINAL_CI_AUTHORITY` remains
`GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT`; no run was triggered and no
meaningless commit was made to provoke one.

## Safety accounting

```
production:               NO CONTACT
NEXT:                     NO CONTACT
DEV:                      NO CONTACT

C-12 live:                NOT EXECUTED
C-13:                     NOT STARTED
C-14:                     NOT STARTED
C-08b:                    NOT EXECUTED
C-07 DEV:                 NOT EXECUTED

Slack:                    NO CONTACT
Leslie:                   NO CONTACT
Pondr:                    NO CONTACT
Notion:                   NO CONTACT
external filing:          NONE

credentials:              NONE ACQUIRED OR USED
deployments:              NONE
sibling writes:           NONE
force push:               NONE
history rewrite:          NONE

workspace-integrity events: NONE IN THIS CAMPAIGN
```

The last field is stated from the record, not defaulted. The predecessor's ONE
workspace-integrity event is recorded in its own campaign, where it belongs,
and DEF-RP-1 is the repair that made that record consistent.

## Git closure

Recorded in `STATE.md` `## Completion Snapshot`.

## Programme state

```
MA-8/F-13:                  unchanged
AH-1:                       unchanged
FC-1:                       unchanged
reviewer-surface campaign:  COMPLETE; its safety accounting repaired (DEF-RP-1)
this campaign:              COMPLETE

C-08b:                      NOT AUTHORIZED
C-07 DEV:                   NOT AUTHORIZED
C-12:                       NOT AUTHORIZED (live)
C-13:                       NOT AUTHORIZED
C-14:                       NOT AUTHORIZED
```

## Defects

### DEF-RP-1 — contradictory terminal safety accounting

Described above. Repaired, with a structural rule and a regression bound to
the real committed documents at `85e8f65` as well as to fixtures.

### The split binding seam

`createReviewDecisionHandler` read the campaign snapshot RAW while the
reviewer read path took it through validation with a fallback. Both halves
were individually correct; together they could derive a different campaign id
for the same state, and since the campaign id is part of the review binding,
EVERY write would be refused as `BINDING_MISMATCH` with the reviewer given no
way to tell the server was disagreeing with itself. Found by the browser
workflow on its first run. `createControlCenterServices` now builds both over
one snapshot seam.

### The per-row directory listing

Persisted-review lookup listed the whole store once per finding. Found by
measurement; every functional assertion passed throughout. Fixed with one
request-scoped listing, guarded by a deterministic call count.

### The listing as an authority

A read did not check that the envelope it found belonged to the finding asked
for, so a wrong or forged listing could surface another finding's valid review
under this finding's name. Found while writing the listing tests.

### The endurance heap guard never measured

The RS-1 endurance test asserted retained-heap growth under 64 MiB but called
`global.gc()` only if available, and `--expose-gc` was never passed — so it
compared two arbitrary allocator snapshots. It drifted past the bound twice in
this campaign on a tree with no leak in that path. `npm test` and
`npm run test:unit` now pass `--expose-gc`; where a forced collection is
genuinely unavailable the run is annotated `heap-guard: NOT EVALUATED` rather
than passing a meaningless assertion.

## Deferred / Follow-Up

See `STATE.md`.

## Next recommendation

The remaining repository-owned frontier, in the order I would take it:

1. **Review store lifecycle at operator scale.** The store now grows without
   bound by design — nothing is deleted automatically, and that is correct.
   What does not exist is an owner-facing way to SEE it: how many reviews are
   held, how many are stale, which findings have review history across
   generations. A read-only local inventory (CLI and/or a Control Center
   panel) is the natural next increment and needs no new authority.
2. **Review-aware human filing report.** `renderHumanFilingReport` can consume
   current local review state where one exists. The wiring is small; the care
   required is entirely in keeping the report's language unambiguous about
   what a local decision is not.
3. **Identity propagation beyond the dossier projection.** Expectation and
   contract identity now reach the reviewer. The recurrence and defect-class
   cones would carry more evidence if the same identities reached the
   finding-history entries, which today use a placeholder source SHA.

Not recommended, and not executed: anything requiring C-12 live, C-13, C-14,
C-08b, C-07 DEV, or contact with Slack, Leslie, Pondr or Notion. Those remain
externally gated.

## STOP
