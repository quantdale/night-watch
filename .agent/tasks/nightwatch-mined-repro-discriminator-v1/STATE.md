# Task State

## Identity

Task ID: nightwatch-mined-repro-discriminator-v1
Phase: R_MINED_REPRO_DISCRIMINATOR_V1
Status: COMPLETE
Starting SHA: d2aa960c2491817c70cd36f422b0e20c58dcc80d
Last validated implementation SHA: a842f9bdf67e41bf962262c6a25fb82b34056560
Last substantive checkpoint SHA: a842f9bdf67e41bf962262c6a25fb82b34056560
Branch: session/nightwatch-mined-repro-discrimin-c85df9d9
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: d2aa960c2491817c70cd36f422b0e20c58dcc80d
LAST_VALIDATED_IMPLEMENTATION_SHA: a842f9bdf67e41bf962262c6a25fb82b34056560
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a842f9bdf67e41bf962262c6a25fb82b34056560
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_R_MINED_REPRO_DISCRIMINATOR_V1_STATUS: COMPLETE

## Objective

Give mined historical benchmark cases a real, mechanically-proven reproduction
instead of a permanently zero `reproductionCount`, without leaking hidden
ground truth and without handing out reproduction credit for free.

## Current Milestone

COMPLETE / STOP. The contained replay engine exists, is wired behind the
file-grounding gate, and produced a real `REPRODUCED` verdict on a real
historical defect. No further implementation remains in this task.

## Completed Milestones

- M1 — Contained replay engine (`src/core/benchmark/containedTestReplay.ts`):
  read-only blob-by-blob materialization of PRE-FIX and POST-FIX trees, offline
  vendored `go test`, four-way verdict classification, bounded output, hard
  timeout, process-tree kill, temp-tree cleanup — COMPLETE.
- M2 — Mined-case wiring (`case.ts`, `minedCases.ts`, `hunt.ts`,
  `huntDossier.ts`, `index.ts`): hidden `minedReplay` descriptor, neutral
  fixed-template reasoner-visible verdict, `fileHits > 0` anti-inflation gate,
  neutral dossier — COMPLETE.
- M3 — Offline proofs (`tests/unit/containedTestReplay.test.ts`, 21 tests over
  throwaway temp repositories): every classification branch, timeout, cleanup,
  sibling-not-mutated, and the leak canary — COMPLETE.
- M4 — Real-case execution against `mobingilabs/ouchan` — COMPLETE.

## Work In Progress

Task complete. No implementation work remains.

## Exact Next Action

STOP — task complete.

## Validation Ledger

Command: `npm run typecheck`
Result: PASS

Command: `npm run hardening:check`
Result: PASS

Command: `npx playwright test tests/unit/containedTestReplay.test.ts
tests/unit/benchmark.test.ts tests/unit/minedCases.test.ts
tests/unit/historicalRediscovery.test.ts --project=nightwatch --workers=1`
Result: PASS — 53 passed, no test deleted or weakened. Re-run independently by
the orchestrator before integration with the same result.

Command: real contained replay, `mobingilabs/ouchan` fix
`5985281b43cd9dd2191a2bca17fb2e5ca7d2720a`, package
`services/billingd/services/billingsvc`
Result: `REPRODUCED` / `PRE_FAIL_POST_PASS` — pre-fix `FAIL/TESTS_FAILED`
exit 1, post-fix `PASS/TESTS_PASSED` exit 0, ~70.5s, 0 skipped submodules,
empty stderr head. Reproduced independently by the orchestrator.

Command: sibling integrity check (`git -C .../ouchan status --porcelain`,
`worktree list`, `rev-parse HEAD`)
Result: PASS — single worktree, `HEAD` unchanged at `565f00a8`, 72 pre-existing
porcelain entries all with mtimes predating this session.

## Decisions Made During This Task

Decision: materialize trees blob-by-blob with `git show` rather than
`git archive`.
Reason: `git archive` was measured to be unfaithful under `export-ignore`.
Evidence/constraint: verified live against the ouchan repository; a regression
test now pins the behaviour.

Decision: refuse the replay unless the candidate already named a real pre-fix
snapshot file.
Reason: otherwise any reasoner could obtain a reproduction verdict for free,
inflating the primary programme KPI.

## Discoveries

- Two real defects were found and fixed in flight: an absolute-path hole in the
  descriptor parser, and the `git archive` unfaithfulness described above.

## Blockers

None.

## Safety Events

NONE. No sibling repository was mutated. No DEV/NEXT/production contact. No
credentials in source, tests, artifacts, or commit messages.

## Deferred / Follow-Up

- TypeScript replay (Pondr) is offline-blocked: no local `node_modules` and no
  network. Only sibling repositories that vendor their dependencies and whose
  fix added a runnable test can currently be replayed.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: a842f9bdf67e41bf962262c6a25fb82b34056560
Live HEAD: DISCOVER_FROM_GIT
Tests: containedTestReplay 21, acceptance set 53/53 PASS
Artifacts: contained replay engine, mined replay descriptor, neutral dossier,
real `REPRODUCED` verdict on `mobingilabs/ouchan`
