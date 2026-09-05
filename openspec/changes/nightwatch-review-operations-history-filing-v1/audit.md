# Audit — Review Operations, History Intelligence and Human-Filing Completion

Planned from `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` (`origin/main`).
Predecessor: `nightwatch-owner-local-review-persistence-v1`, COMPLETE.

Everything below was read in the tree at that SHA, not recalled.

## What the predecessor actually landed

- `src/core/reviewStore/` — `types.ts` (schema `nightwatch.review-store.v1`,
  the closed `REVIEW_STORE_ERROR_CODES` vocabulary, the four read states),
  `identity.ts` (binding-digest identity, derived 12-hex discovery key, the
  pinned `REVIEW_FILE_NAME_RE`), `store.ts` (`putDecision`, `read`,
  `snapshotListing`, `fileNamesFor`, `recoverTemporaries`).
- `src/core/policy/privateArtifacts.ts` — the closed `PRIVATE_ARTIFACT_SUBTREES`
  union, `writeImmutableJson` (O_EXCL temp, fsync, `link(2)` publish, verify,
  directory fsync), `listJson`, `listTemporaries`, `removeTemporary`.
- `src/controlCenter/authorities/reviewBinding.ts` — the single shared binding
  builder used by both the read and the write path.
- `src/controlCenter/authorities/reviewWriteAuthority.ts` — the only write path.
- `src/controlCenter/authorities/reviewerAuthority.ts` — the pure projection
  input builder, page-bounded since M5 of the predecessor.
- `checkReviewStoreBoundary()` in `bin/hardening-check.mjs`.

## Gaps this campaign closes, each verified in the tree

1. **No inventory.** Nothing in the repository enumerates the store. The only
   enumeration primitives are `listJson(prefix)` and `listTemporaries()`;
   neither reports sizes, unknown entries, or per-artifact validity. An
   operator cannot answer "what is in my review store".

2. **No history surface.** `ReviewStore.read()` already returns
   `generations`, but no caller consumes it, no ordering is defined over it,
   and nothing distinguishes the current generation from historical ones for
   a human.

3. **`renderHumanFilingReport()` has no production caller.** `grep` finds it
   in `src/core/findingReview/{report,index}.ts` and in two test files only.
   Its `FilingReportReview` has no notion of currentness: the only states it
   can express are "a review object" and `null`. A STALE stored review has no
   representation that is not "current", and a CORRUPT one has none at all.

4. **A fabricated source SHA reaches finding history.**
   `reviewerAuthority.ts` pushes `sourceSha: '0'.repeat(40)` into every
   `IntelHistoryEntry`, twice. Forty zeroes satisfies `SHA_RE` and reads as a
   real commit. The repository already owns the honest value for this context:
   `CONTROL_CENTER_REVIEW_NO_SOURCE` (`synthetic.no-source-evidence`) in
   `reviewBinding.ts`, which is what the review binding itself records.

5. **`IntelHistoryEntry` cannot carry semantic identity.** Its fields are
   `findingId`, `fingerprint`, `campaignId`, `observedAtMs`, `sourceSha`,
   `priorOutcome`. The expectation and semantic-contract identities that the
   predecessor propagated as far as `IntelFindingDescriptor` stop there, so
   recurrence sees fingerprints and nothing else.

6. **The regression-candidate lineage guard is vacuous.**
   `classifyRecurrence` reads
   `latest.priorOutcome === 'RESOLVED_FIXED' && latest.sourceSha !== undefined`.
   `assertHistoryEntry` already refuses a non-string `sourceSha`, so the second
   conjunct is true whenever the first is evaluated. The rule's stated
   requirement — a moved source lineage — is not checked at all, and
   `classifyRecurrence` has no current `sourceSha` input to check it against.

7. **One terminal-report field is a live-authority marker where a historical
   anchor belongs.** See below.

## The `DISCOVER_FROM_GIT` question (brief section 8), resolved mechanically

The convention is real and machine-recognized, so the answer is not a blanket
A or B; it is per field.

Evidence that the marker is deliberate:

- `AGENTS.md:337` — "`DISCOVER_FROM_GIT`, `LIVE_HEAD_AUTHORITY: GIT` and
  `FINAL_CI_AUTHORITY: ...` are intentional authority markers, not
  placeholders."
- `bin/agent-state.mjs:545` exempts it for `LAST_PUSHED_SHA`,
  `CURRENT_LOCAL_HEAD`, `CURRENT_REMOTE_HEAD`.
- `bin/project-state-check.mjs:123,289` requires it for `LIVE_HEAD_SHA`.
- `.agent/templates/STATE.template.md` and `REPORT.template.md` prescribe it
  for live HEAD.

Evidence that it is wrong on the field the brief names:

- The same `AGENTS.md` section separates LIVE values, which Git discovers,
  from STABLE HISTORICAL ANCHORS, which a document records: "Durable Git
  continuity records stable historical anchors" and "Tracked documents record
  only SHAs ... already known before the document commit".
- The predecessor's implementation anchor was known before its REPORT was
  committed: `ACTIVE_TASK.md` and `STATE.md` both carry
  `LAST_VALIDATED_IMPLEMENTATION_SHA: 1ec3ae02c7942e95fc124664409adb65a8eec334`,
  and `1ec3ae0` is three commits before `d1ebde9`, which is the commit that
  introduced the REPORT line.
- Repository convention agrees: of the eleven REPORTs carrying an
  `Implementation anchor` field, eight record a 40-hex SHA and two record a
  prose statement that no new implementation exists. Exactly one records
  `DISCOVER_FROM_GIT`, and it is the predecessor's.

So: `Live HEAD` and `origin/main` are case **A** and stay as they are.
`Implementation anchor` is case **B** — an unresolved live-authority marker
standing in for a value that was already known. It gets a defect ID, a repair,
and a mechanical rule, because "Git will tell you" is not answerable for a
question Git cannot answer: nothing in Git identifies which commit an author
considered their implementation anchor.
