# Nightwatch published spec baseline integrity

## Purpose

Make the G1-published OpenSpec baseline trustworthy: the archive index is
parsed as data with a strict row grammar, and every published capability has a
real Purpose rather than the archive-CLI stub.

## Starting State

- Change planned at `ebe26ce`; task record created by the
  `nightwatch-open-spec-truth-closure-v1` campaign.
- `ARCHIVE-INDEX.md` declares `nightwatch.openspec-archive-index.v1` and ends
  with a `| 54 | undefined | … |` row that no checker reads; all 56 published
  spec Purposes are `TBD - created by archiving change …` stubs.

## Scope

Parser + diagnostics, negative-probed tests, garbage-row repair, 56 Purpose
fills, and wiring into `AGENT_CONTINUITY`.

## Non-Goals

Requirement rewrites, re-archiving, CLI forks, archiving active changes.

## Safety Constraints

Purpose edits are confined to the `## Purpose` section; requirement and
scenario headings stay byte-stable.

## Architecture / Approach

A focused module next to `openspec-ledger.mjs`, parsed against the existing
markdown table; call-site in `bin/agent-state.mjs` so a malformed index fails
`agent:check` / `gate:local`.

## Milestones

- [ ] M1 — Parser and diagnostics (tasks 1.1–1.2).
- [ ] M2 — Tests and the garbage-row repair (tasks 1.3–1.5).
- [ ] M3 — Purpose rule and the 56 fills (tasks 2.1–2.4).
- [ ] M4 — Closeout (tasks 3.1–3.3).

## Validation Strategy

`tests/unit/openspecArchiveIndex.test.ts`, a heading-diff check over
`openspec/specs/`, `npm run agent:check`, `openspec validate --specs --strict`
and the change's strict validation.

## Decision Log

- 2026-09-14 — Parse the markdown table rather than generate a JSON twin
  (design D1), so the `BLOCKED_NOT_PUBLISHED` reason text stays authoritative.

## Discoveries

- (recorded as measured)

## Deferred Work

None.

## Completion Criteria

Every box ticked with evidence; the index check green with the 54 named rows
unchanged; Purposes filled with heading-diff zero.
