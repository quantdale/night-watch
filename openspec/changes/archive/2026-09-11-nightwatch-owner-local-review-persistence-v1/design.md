# Design — owner-local review persistence & dossier identity enrichment

## D1 — the store is a schema over the existing primitive, not a new one

`PrivateArtifactStore.writeImmutableJson` already provides prepare / validate
/ `O_EXCL` temporary / `fsync` / atomic no-replace publish / verify / directory
`fsync`. Its no-replace primitive is `link(2)`, which fails `EEXIST` without
replacing, and unsupported-link filesystems raise
`PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` rather than degrading to a
replacing rename. `src/core/reviewStore/` supplies the schema, the identity,
the validation and the read semantics; it never opens a file itself.

## D2 — location contract

The canonical root is `$NIGHTWATCH_REVIEW_STORE_DIR`, defaulting to
`$HOME/.nightwatch/reviews` — a sibling of the existing findings root,
following the same convention. `PrivateArtifactStore` gains a closed
`subtree` option (`'findings' | 'reviews'`) so a derived root is still
asserted absolute, symlink-free, owner-only `0700` and outside both the
repository and the sibling workspace, and still reports
`rootClass: OUTSIDE_REPOSITORY` truthfully. A raw injected `root` continues
to mean `INJECTED_TEST_ROOT`. The subtree vocabulary is a closed union, so
no caller can derive an arbitrary path, and path traversal remains
impossible: file names are generated from digests and re-validated by the
existing `FILE_NAME_RE`.

## D3 — identity is the binding, never the finding id

```
reviewIdentity(binding) = sha256(stableJsonSorted(binding))[0..24]
```

The stored file name is

```
review.<findingIdDigest12>.<reviewIdentity24>.json
```

Keying by binding is what makes generations safe: a regenerated dossier
yields a different `dossierDigest`, therefore a different identity,
therefore a different file. The first generation is never overwritten and
stays auditable. Deletion is never automatic.

The finding-id digest in the name is a DERIVED discovery key, not a source
of truth: it is recomputed from the finding id on every lookup and the
envelope inside is validated independently, so a renamed or forged file name
cannot make bytes authoritative. This is why no index file exists — §18's
"do not add a database if filesystem state suffices". One `readdir` per
request serves a whole page; the page never scans the store per finding.

## D4 — persisted envelope

```
schemaVersion   nightwatch.review-store.v1
reviewIdentity  the D3 identity, recomputed on read
findingId       the bound finding, for discovery only
receipt         FindingReviewReceipt verbatim
record          FindingReviewRecord verbatim
storedAt        caller-supplied ISO-8601 UTC instant
```

No raw dossier, finding or handoff content is stored. The binding already
carries their digests; duplicating the artifacts would add a privacy surface
and buy nothing.

## D5 — read semantics are exactly four, and fail closed

`NO_REVIEW` | `CURRENT` | `STALE` | `CORRUPT`.

Every read revalidates: envelope shape and schema, the record through
`validateReviewBinding`, the receipt through the canonical
`verifyReviewCurrent`, recomputed review identity, recomputed file-name key,
terminal state, and `organizationalAuthority === 'NONE_LOCAL_REVIEW_ONLY'`.
`verifyReviewCurrent` is the ONLY binding validator; the store does not
carry a second, weaker copy. Its `FINDING_REVIEW_STALE:*` failures map to
`STALE`; every other failure maps to a categorical store error
(`REVIEW_STORE_CORRUPT`, `REVIEW_STORE_VERSION_UNSUPPORTED`,
`REVIEW_STORE_BINDING_INVALID`, `REVIEW_STORE_RECEIPT_TAMPERED`,
`REVIEW_STORE_IDENTITY_MISMATCH`, `REVIEW_STORE_AUTHORITY_INVALID`).
Corrupt or unknown-schema bytes can never yield `CURRENT`.

## D6 — one decision, one binding

