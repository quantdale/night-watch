# NIGHTWATCH PHASE 8A.1 — TRUSTED EVALUATION PROVENANCE + REPLAY INTEGRITY CLOSEOUT

Status: `COMPLETE`

## Checkpoints and gap reconfirmation

- Starting synchronized SHA: `f75a547233a2a5189f157b959d309170a4ebdb57`.
- Session identity gap: `TRUE_POSITIVE`. The pre-fix validator accepted a
  syntactically valid but content-mismatched `session:sha256:` ID.
- Evaluation semantics gap: `TRUE_POSITIVE`. The pre-fix validator accepted
  an impossible recomputed evaluation tuple.
- Baseline/source binding gap: `TRUE_POSITIVE`. The pre-fix persisted synthetic
  path accepted the all-zero baseline.
- Validated implementation/substantive checkpoint:
  `4602fac417746a30927fc19f8e4ca48ab9143cac`.
- Prior implementation checkpoint `e56e068` passed CI but exposed a clean-clone
  test-fixture portability defect; the repair is in the validated checkpoint.
- Documentation anchor: `488b4e41dc12840a1e0c029ae76b24f3ce8abee4`.
- Final live SHA: discover from Git after the metadata-only closure commit;
  live Git is the only current-head authority.

## Versioned trust contracts

- Candidate: existing `nightwatch.selfdev-candidate.private.v1` retained.
- Evaluation: `nightwatch.selfdev-evaluation.private.v2` introduced because
  semantic state and binding guarantees are new.
- Session: `nightwatch.selfdev-session.private.v2` introduced.
- Provenance: `nightwatch.selfdev-provenance.private.v1`.
- Trust assessment: `nightwatch.selfdev-trust-assessment.private.v1`.
- Replay algorithm: `nightwatch.selfdev-replay-algorithm.v1`.
- Legacy v1: readable where intentionally supported, permanently
  `LEGACY_UNVERIFIED_NOT_ELIGIBLE`, not replay-trusted, migrated, or rewritten.

## Identity, semantics, and binding

The v2 session ID is SHA-256 over canonical semantic session fields with
`artifactId` omitted. The canonical encoding is length-prefixed over sorted
relative semantic entries, preventing path/byte concatenation ambiguity.
Validation recomputes the ID before filename derivation. The result-state
machine is a single canonical `assertEvaluationStateInvariant()` covering
pass, schema/scope/action/assertion/safety/privacy rejection, pre- and
post-execution duplicate, assertion/fixture/candidate/session failure, and
the `EVALUATED_PASS_NOT_ADOPTED` state. Reason codes constrain result classes;
recomputed IDs cannot legalize contradictory status fields.

The pass invariant requires PASS/IN_SCOPE/UNIQUE/EXECUTED/PASS/PASS/PASS,
`VALIDATION_OK`, non-null execution, positive coverage, matching added/count,
zero writes/calls, zero safety vector, `NOT_AUTHORIZED_PHASE_8A`, and
`PROHIBITED`. Rejection and failure variants preserve their exact evaluator
semantics, including duplicate-before-execution and duplicate-after-execution.

Every evaluation is bound to its regenerated candidate ID, canonical candidate
digest, candidate kind, evaluation ID, and session baseline. Session and
provenance HEADs and every evaluation baseline must agree. Candidate count
equals regenerated proposal count and persisted evaluation count. The array is
the authoritative contiguous proposal order.

## Replay and adversarial evidence

The replay descriptor contains only the known proposer class, bounded fixture,
bounded seed, attested base SHA, and expected count. Replay uses one fresh
stateful evaluator, exact proposal order, and a constant injected monotonic
clock; runtime-budget results that cannot be reproduced are classified
non-replayable rather than guessed. Canonical evaluation bytes are compared,
including IDs, status fields, coverage, execution summary, stable fingerprint,
reason, adoption/publication, counters, and safety vector.

The 39-test focused Phase 8A/8A.1 matrix covers fake and recomputed session
IDs, filename/internal-ID mismatch, impossible pass/rejection mutations,
all result classes and correlated field mutations, candidate/digest/base
binding, mixed baselines, descriptor tampering, stable-fingerprint tamper,
coverage tamper, forged PASS, reordered evaluations, storage, legacy, CLI,
source, contract, ancestry, dirty/staged/untracked, and trust assessment.
All listed tamper cases fail validation or replay without new authority.

## Source and Git provenance

