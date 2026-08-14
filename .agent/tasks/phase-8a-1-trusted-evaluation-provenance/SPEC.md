# Nightwatch Phase 8A.1 — Trusted Evaluation Provenance + Replay Integrity Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-15

## Objective

Turn a persisted Phase 8A evaluation from schema-valid JSON into a locally
attestable, content-addressed, source-bound, replay-verifiable record of one
exact deterministic synthetic evaluation sequence. This is a read-only
integrity boundary. It adds no adopter, patch, source writer, runtime Git
mutation, model, product, database, infrastructure, Alphaus, or publication
authority.

## Trust model

```text
untrusted bounded declarative proposal
  → strict candidate DTO
  → deterministic evaluator
  → content-bound v2 session
  → semantic validation and candidate binding
  → local source/baseline provenance assessment
  → ordered deterministic replay
  → derived trust assessment
  → stop
```

The proposer remains untrusted data generation, the evaluator remains pure
deterministic authority, and the verifier is a read-only deterministic
authority. The threat model excludes a malicious machine owner who rewrites
Nightwatch source, artifacts, and verifier together.

## Version policy

- Preserve `nightwatch.selfdev-candidate.private.v1` for the existing strict
  candidate contract.
- Introduce `nightwatch.selfdev-evaluation.private.v2`; semantic state
  invariants and candidate/result binding are new guarantees and must not be
  retroactively attributed to v1 values.
- Introduce `nightwatch.selfdev-session.private.v2` for the ordered,
  content-addressed envelope.
- Introduce `nightwatch.selfdev-provenance.private.v1` and
  `nightwatch.selfdev-trust-assessment.private.v1` as strict internal DTOs.
- Existing v1 evaluation/session artifacts remain readable only where the
  current code already supports them, are classified
  `LEGACY_UNVERIFIED_NOT_ELIGIBLE`, are never replay-trusted, migrated, or
  rewritten, and cannot satisfy future-review prerequisites.

## v2 invariants

1. `artifactId` is recomputed from canonical semantic session fields with the
   ID omitted; a wrong but syntactically valid ID fails before filename use.
2. The session binds one real nonzero `baseNightwatchSha` to
   `provenance.gitHeadSha`, every replay descriptor, candidate, and evaluation.
3. Each evaluation binds exactly to its candidate ID, canonical candidate
   digest, kind, and baseline; a session has one ordered contiguous sequence.
4. A canonical result-state machine accepts only tuples emitted by the
   deterministic evaluator, including pre/post-execution duplicate and exact
   failure variants. Recomputed IDs cannot legalize an impossible tuple.
5. Replay regenerates the bounded synthetic proposal sequence from a strict
   descriptor, evaluates it through one fresh stateful evaluator in order,
   and compares canonical evaluation bytes exactly.
6. Provenance is dual-bound: a fixed trusted source path manifest is hashed as
   ordered relative paths plus length-prefixed exact bytes, and a deterministic
   evaluator contract manifest is hashed separately. Both must match.
7. Currentness is derived from read-only local Git HEAD, fixed-path
   cleanliness, source/contract digests, and ancestry. Exact base and
   source-equivalent documentation descendants are distinct statuses;
   unrelated bases, drift, dirty authoritative source, and unavailable Git
   fail closed.
8. v2 persistence requires locally computed provenance, semantic validation,
   replay, immutable no-replace storage, exact read-back, and a second exact
   verification. Zero SHA is test-only and cannot be persisted.
9. The exact-ID read API never enumerates or selects a latest artifact; v1 is
   legacy-readable only. No verifier writes artifacts, source, or Git.
10. A successful assessment still carries
    `adoptionStatus=NOT_AUTHORIZED_PHASE_8A`, `publication=PROHIBITED`, and
    zero runtime side-effect counters. Future review wording is
    `INTEGRITY_VERIFIED_FOR_FUTURE_REVIEW`, never adoptable or approved.

## Provenance boundary

Only the dedicated local provenance wrapper may invoke fixed read-only Git
metadata commands, with exact argv, no shell, minimal environment, and
`GIT_OPTIONAL_LOCKS=0` where applicable. The deterministic core under
`src/core/selfDev/` remains free of child-process/Git/network operations.
Authoritative paths are code-defined, fixed, regular non-symlink files; the
path set includes self-development core/loader/config/lock/policy inputs as
justified by the implementation and hardening coverage. Documentation/task
files outside the set may be dirty and may form source-equivalent descendants.

## Replay policy

The normal synthetic proposer uses a bounded replay descriptor containing only
known proposer/fixture enums, bounded seed, attested base SHA, and expected
count. No raw rejected proposal is stored. Replay uses a deterministic
injected monotonic clock; nondeterministic budget-failure outputs are
classified non-replayable rather than guessed. The array order is authoritative
and candidate count must equal regenerated proposals and persisted evaluations.

## Storage and CLI

The v2 writer derives its filename only after exact validation and ID
recomputation, uses the existing immutable no-replace private primitive,
read-backs the winner, and returns exact duplicate versus conflict. The
synthetic CLI computes the current local provenance and persists v2 only; the
read-only verify CLI accepts exactly `--artifact-id <id>` or help and prints
sanitized derived metadata. Neither CLI accepts root, path, latest, patch,
adopt, commit, push, model, prompt, URL, or arbitrary input controls.

## Future Phase 8B guard

Expose only a read-only integrity assessment and, after successful replay,
verified pass-candidate extraction. It returns future-review prerequisites
only; it never returns a patch/diff/source content, writes source, mutates
Git, registers an oracle, or starts a Phase 8B task. Phase 8B remains
`NOT_STARTED`.

## Acceptance boundary

Close only after focused adversarial matrices, all applicable current tests,
hardening, clean-checkout validation, privacy/diff review, substantive and
documentation checkpoint pushes, exact CI observations when readable, one
normal local synthetic v2 artifact at the clean substantive SHA, exact-base
verification, and post-documentation source-equivalent verification all pass.
