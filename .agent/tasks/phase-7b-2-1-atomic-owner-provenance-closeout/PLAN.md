# Nightwatch Phase 7B.2.1 — Atomic Owner Provenance Closeout

## Purpose

Repair immutable private persistence and structurally confine human-decision
write authority while preserving the completed Phase 7B.2 interface and all
owner-scope/no-model/no-network boundaries.

## Starting State

- Task ID: `phase-7b-2-1-atomic-owner-provenance-closeout`.
- Starting SHA: `9d591ffd59719c2bba1dc155d614fd5c9b6a7078`.
- Prior implementation/substantive anchor:
  `b26e6c30c1ae08e668ed718eea53d6f799bead59`.
- Prior documentation anchor:
  `9634b02728c2b49b0ac0cf7efabc134596b806cc`.
- Live HEAD authority: discover with Git; never serialize a current SHA as
  self-referential state.

## Scope

`src/core/policy/privateArtifacts.ts`, AI artifact/review storage and review
service boundaries, the owner-review CLI loader, focused unit/concurrency
fixtures, hardening checks, private CI, task/project documentation, and
validation only inside Nightwatch.

## Non-Goals

Real or local model execution, cloud AI, campaign:real, auth capture, DEV,
NEXT, production, browser/API traffic, databases, infrastructure,
publication, source self-editing, Phase 8, and all sibling Alphaus changes.

## Safety Constraints

- All persistence tests use synthetic payloads and temporary owner-only roots.
- Child processes are Node-only, `shell: false`, bounded in time/output, and
  receive a minimal explicit environment.
- No default owner findings root, credential, auth state, customer data,
  real finding, model endpoint, product target, or external publication is
  used.
- The canonical Nightwatch repository is the only writable Git root. No
  sibling Alphaus repository is touched.

## Architecture / Approach

- Build complete READY envelopes in same-directory `wx`, 0600 temporary files;
  fsync the file, publish with POSIX `fs.linkSync` create-if-absent, unlink
  the temporary name, and fsync the containing private directory.
- Keep replacement-capable `writeJson`/`writeIncomplete` for non-immutable
  consumers; route bug drafts, oracle suggestions, and human reviews through
  the no-replace primitive.
- Read and strictly validate a valid winner after a no-replace conflict so
  exact duplicates are idempotent and different bytes are classified without
  overwriting the winner.
- Keep owner-review rendering/read APIs separate from the internal decision
  writer. Only `bin/ai-owner-review.mjs` loads that writer after TTY, menu,
  exact confirmation, and displayed-digest checks.

## Milestones

### M0 — Bootstrap, recovery, and design (COMPLETE)

- Reverified canonical root, clean `main`, private remote, fetch, and exact
  synchronized starting SHA.
- Confirmed no other Nightwatch writer process.
- Read required durable docs, historical 7B.2 task files, current storage,
  AI review, CLI, tests, hardening, CI, package, and history.
- Created and routed this native task.
- Confirmed the pre-read/replace immutable race and public owner-writer gap.

### M1 — Atomic no-replace private publication (COMPLETE)

- Added a same-directory random `wx` temporary writer that completes and
  fsyncs the envelope before publication.
- Publishes immutable files with `fs.linkSync(temp, destination)` only;
  maps `EEXIST` to immutable conflict and unsupported primitives to a precise
  fail-closed storage error.
- Preserved root/file owner-only checks, symlink checks, cleanup, and
  directory fsync without deleting a winner.
- Kept replacement-capable `writeJson`/`writeIncomplete` semantics for
  existing non-immutable consumers and use unique temporary names.

### M2 — Migrate all immutable AI artifacts (COMPLETE)

- Routed bug drafts, oracle suggestions, and human reviews through
  `writeImmutableJson`.
- Removed the AI immutable `INCOMPLETE → READY` replacement sequence.
- Re-read valid winners after no-replace conflicts for exact idempotency or
  conflict classification; corrupt/unsafe winners fail state integrity.
- Preserved strict read-back identity, digest, schema, READY, owner, and
  publication validation.

### M3 — Persistence and concurrency regressions (COMPLETE)

- Added focused primitive tests for first-writer-wins, modes, cleanup,
  privacy-before-temp, symlink safety, unsupported primitive, write failure,
  directory-fsync failure, and a publication-time symlink race.
