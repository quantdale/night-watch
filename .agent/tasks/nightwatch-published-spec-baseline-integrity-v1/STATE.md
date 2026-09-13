# Task State

## Identity

Task ID: nightwatch-published-spec-baseline-integrity-v1
Phase: PUBLISHED_SPEC_BASELINE_INTEGRITY_V1
Status: IN_PROGRESS
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Branch: session/nightwatch-open-spec-truth-closu-7138ca21
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_VALIDATED_IMPLEMENTATION_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PUBLISHED_SPEC_BASELINE_INTEGRITY_V1_STATUS: IN_PROGRESS

## Objective

Implement `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/`
so the archive index and the published spec Purposes are machine-checked and
substantive.

## Current Milestone

Milestone ID: M4 — closeout (tasks 3.1–3.3); M1–M3 are complete.

## Completed Milestones

- M1 — parser and diagnostics (tasks 1.1–1.2): `bin/lib/openspec-archive-index.mjs`
  parses the index with a strict four-column grammar and the
  `ARCHIVE_INDEX_SCHEMA_MISMATCH` / `ARCHIVE_INDEX_MALFORMED_ROW` /
  `ARCHIVE_INDEX_DUPLICATE_ROW` / `ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY` /
  `ARCHIVE_INDEX_DIRECTORY_WITHOUT_ROW` / `ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING` /
  `ARCHIVE_INDEX_BLOCKED_ROW_PUBLISHES` diagnostics.
- M2 — tests and the garbage-row repair (tasks 1.3–1.5): the trailing
  `| 54 | undefined | … |` row is deleted; `tests/unit/openspecArchiveIndex.test.ts`
  reproduces it as a failing fixture and the live tree as a passing one; the
  parser is called from `bin/agent-state.mjs`.
- M3 — Purpose rule and the 56 fills (tasks 2.1–2.4):
  `PUBLISHED_SPEC_PURPOSE_STUB` enforces non-stub, 40–800-character Purposes;
  all 56 are filled from the archived proposal/spec with 23 curated
  capability statements; heading-diff before/after is zero; `openspec
  validate --specs --strict` is 56 passed / 0 failed.
- M4 — closeout (tasks 3.1–3.3): `agent:check` PASS with the parser wired;
  the change's strict OpenSpec validation PASS; no re-archive and no
  requirement-body rewrite.

## Work In Progress

All 12 boxes are ticked with the evidence below; the change awaits the
programme integration checkpoint and closure, which updates this record's
anchors and marks it COMPLETE.

## Exact Next Action

Record the closure evidence and mark this task COMPLETE at the programme
integration checkpoint, then continue with
`nightwatch-validation-classification-and-skip-truth-v1`.

## Files Changed

Pending: `bin/lib/openspec-archive-index.mjs`,
`tests/unit/openspecArchiveIndex.test.ts`,
`openspec/changes/archive/ARCHIVE-INDEX.md`, `openspec/specs/*/spec.md`
(Purpose only), `bin/agent-state.mjs`,
`openspec/changes/nightwatch-published-spec-baseline-integrity-v1/tasks.md`.

## Validation Ledger

- `npx playwright test tests/unit/openspecArchiveIndex.test.ts --workers=1` —
  PASS, 12 tests: the trailing garbage row fails with its line number, bare
  integer/undefined Change cells fail, missing directory, directory without
  row, missing published spec, BLOCKED_NOT_PUBLISHED with `published:`, a
  well-formed 1:1 index, stub/empty/short/long Purposes, the live index and
  the 56 live Purposes.
- `inspectArchiveIndex(root).errors` = 0 and
  `inspectPublishedSpecPurposes(root)` = 0 errors / 56 capabilities on the
  live tree (recorded 2026-09-14).
- Heading diff (all `### Requirement:` and `#### Scenario:` lines,
  `HEAD` vs working tree) — zero.
- `npm run agent:check` — PASS.
- `npm run typecheck` — PASS.
- `openspec validate --specs --strict` — 56 passed / 0 failed.
- `openspec validate nightwatch-published-spec-baseline-integrity-v1 --strict`
  — PASS.
- `npm run validation:universe` — PASS after registering
  `bin/lib/openspec-archive-index.mjs` (BIN_SYNTAX) and the two new suites
  (FULL_REGRESSION); stored `inventoryDigest` refreshed to the computed
  `sha256:075a9b1397c5e7cf043c4cb9` under the existing G2/G3 convention.
- `node bin/hardening-check.mjs` — PASS.

## Decisions Made During This Task

See `PLAN.md` Decision Log.

## Discoveries

- (recorded as measured)

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

None.

## Resume Recipe

1. Read the change's `design.md` D1–D4.
2. Implement in task order; regenerate the heading snapshot before and after
   the Purpose fills and compare.
3. Tick boxes only with the evidence recorded here.

## Completion Snapshot

The task is IN_PROGRESS; no completion snapshot exists yet.
