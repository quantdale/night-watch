# Design — Review Operations, History Intelligence and Human-Filing Completion

## 1. Read-only by construction, not by convention

`PrivateArtifactStore` already has a `createIfMissing: false` mode that sets
`readOnly`, and every write method begins `if (this.readOnly) throw`. The
inventory therefore constructs its store that way: it is not "a command that
does not write", it is a store instance whose write methods refuse.

That matters beyond intent. In the normal read/write mode, `readJson` calls
`ensureOwnerDirectory`, which `mkdir`s and `chmod`s the root — so an inventory
built on a writable handle would touch the store's metadata every time it ran,
which brief section 10 forbids. The read-only handle skips it.

The single new primitive is `listEntries()`: one `readdirSync` plus one
`lstatSync` per entry, returning `{ kind, name, bytes, mtimeMs }` where `kind`
is `JSON | TEMPORARY | UNKNOWN | NON_FILE`. It classifies; it never opens,
moves, renames or removes.

## 2. Currentness is not a store property

The store can prove an envelope is *valid*. It cannot prove it is *current*:
currentness is `verifyReviewCurrent(receipt, currentArtifacts)`, and the
current artifacts live in the findings authority, not in the store.

So the inventory reports two independent axes and never conflates them:

- **integrity**, from the store alone: `VALID` or `CORRUPT`.
- **currentness**, `CURRENT | STALE | UNKNOWN`, which is `UNKNOWN` for every
  artifact unless the caller supplies a currentness resolver.

A store-only inventory that claimed a CURRENT count would be inventing the one
fact it structurally cannot know. The CLI, which has no findings authority,
reports currentness as UNKNOWN and says so; the Control Center, which has one,
resolves it.

## 3. Health is a precedence plus a set, never a single collapsed word

Several conditions hold at once in a real store. Reporting one would hide the
others, and picking the *worst* one alone would make "corrupt" swallow
"unknown files present". So health is:

- `conditions`: every condition that holds, sorted, from a closed vocabulary.
- `classification`: the highest-precedence condition, for a one-line answer.

Precedence, most severe first:

```
STORE_UNAVAILABLE
CORRUPTION_PRESENT
UNKNOWN_FILES_PRESENT
TEMPORARY_RESIDUE_PRESENT
STALE_HISTORY_PRESENT
HEALTHY
```

`STALE_HISTORY_PRESENT` is last on purpose. Stale history is the store working
as designed — the evidence of what was reviewed against an artifact that has
since been regenerated. Ranking it above residue or corruption, or reporting
it as a fault at all, would be the section 18 error.

## 4. Filenames are output, and unknown filenames are attacker-controlled

Canonical and temporary names have pinned shapes — `review.<12hex>.<24hex>.json`
and `.nightwatch-<pid>-<32hex>.tmp` — so echoing them leaks nothing.

An UNKNOWN entry is by definition a name nothing in this repository chose. It
could be `customer-acme-invoice.json`. The inventory therefore reports unknown
entries as `{ nameDigest, bytes }` — a 24-hex digest of the name — and never
the name itself. A digest is enough to notice that the same stranger is still
there next week, and not enough to leak what it is called.

The file is not opened, not parsed, not classified by content, and above all
not deleted.

## 5. History chronology comes from records, never from filenames

The file name carries a discovery key and an identity digest. Neither orders.
Generations are ordered by `storedAt`, then `reviewedAt`, then
`reviewIdentity`. The last key makes the order total: `storedAt` has
second precision, so ties are ordinary, and a tie broken by directory order
would make the whole view non-deterministic.

The current generation is the one whose receipt passes `verifyReviewCurrent`
against the supplied artifacts — never "the newest", which is a guess that is
usually right and therefore worse than one that is always checked.

Per-generation semantic identity is reported as `null` with the reason
`REVIEW_BINDING_CARRIES_NO_SEMANTIC_IDENTITY`. The v1 binding does not carry
`expectationId` or `semanticContractId`, and adding them would change every
identity and mark every stored review corrupt. The identities of the CURRENT
artifact are reported once at the top level, where they are true, rather than
attributed to historical generations, where they would not be.

## 6. Pagination: global counts, bounded rows

Counts are computed over the whole store and are exact. Rows — artifacts,
findings, generations — are paged with an explicit
`{ offset, limit, total, truncated }`. A 50,000-review store answers "how
many" exactly and "which ones" fifty at a time.

## 7. The source SHA a finding history entry deserves

`reviewerAuthority` fabricated `'0'.repeat(40)`. The correct value for a
Control-Center-observed finding already exists one module away: the review
binding records `CONTROL_CENTER_REVIEW_NO_SOURCE` when no source evidence was
supplied, and the same literal is now imported rather than a second one
invented. When a real source SHA is supplied, it is threaded through and both
the binding and the history entry see the same value, because they read the
same input.

## 8. Recurrence: two tightenings, no loosening

- A history entry whose semantic identity *contradicts* the candidate's is
  excluded from fingerprint matches. Same fingerprint, different proven
  invariant, is not a recurrence — it is a fingerprint collision, and the
  evidence says so.
- `REGRESSION_CANDIDATE` now requires what its own definition claims: a proven
  prior fix (`RESOLVED_FIXED`) **and** a source lineage that actually moved.
  The old `latest.sourceSha !== undefined` could not fail. Where the candidate
  supplies no source identity, movement is unproven and the answer falls back
  to `RECURRENT` — a weaker claim, not a stronger one.

Fingerprint identity remains the only *match* key. Semantic identity is
admitted as counterevidence and as corroboration, never as a new way to
declare two findings the same. That keeps section 29's "different invariant
with same fingerprint" and "same fingerprint with different expectation"
separate, which is exactly what over-collapsing would destroy.

## 9. Four filing-report review states

`FilingReportReview` gains a `state`. The four renderings are textually
disjoint, and the test asserts that the CURRENT heading and its decision line
appear for CURRENT and for nothing else:

- `NO_REVIEW` — `Local review (HUMAN DECISION REQUIRED)`.
- `CURRENT` — decision, resulting state, time, bounded rationale, and the
  four-line non-equivalence block.
- `STALE` — `Local review (HISTORICAL — DOES NOT BIND)`. The historical
  decision is shown, explicitly labelled as not current, followed by "Human
  review required for this generation." Hiding it would destroy evidence;
  printing it unlabelled would be the section 21 failure.
- `CORRUPT` — `Local review (UNAVAILABLE — FAIL CLOSED)`. No decision is
  shown, because no decision survived validation.

## 10. Retention analysis is evidence, not a decision

Section 17 asks for a bounded analysis. It lives in
`docs/DECISIONS.md` as an explicitly UNDECIDED entry with measured growth per
review, measured inventory and lookup cost at 10k/25k/50k, and the
auditability / disk / complexity / privacy / recovery / destructive-risk
trade-off of each option. No option is selected and no code implements one.
