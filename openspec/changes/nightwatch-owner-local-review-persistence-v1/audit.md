# Audit — owner-local review persistence & dossier identity enrichment

Scope: the two gaps the reviewer-surface campaign left open at its close.
It built the reviewer surface over the certified finding intelligence, then
recorded honestly that two values it displays cannot yet be true — local
review state is `UNKNOWN` because no review store exists, and expectation /
semantic-contract identity is `null` because the Control Center dossier
projection does not carry it.

Existing architecture inspected before writing:

- `src/core/findingReview/` (206 + 88 + 155 lines) — the review lifecycle
  is complete and certified. `initialReviewRecord`, `decideReview` and
  `verifyReviewCurrent` already implement exactly-one-terminal-decision,
  digest-bound bindings over eight artifact fields, receipt-identity
  recomputation (`FINDING_REVIEW_RECEIPT_TAMPERED`), the
  `NONE_LOCAL_REVIEW_ONLY` authority literal and the Leslie/Pondr
  non-equivalence list. Nothing here needs redesign. It has no `fs`
  authority and must keep none.

- `src/core/policy/privateArtifacts.ts` (285 lines) — the repository
  ALREADY owns the atomic owner-local publication primitive this campaign
  needs, and it is stronger than a rename-based one.
  `PrivateArtifactStore.writeImmutableJson` writes an `O_EXCL` temporary
  with mode `0600`, `fsync`s it, publishes by `link(2)` — which is atomic
  and fails `EEXIST` WITHOUT replacing an existing file — verifies the
  published bytes, unlinks the temporary and `fsync`s the directory. It
  maps unsupported-link filesystems to
  `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` rather than silently degrading
  to a replacing rename. The root contract is already enforced:
  `NIGHTWATCH_PRIVATE_STATE_DIR` or `$HOME/.nightwatch/findings`, absolute,
  symlink-free at every component, owner-only `0700`, and rejected outright
  if it resolves inside the repository or the sibling workspace
  (`PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY`). Inventing a second storage
  pattern would be the wrong answer; the review store is a schema and an
  identity on top of this primitive.

- `src/core/triage/dossierV2.ts` + `src/core/triage/semanticTriageEvidence.ts`
  — the decisive finding for the second workstream. The expectation and
  semantic-contract identities the reviewer surface reports as absent
  ALREADY EXIST upstream, mechanically established and privacy-validated:
  `SemanticTriageEvidence.expectationId` (the Phase 9A.1 admitted
  real-source expectation), `.invariantDefinitionId` (the semantic contract
  / invariant identity) and `.semanticFindingFingerprint`. Each is
  validated at construction against `SAFE_ID_RE`, the sentinel pattern set
  and a whole-object `assertNoSentinels` sweep. So this workstream is
  propagation of an existing identity, not derivation of a new one, and no
  dossier schema needs to change: v2 carries the identity, v1 does not and
  therefore stays `null`.

- `src/controlCenter/authorities/findingsAuthority.ts` — `FindingsDossierMetadata`
  is the projection that drops the identity. It reads v1 and v2 dossier
  files from the owner-only findings root and keeps sixteen fields; none of
  them is an expectation or contract identity.

- `src/controlCenter/authorities/reviewerAuthority.ts` — `descriptorFor`
  consequently hardcodes `expectationId: null, semanticContractId: null`
  with a comment stating the metadata carries neither, and every projected
  finding unconditionally pushes the `NO_LOCAL_REVIEW_STORE` unknown and a
  `localReview: null`.

- `src/controlCenter/contracts/reviewer.ts` — `ControlCenterLocalReviewValueDto`
  already models what persistence must supply: state, decision, reviewedAt,
  transitionCount, `bindingCurrentness: 'CURRENT' | 'STALE' | 'UNKNOWN'`,
  and the restated authority literals. The contract does not change; it
  gains a real value.

- `src/core/findingIntel/relationships.ts` — identity is already consumed
  where it exists: matching `expectationId` / `semanticContractId` are
  corroborating evidence, and DIFFERING non-null values are COUNTEREVIDENCE
  (lines 94-97). Propagation therefore sharpens the classifier in both
  directions and no classification rule needs loosening to benefit.

Predecessor durable-truth defect found during this audit:
`.agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1/STATE.md`
records, under `## Safety Events`, one workspace-integrity event
(harness-written patterns in the shared `$GIT_COMMON_DIR/info/exclude`,
caught by `agent:check`, stock template restored). The same campaign's
`REPORT.md` line 23 states `Safety events: NONE`. Two committed documents
of one campaign contradict each other on safety accounting. That is a
durable-truth defect in terminal accounting and is repaired first.
