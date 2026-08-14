# Task State

## Identity

Task ID: phase-7b-2-1-atomic-owner-provenance-closeout
Phase: 7B.2.1 — ATOMIC OWNER PROVENANCE CLOSEOUT
Status: COMPLETE
Starting SHA: 9d591ffd59719c2bba1dc155d614fd5c9b6a7078
LAST_VALIDATED_IMPLEMENTATION_SHA: 3916594f6e947f7f4665b23751c1d3ec03f5928b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3916594f6e947f7f4665b23751c1d3ec03f5928b
LAST_DOCUMENTATION_CHECKPOINT_SHA: 5bee133496d0eb9820e17a1c8fda41c45592692a
LIVE_HEAD_AUTHORITY: DISCOVER_FROM_GIT
Branch: main
Canonical Git root: /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
Remote: origin -> quantdale/night-watch, main

## Objective

Close the immutable private publication race and uniquely confine tracked
human-review write authority to the explicit interactive owner-review CLI.

## Current Milestone

M6 — Full local, isolated, and adversarial validation.

## Completed Milestones

- M0 bootstrap/recovery/design: COMPLETE.
- M1 atomic no-replace private publication: COMPLETE in the working tree.
- M2 immutable AI artifact migration: COMPLETE in the working tree.
- M3 persistence/concurrency regressions: COMPLETE in the working tree.
- M4 unique owner-decision runtime authority: COMPLETE in the working tree.
- M5 hardening/public-surface tests/private CI: COMPLETE in the working tree.

## Work In Progress

The implementation, focused matrix, full local suite, synthetic campaign,
agent-state matrix, clean-checkout validation, and project documentation are
complete. The clean-checkout fixture portability issue found during closure
was repaired by selecting a sibling temporary base outside the clone
workspace.

## IMMUTABLE_PUBLICATION_PRIMITIVE

Complete owner-only same-directory `wx` temporary, 0600 mode, full JSON
envelope, file fsync, POSIX `fs.linkSync(temp, destination)` create-if-absent
publication, temporary unlink, and containing-directory fsync.

## REPLACE_ON_CONFLICT_STATUS

PASS for the repaired immutable primitive: `EEXIST` maps to
`PRIVATE_ARTIFACT_IMMUTABLE`; no replacement path exists. Unsupported
no-replace errors map to `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` and fail
closed. Non-immutable `writeJson`/`writeIncomplete` retain replacement
semantics by design.

## TEMP_FILE_POLICY

Temporary names stay in the validated private root, use process identity plus
cryptographic randomness, are created with `open(..., 'wx', 0600)`, contain a
complete fsynced payload before publication, and are removed best-effort on
success or failure. Cleanup never scans or deletes unrelated dotfiles and
never removes the winning destination.

## HUMAN_REVIEW_CONCURRENCY_POLICY

First valid complete review publication wins. Exact byte-identical duplicate
review persistence is idempotent. A different valid review is never written
over the winner; the service strictly re-reads the winner and returns
`AI_REVIEW_ALREADY_REVIEWED`. Corrupt, malformed, unsafe, or mismatched state
fails closed.

## GENERATED_ARTIFACT_CONCURRENCY_POLICY

Bug drafts and oracle suggestions are one-shot READY immutable files. Exact
duplicate bytes are idempotent. Same-ID different bytes, including differing
generation metadata, return `AI_REVIEW_ARTIFACT_IMMUTABLE`; corrupt state is
`AI_REVIEW_STATE_INVALID`; no self-heal or replacement occurs.

## OWNER_DECISION_PUBLIC_API_STATUS

PASS: `src/core/aiReview/index.ts` selectively exports read/projection/render
surfaces only. It does not export `recordOwnerDecision`,
`recordConfirmedOwnerDecision`, `createHumanReviewRecord`, or the internal
decision module.

## OWNER_DECISION_CALL_GRAPH

`bin/ai-owner-review.mjs` → TTY check → exact `show/status/decide` parsing and
fixed A/R/S/Q menu → exact `APPROVE`/`REJECT`/`SUPERSEDE` confirmation →
internal `ownerDecision.ts` confirmed writer → `createHumanReviewRecord` →
`AiReviewArtifactStore.writeHumanReview` →
`PrivateArtifactStore.writeImmutableJson` → atomic no-replace publication →
strict digest/identity/read-back verification. No second tracked runtime
writer path exists.

## TTY_GATE_STATUS

PASS and preserved: `decide` requires both `stdin.isTTY` and `stdout.isTTY`
before decision-capable service use.

## DOUBLE_CONFIRMATION_STATUS

PASS and preserved: fixed A/R/S/Q selection followed by exact uppercase
decision-token confirmation; wrong, empty, or interrupted confirmation writes
nothing.

## Files Changed

FILES_CHANGED: See the implementation/config/tests and continuity/task lists
below.

Implementation/config/tests:

- `.github/workflows/hardening.yml`
- `bin/ai-owner-review.mjs`
- `bin/hardening-check.mjs`
- `package.json`
- `src/core/aiReview/index.ts`
- `src/core/aiReview/ownerDecision.ts`
- `src/core/aiReview/ownerReview.ts`
- `src/core/aiReview/storage.ts`
- `src/core/policy/privateArtifacts.ts`
- `tests/fixtures/ai-owner-decision-race-child.mjs`
- `tests/fixtures/private-artifact-race-child.mjs`
- `tests/unit/aiOwnerReview.test.ts`
- `tests/unit/aiReview.test.ts`
- `tests/unit/privateArtifactAtomic.test.ts`
- `tests/unit/support/crossProcessRace.ts`