- Added bounded Node child-process races for private payloads, bug artifacts,
  oracle artifacts, and competing owner decisions.
- Verified complete winner bytes, loser classifications, strict post-race
  read-back, exact duplicate idempotency, and corrupt-state non-overwrite.

### M4 — Unique owner-decision runtime authority (COMPLETE)

- Moved the write-capable decision implementation to internal
  `ownerDecision.ts`.
- Made raw `recordOwnerDecision` private and made the exported internal entry
  require exact confirmation and the displayed artifact digest.
- Removed owner decision writers and the record constructor from the public
  AI index; retained only minimum read/projection/render exports.
- Loaded the internal writer directly from `bin/ai-owner-review.mjs`; retained
  the TTY and fixed two-step confirmation gate.

### M5 — Hardening, public-surface tests, and CI (COMPLETE)

- Enforced no replacing final publication, no unsafe fallback, complete temp
  fsync, directory fsync, and all AI immutable storage paths.
- Scanned tracked `src/`/`bin/` runtime imports/calls so only the owner CLI
  can reach internal owner-decision write authority.
- Added public-index/raw-writer structural regressions and a private CI step
  with read-only permissions and no secrets.

### M6 — Full local, isolated, and adversarial validation (COMPLETE)

- Full current local Playwright (513/513), typecheck, hardening, synthetic
  campaign (27/27), agent-state, privacy/diff, and scoped provenance (91/91)
  validation passed.
- Source-derived architecture and adversarial review found no remaining
  implementation blocker. Isolated clean-checkout validation is also required
  as the final checkpoint gate and is tracked in M7.

### M7 — Validated checkpoints and closure (COMPLETE)

- Commit and push the validated implementation-bearing checkpoint without
  force-push; fetch and verify exact local/remote equality.
- Update project docs and final task report using stable anchor roles, push
  documentation closure, verify exact final `Nightwatch hardening` CI steps at
  the live final SHA, close `ACTIVE_TASK`, verify a clean tree, and stop.

Closure evidence: implementation checkpoints `d78f93bc622e3d0548cbd4bd674775d02e7fb9b4`
and `3916594f6e947f7f4665b23751c1d3ec03f5928b` are pushed and synchronized;
the local and isolated deterministic validation is complete. The exact final
GitHub workflow inspection is the remaining post-documentation handoff
recorded in the final report checkpoint.

## Validation Strategy

Before each checkpoint: scoped tests, typecheck/hardening as appropriate,
privacy/diff review, `git diff --check`, remote freshness, commit, push, fetch,
and exact local/remote equality. Before closure also run the full current
Playwright suite, `campaign:synthetic`, `agent:check`, and a fresh isolated
full-history clone with `npm ci --ignore-scripts` and the required deterministic
checks only.

## Decision Log

- 2026-08-14 — `fs.linkSync` is the selected POSIX no-replace publication
  primitive. A destination conflict is never handled with rename, unlink,
  truncate, or copy-over-existing.
- 2026-08-14 — AI generated artifacts become one-shot complete READY files;
  non-AI `INCOMPLETE` workflows retain their existing replacement semantics.
- 2026-08-14 — Same-record duplicate review writes are idempotent; different
  valid records classify as conflicting/already-reviewed after strict winner
  read-back.
- 2026-08-14 — The internal owner-decision module is not exported by the
  general AI-review index; only the interactive CLI may load it in tracked
  runtime source.
- 2026-08-14 — The internal confirmed writer requires the exact displayed
  artifact digest in addition to the exact decision confirmation token.

## Discoveries

- The previous `readJson` then replacement `renameSync` sequence was only a
  preflight check and did not provide exclusion between competing processes.
- A same draft/suggestion ID does not imply identical bytes because metadata
  such as `generatedAt` is not part of the identity digest.
- Directory fsync failure occurs after a winner is visible; the safe behavior
  is to report the durability failure without deleting or replacing that
  winner.

## Deferred Work

- Local-model canary and Phase 8 remain explicitly out of scope.
- Crash consistency beyond fsynced file + no-replace link + directory fsync
  is not claimed; a process crash can still leave an unlinked hidden
  temporary.

## Completion Criteria

Complete only after all user-specified acceptance criteria are evidenced,
stable anchors are recorded without self-reference, exact final CI succeeds,
`ACTIVE_TASK` is closed, and the canonical worktree is clean.