The fixed code-defined authoritative path set covers the self-development core,
provenance boundary, owner-scope/private-artifact policy, runtime wrappers,
package manifests, and lockfile. `sourceBundleDigest` is SHA-256 over sorted
relative paths and exact file bytes using 8-byte length prefixes for both path
and content lengths. The contract manifest binds schema versions, candidate
kind, proposer, target, budgets, adoption/publication policy, action/assertion/
fixture/coverage descriptors, state-machine version, and replay algorithm;
`contractDigest` is separate from source bytes.

Only `src/core/provenance/localGit.ts` may invoke runtime Git. It uses exact
argv, `shell:false`, bounded output/time, minimal environment,
`GIT_OPTIONAL_LOCKS=0`, and only fixed read-only commands for repository root,
HEAD, staged/unstaged cleanliness, fixed-path untracked files, and ancestry.
There is zero runtime Git mutation authority. Dirty tracked, staged, untracked,
symlink/nonregular, missing, non-Git, wrong-root, unavailable-Git, unrelated
baseline, source-bundle, and contract-drift cases fail closed. Documentation
and task dirt outside the authoritative set do not invalidate source binding.

## Storage, API, and CLI

V2 files use a separate `selfdev-evaluation-v2-<digest>.json` namespace. The
exact-ID reader never enumerates or selects latest. Persistence requires
strict validation, provenance, replay, immutable no-replace publication, and
exact read-back/replay. Exact byte-identical duplicates are idempotent;
conflicting or corrupt winners are never overwritten. The general selfDev
index no longer wildcard-exports raw storage or a forging constructor.

`selfdev:synthetic` computes real local provenance, persists v2, replay-checks,
reads back, and prints only sanitized metadata. `selfdev:verify` accepts only
one exact artifact ID or help, distinguishes legacy, assesses current source,
replays, and prints no path, private content, candidate body, source content,
patch, or adoption result. Verification is read-only.

## Acceptance artifact

- Artifact ID: `session:sha256:1266c08b365fbabc56f6bbdf631c8b979df17288c1898d40cd27dc0952bf5aed`.
- Base SHA: `4602fac417746a30927fc19f8e4ca48ab9143cac`.
- Source digest: `sha256:80b0db2df5d8ac7b87eded03c0b8be7ee2d58103fa83251b0b31d784d5ca3493`.
- Contract digest: `sha256:05ad2ecf035381b58c47f3126bc844864137c57e5645df89a338cb7995a367a4`.
- Initial status: `VERIFIED_EXACT_BASE`; replay `PASS`.
- Counts: 3 candidates, 1 pass, 1 duplicate, 1 rejected.
- Adoption/publication: `NOT_AUTHORIZED_PHASE_8A` / `PROHIBITED`.
- Side effects: source writes 0, Git writes 0, external calls 0.
- Final documentation-descendant status at the documentation anchor:
  `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`; replay `PASS`.

## Validation and CI ledger

- `npm test`: 562/562 passed.
- Focused Phase 8A/8A.1: 39/39 passed.
- `npm run test:owner-provenance`: 91/91 passed.
- `npm run campaign:synthetic`: 27/27 passed serially.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `npm run agent:check`: PASS; stale-baseline warning before state anchor
  closure is expected continuity behavior.
- `git diff --check`: PASS.
- Privacy/secret scan: PASS; no private artifact JSON, credential, token,
  customer, auth, model, or publication material entered Git.
- Fresh full-history clone at `4602fac`: `npm ci --ignore-scripts`, typecheck,
  hardening, 39 focused tests, 91 owner/provenance tests, 27 campaign tests,
  synthetic v2 CLI, agent-state, and diff check all passed.
- Substantive CI run `31822125738` at `4602fac`: success; dedicated
  `Phase 8A.1 evaluation provenance and replay integrity matrix` executed and
  passed. Earlier implementation run `31821592114` also passed.
- Documentation CI run `31823224468` at `488b4e4`: success; the same Phase
  8A.1 matrix executed and passed. The final live workflow is checked directly
  from GitHub at handoff; current SHA is intentionally not serialized.
- No model, local-model canary, product, DEV/NEXT/production, database,
  infrastructure, Alphaus write, runtime Git write, or external publication
  occurred.

## Closure status

Phase 8 remains `IN_PROGRESS`; Phase 8A remains historically `COMPLETE`;
Phase 8A.1 is `COMPLETE`; Phase 8B remains `NOT_STARTED`. The implementation
and documentation anchors are durable; final live Git/CI are discovered after
the metadata-only closure commit.
The residual threat model excludes a malicious machine owner who rewrites
Nightwatch source, private artifacts, and verifier together. Recommended next
task, only after a new authorization and design review, is
`Phase 8B — Controlled Source Adoption Sandbox`; it is not started here.