Continuity/task files:

- `.agent/ACTIVE_TASK.md`
- `.agent/tasks/phase-7b-2-1-atomic-owner-provenance-closeout/SPEC.md`
- `.agent/tasks/phase-7b-2-1-atomic-owner-provenance-closeout/PLAN.md`
- `.agent/tasks/phase-7b-2-1-atomic-owner-provenance-closeout/STATE.md`
- `.agent/tasks/phase-7b-2-1-atomic-owner-provenance-closeout/REPORT.md`

## Validation Ledger

Focused implementation validation already recorded in this session:

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `npm run test:owner-provenance`: PASS, 91 tests.
- `npm run campaign:synthetic`: PASS, 27 tests.
- `npm test -- --workers=1`: PASS, 513 tests.
- `npm run agent:check`: PASS with one expected stale-baseline warning before
  the implementation checkpoint.
- `git diff --check`: PASS.

## ATOMIC_TEST_LEDGER

PASS in scoped tests: first-writer-wins, exact bytes, complete JSON, 0700/0600
policy, privacy-before-temp, retained non-immutable replacement, unsupported
primitive, pre-publication write failure, directory-fsync failure, preexisting
symlink, publication-time symlink race, and cross-process private write.

## CROSS_PROCESS_TEST_LEDGER

PASS in scoped tests: two Node children race on a private payload; two race on
same-ID bug bytes; two race on same-ID oracle bytes; APPROVE_DRAFT versus
REJECT owner decisions; and APPROVE_DRAFT versus SUPERSEDE oracle decisions.
Each leaves one complete winner and a strict loser classification.

## OWNER_AUTHORITY_TEST_LEDGER

PASS in scoped tests: public index exclusion, private raw helper, sole CLI
loader/static call graph, required digest, TTY rejection, decision-argument
rejection, fixed menu, exact confirmation, cancellation, terminal sanitization,
provider/network/enumeration/publication exclusions, and artifact immutability.

## FOCUSED_TEST_LEDGER

PASS — 91 tests in the final scoped matrix: 8 atomic private-publication
tests, 20 owner-review tests, and 63 existing/extended AI review tests. Child
processes use synthetic roots outside the repository.

## FULL_TEST_LEDGER

PASS — full current Playwright suite 513/513; synthetic campaign 27/27;
agent-state suite included in the full run; typecheck, hardening, explicit
agent check, whitespace check, and pre-checkpoint privacy scan pass. Isolated
clean-checkout validation and final manual review remain.

## CLEAN_CHECKOUT_STATUS

PASS — isolated full-history clone at implementation checkpoint
`3916594f6e947f7f4665b23751c1d3ec03f5928b` passed `npm ci --ignore-scripts`,
typecheck, hardening, the 91-test provenance matrix, 32 agent-state tests, the
27-test synthetic campaign, `agent:check`, and `git diff --check` with a
minimal environment and synthetic roots.

## CI_STATUS

PASS for first documentation descendant: exact `Nightwatch hardening` run
`31803168996`, head `5bee133496d0eb9820e17a1c8fda41c45592692a`, completed
successfully. Its `Phase 7B.2.1 atomic private artifact and owner provenance
matrix` step executed and succeeded. A final documentation-only checkpoint
and its exact CI run remain to be pushed/inspected.

## Decisions Made During This Task

- `fs.linkSync` is the filesystem exclusion primitive; replacement-capable
  rename is never an immutable final publication fallback.
- AI immutable artifacts publish complete READY envelopes in one operation;
  non-AI INCOMPLETE workflows remain unchanged.
- Exact duplicate reviews are idempotent; conflicting valid reviews become
  already-reviewed after winner read-back.
- The internal confirmed owner writer requires both exact confirmation and the
  displayed artifact digest; the raw helper is private.

## Discoveries

- The old read-then-rename sequence did not exclude a competing writer.
- Stable artifact IDs can be shared by valid artifacts with different
  `generatedAt` bytes.
- Directory fsync failure is reported after publication without removing the
  winner, so the durability claim remains precise rather than transactional.
- Clean-checkout validation must keep CLI test roots outside the isolated
  clone's workspace parent, just as production private roots stay outside the
  repository/workspace.

## Blockers

None identified. The local POSIX filesystem supports the selected no-replace
hard-link primitive.

## Safety Events

NONE. No model, product, network, database, infrastructure, publication, or
real owner-review activity performed. Synthetic local child processes only.

## Deferred / Follow-Up

- Local-model canary remains future work and was not started.
- Phase 8 remains `NOT_STARTED` and was not started.
- Crash-left hidden temporary cleanup remains documented residual hygiene; no
  broad auto-cleaner is introduced.

## Exact Next Action

Commit/push this final documentation-only anchor update, inspect its exact
GitHub Actions run and atomic/provenance step, verify clean synchronized Git,
then stop.

## Resume Recipe

Read `.agent/ACTIVE_TASK.md`, this task's `SPEC.md`, `PLAN.md`, and `STATE.md`;
inspect `git status --short` and the scoped diff; run the smallest failing
validation first. Never run model/real campaign/auth/DEV/NEXT/production,
database, infrastructure, or publication workflows.

## Completion Snapshot

Implementation/substantive anchor is `3916594f6e947f7f4665b23751c1d3ec03f5928b`.
The first approved documentation descendant is
`5bee133496d0eb9820e17a1c8fda41c45592692a`; the final live documentation
head remains discovered from Git and is not serialized here.
