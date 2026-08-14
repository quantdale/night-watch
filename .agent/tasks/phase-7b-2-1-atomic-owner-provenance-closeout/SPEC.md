# Nightwatch Phase 7B.2.1 — Atomic Owner Provenance Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Task purpose

Close the two integrity gaps found after Phase 7B.2 without adding AI
capability or starting Phase 8:

1. make immutable private publication a complete-file, atomic, no-replace
   filesystem operation across competing local processes; and
2. make the explicit interactive owner-review CLI the only tracked Nightwatch
   runtime path that can reach human-decision write authority.

This task is local, static, synthetic, filesystem-concurrency testing only.
It must not run a real model, local-model canary, campaign:real, auth capture,
DEV/NEXT/production traffic, browser/API session, database/infrastructure
operation, or publication path.

## Established starting state

- Task ID: `phase-7b-2-1-atomic-owner-provenance-closeout`.
- Canonical root:
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Starting SHA: `9d591ffd59719c2bba1dc155d614fd5c9b6a7078`, discovered from Git
  after fetch; `main`, clean worktree, and `HEAD == origin/main`.
- Historical Phase 7B.2 implementation/substantive anchor:
  `b26e6c30c1ae08e668ed718eea53d6f799bead59`.
- Historical Phase 7B.2 documentation anchor:
  `9634b02728c2b49b0ac0cf7efabc134596b806cc`.
- Phase 6 remains `FROZEN_BY_OWNER /
  INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 7B.2 remains a completed historical predecessor.
- Phase 8 remains `NOT_STARTED`.

## Confirmed defects

`PrivateArtifactStore.writeImmutableJson()` currently performs a pre-read and
then delegates to replacement-capable `writeJson()`, whose final `renameSync`
can replace a destination created by a competing process. AI bug drafts and
oracle suggestions also use an `INCOMPLETE` write followed by replacement.

`src/core/aiReview/index.ts` wildcard-exports `ownerReview.ts`, exposing both
`recordOwnerDecision()` and `recordConfirmedOwnerDecision()`. The raw helper
has no TTY or confirmation boundary, so a tracked runtime import can create an
OWNER review without the explicit CLI gate.

## Required outcomes

- Complete final JSON is written and fsynced to a same-directory `0600`
  temporary file created with `wx`.
- Final immutable publication uses an OS no-replace primitive (`linkSync` on
  the validated local POSIX filesystem), then removes the temporary name and
  fsyncs the containing `0700` directory. No replacement fallback exists.
- Exactly one competing first publication wins; later writers cannot replace
  winner bytes, mode, or ownership. Exact duplicate artifacts may be
  idempotent; different immutable bytes return a conflict classification.
- Human reviews, bug drafts, and oracle suggestions all use the true
  immutable/no-replace primitive and never expose a destination-level
  `INCOMPLETE` artifact.
- Corrupt, unsafe, wrong-schema, wrong-identity, or symlink destinations fail
  closed and are never overwritten.
- Human-review race losers safely re-read a strict valid winner and are
  classified `AI_REVIEW_ALREADY_REVIEWED`; exactly one valid decision remains.
- The raw unconfirmed decision helper is private/non-exported. The public
  AI-review index exposes no human-decision writer or record constructor.
- A separate internal owner-decision module is loaded only by
  `bin/ai-owner-review.mjs`; its write entry requires the selected decision,
  exact confirmation token, and expected displayed artifact digest.
- TTY, fixed A/R/S/Q, exact second confirmation, terminal sanitization,
  digest binding, no-provider/network/Git/publication boundaries, and Phase 8
  status remain unchanged.

## Validation requirements

Add focused atomic primitive tests, synthetic adversarial tests, bounded
cross-process tests using Node child processes with explicit minimal
environments and temporary roots, concurrent owner-decision tests, generated
bug/oracle same-ID collision tests, public API/call-graph hardening tests, and
an explicit private CI step. Run the complete repository-native validation and
an isolated full-history clean checkout before closure.

## Explicit non-goals

No real model or provider endpoint, model download, Phase 8 behavior,
campaign/browser/API execution, DEV/NEXT/production contact, datastore or
infrastructure query, credential/auth state, external publication, Git writes
at runtime, or modification of sibling Alphaus repositories.