The write path builds the record with `initialReviewRecord`, applies
`decideReview` (which itself refuses a second decision), then publishes with
`writeImmutableJson`. The filesystem is the concurrency arbiter: two writers
racing the same identity both prepare bytes, one `link(2)` wins, the loser
receives `PRIVATE_ARTIFACT_IMMUTABLE` and is reported as the deterministic
`REVIEW_STORE_ALREADY_DECIDED` conflict. Canonical bytes remain the winner's.
There is no read-then-write check that could be raced.

## D7 — crash consistency

The only durable mutation is the `link(2)`. Before it, the canonical name
does not exist and only an identifiable `.nightwatch-<pid>-<random>.tmp`
temporary may exist. After it, the canonical file is complete and verified.
There is no window in which a partial canonical file is observable, so a
restart sees the review absent or fully valid — never partial, never
zero-byte. Temporaries are recognizable by their fixed prefix; recovery
reports them and removes only files matching that prefix, never unknown
files.

## D8 — the write authority is narrow

One route, under the Control Center's existing loopback/origin/CSRF
protections. It accepts a decision enum, a bounded rationale re-screened by
the lifecycle's sentinel scan, and the review identity the surface
displayed. The server REBUILDS the binding from current authority state and
requires the submitted identity to equal the recomputed one, so a client
cannot choose the binding it writes against. The authority's only write
capability is the review store; a hardening rule pins its import graph
against filesystem, publication and production-connector modules.

## D9 — the binding the Control Center reviews

A Control Center review is dossier-scoped, and the binding says so rather
than implying a handoff was reviewed:

| field | value |
|---|---|
| `findingId` | the dossier `candidateId` |
| `findingDigest` | digest of the projected finding row the reviewer saw |
| `dossierDigest` | digest of the exact parsed dossier file |
| `handoffDigest` | `null` — no handoff projection was reviewed |
| `sourceSha` | the dossier's semantic-triage `sourceSha`, else `synthetic.no-source-evidence` |
| `campaignId` | the campaign identity, else `local.no-campaign` |
| `handoffVersion` | `NONE_DOSSIER_ONLY_REVIEW` |
| `privacyProjectionVersion` | the findings-authority schema version — the projection actually applied |

Each substitute value is a declared literal naming the absence, never a
guess. `handoffVersion` deliberately avoids importing the AH-1 cone, which
F-12 reverse-isolation forbids from outside that cone.

## D10 — identity propagation carries, never derives

`FindingsDossierMetadata` gains `expectationId` and `semanticContractId`,
read from `semanticTriageEvidence.expectationId` and
`.invariantDefinitionId` on a v2 dossier. A v1 dossier, a v2 dossier with
`semanticTriageEvidence: null`, or any value failing the existing safe-id and
sentinel screens yields `null`. `descriptorFor` then passes them through
instead of hardcoding `null`.

No dossier schema changes: the identity already exists in
`nightwatch.bug-dossier.private.v2` and is already privacy-validated at
construction (`SAFE_ID_RE`, the sentinel set, and a whole-object
`assertNoSentinels`). Re-screening at the projection boundary is defence in
depth, not derivation. Nothing is hashed from prose and nothing is inferred
from a v1 dossier, so `UNKNOWN` stays `UNKNOWN`.

## D11 — the classifier is not touched

`classifyRelationship` already treats matching identities as corroboration
and DIFFERING non-null identities as counterevidence. Propagation therefore
sharpens both directions with no rule change, and the campaign measures
over-collapse — same expectation with different failures, same contract with
unrelated operations, same fingerprint with different expectations — as
carefully as it measures improvement.

## D12 — safety-event accounting is structurally checked

`agent:check` gains one narrow cross-file rule: if a task `STATE.md` records
one or more entries under `## Safety Events`, its `REPORT.md`
`Safety events:` line may not assert `NONE`. Two fields of one campaign,
compared. No prose analysis, no NLP.
