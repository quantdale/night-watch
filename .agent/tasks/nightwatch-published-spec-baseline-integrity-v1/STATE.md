# Task State

## Identity

Task ID: nightwatch-published-spec-baseline-integrity-v1
Phase: PUBLISHED_SPEC_BASELINE_INTEGRITY_V1
Status: COMPLETE
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Branch: session/nightwatch-open-spec-truth-closu-7138ca21
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_VALIDATED_IMPLEMENTATION_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PUBLISHED_SPEC_BASELINE_INTEGRITY_V1_STATUS: COMPLETE

## Objective

Implement `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/`
so the archive index and the published spec Purposes are machine-checked and
substantive.

## Current Milestone

COMPLETE / STOP — M1 through M4 are closed and the change is integrated in
the W1 checkpoint.

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

None. All 12 boxes are ticked with evidence and the change is integrated.

## Exact Next Action

STOP — this change is complete. A future campaign requires its own
authorization and its own task directory.

## Files Changed

- `bin/lib/openspec-archive-index.mjs` (new, + `.d.mts`) — the strict index
  parser and the Purpose rule.
- `bin/agent-state.mjs` — call site inside `AGENT_CONTINUITY`.
- `tests/unit/openspecArchiveIndex.test.ts` (new).
- `openspec/changes/archive/ARCHIVE-INDEX.md` — the garbage row removed.
- `openspec/specs/*/spec.md` — 56 Purpose fills only.
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/tasks.md`
  and this task directory.

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
- `npm run agent:check`, `npm run typecheck`, `node bin/hardening-check.mjs`
  — PASS.
- `openspec validate --specs --strict` — 56 passed / 0 failed;
  `openspec validate nightwatch-published-spec-baseline-integrity-v1 --strict`
  — PASS.
- `npm run validation:universe` — PASS after registering the module and the
  suite; stored `inventoryDigest` refreshed under the G2/G3 convention.
- `npm run gate:local` at `6bc70522` — PASS, all eleven required groups,
  receipt `receipt:sha256:204417295a4935d7857cb6b2`.
- `npm test` at `6bc70522` — PASS, 5127 passed / 18 skipped / 0 failed.

## Decisions Made During This Task

See `PLAN.md` Decision Log. Purposes are sourced from the archived proposal
`## Why` or opening paragraph when capability-shaped, otherwise from the
published spec's first requirement paragraph, with 23 curated statements
where the mechanical source read as campaign-local or implementation-specific.

## Discoveries

- The archive directory's absence (fixture roots) must not fail the index
  check; only an archive without a readable index is malformed.
- The published specs aggregate a change's requirements, so the first
  requirement is not always the best Purpose source.

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

None.

## Resume Recipe

Task complete. Do not resume this task. The baseline integrity is integrated;
a future archive must fill Purpose or the gate fails.

## Completion Snapshot

- The change is COMPLETE: all 12 boxes ticked with evidence and integrated.
- The archive index is a strict 1:1 table with its garbage row repaired, and
  every published capability states its purpose in 40–800 characters.
- Requirement and scenario headings are byte-stable; no receipt, SHA, count
  or date in any spec body changed.
