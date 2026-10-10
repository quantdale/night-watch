## Context

G1 archived 54 terminal OpenSpec changes into
`openspec/changes/archive/<YYYY-MM-DD>-<id>/` and published 56 specs under
`openspec/specs/`. It wrote `openspec/changes/archive/ARCHIVE-INDEX.md` as the
classification ledger (`nightwatch.openspec-archive-index.v1`) so a
`--skip-specs` archive (the terminal BLOCKED
`nightwatch-final-assurance-release-readiness-hardening-v1`) stays explained.

No checker reads that file. The last row is:

```
| 54 | undefined | CAPABILITY_BEARING | archived with specs; published:  |
```

which is the archive-count leaking into the table. `listArchivedChangeIds` in
`bin/lib/openspec-ledger.mjs` strips the date prefix from **directory names**;
it does not parse the index. The garbage row is therefore invisible to G1's
own ledger agreement check.

Separately, `openspec archive` fills Purpose with
`TBD - created by archiving change <id>. Update Purpose after archive.`
G1.16 required `openspec/specs/` non-empty and `openspec validate --all` exit
0. All 56 published specs still carry that stub (measured 2026-09-14,
`rg -l "TBD - created by archiving" openspec/specs` = 56, `find` = 56).

The requirement bodies themselves are real (they were copied from the
archived deltas). Only Purpose is stub. Filling Purpose is documentation of
already-published behaviour, not a behaviour change.

## Goals / Non-Goals

**Goals:**

- Make ARCHIVE-INDEX a mechanically checked 1:1 table.
- Repair the garbage row.
- Replace 56 stub Purposes with one-paragraph capability statements sourced
  from the archived proposal/spec, without touching requirements.
- Fail the gate if a future archive reintroduces either defect.

**Non-Goals:**

- Rewriting requirement or scenario text.
- Re-running `openspec archive`.
- Vendoring a fork of the OpenSpec CLI.
- Archiving the four still-active changes.
- Using Purpose as a substitute for `docs/CURRENT_STATE.md`.

## Decisions

### D1 — Parse the markdown table; do not invent a JSON twin as the authority

The index is already the human-readable classification record G1 promised.
Adding a parallel JSON file would fork authority (F-08 class). Parse the
existing table with a strict row grammar:

```
^\| ([A-Za-z][A-Za-z0-9._-]*) \| (COMPLETE|BLOCKED|IN_PROGRESS) \| (CAPABILITY_BEARING|BLOCKED_NOT_PUBLISHED|…) \| (.+) \|$
```

Reject any other data row. Header and separator rows are the only other
permitted table lines. Schema declaration must appear above the table.

Alternative rejected: generate the index from directory names on every check
and treat the markdown as a cache. That would silently drop the
BLOCKED_NOT_PUBLISHED *reason* text, which is the whole point of the file.

### D2 — Checker lives in a focused module, called from agent-state

Do not append another 200 lines to `bin/hardening-check.mjs` (5,950 lines;
G16.9 still open to decompose it). Put
`bin/lib/openspec-archive-index.mjs` next to `openspec-ledger.mjs` and call
it from `bin/agent-state.mjs` inside `AGENT_CONTINUITY` (same group that
already owns ledger agreement). Optional also-call from hardening is
unnecessary duplication.

### D3 — Purpose fills are sourced from the archived change, one paragraph

For each `openspec/specs/<cap>/spec.md` whose Purpose is the stub, take the
first paragraph of `openspec/changes/archive/<date>-<matching-change>/proposal.md`
`## Why` (or the archived `specs/<cap>/spec.md` if the proposal is too
campaign-specific). Edit only to drop campaign-local SHA/date noise so the
published Purpose is capability-shaped, not "measured at 36bd493".

A mechanical bound: Purpose body ≤ 800 characters, ≥ 40 characters, no
`TBD`, no `Update Purpose after archive`.

Alternative rejected: leave Purpose as the change id. That still does not
tell an implementer what the capability *is*.

### D4 — CAPABILITY_BEARING published names are split on comma/space after `published:`

Current reason text looks like
`archived with specs; published: campaign-yield-scheduling, replay-reliability, task-verdict-protocol`.
Parse the substring after `published:`. Empty after `published:` on a
CAPABILITY_BEARING row fails (this is exactly the garbage row).
`BLOCKED_NOT_PUBLISHED` rows MUST NOT contain `published:`.

## Risks / Trade-offs

- **[Risk] Purpose fills accidentally edit a requirement.** → Mitigation: the
  fill task is mechanically constrained to the `## Purpose` section (lines
  after that heading until the next `##`). A test snapshots requirement
  headings before/after on a fixture, and the implementation PR lists a
  heading-diff of zero on the 56 files.
- **[Risk] The OpenSpec CLI re-stubs Purpose on a future archive.** → Mitigation:
  the gate fails on the stub, so a future G1-style archive cannot land
  green without a Purpose fill. We do not need to patch the CLI.
- **[Risk] Classification vocabulary grows.** → Mitigation: the parser
  allowlists the classification tokens already used in the index
  (`CAPABILITY_BEARING`, `BLOCKED_NOT_PUBLISHED`). An unknown token fails
  closed rather than being stored as a string.

## Migration Plan

1. Implement parser + tests against a copy of the current index (must fail
   on the garbage row).
2. Delete the garbage row (the 54 named rows already match 54 directories).
3. Turn the check on (blocking).
4. Fill Purposes in one or more follow-up commits in the same change; each
   commit stays heading-diff-clean.
5. Rollback: revert checker and Purpose fills independently; index repair is
   a one-line deletion and should stay.

## Open Questions

None. Classification token allowlist is taken from the current index plus
the G1 spec's two classes.

## Affected surfaces

- `openspec/changes/archive/ARCHIVE-INDEX.md`
- `openspec/specs/**/spec.md` (Purpose only)
- `bin/lib/openspec-archive-index.mjs` (new)
- `bin/agent-state.mjs` (call site)
- `tests/unit/openspecArchiveIndex.test.ts` (new)

## Testing strategy

- Fixture index with the real garbage row → `ARCHIVE_INDEX_MALFORMED_ROW`
- Row without a matching directory → `ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY`
- `published: missing-spec` → `ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING`
- Stub Purpose → `PUBLISHED_SPEC_PURPOSE_STUB`
- Current index after garbage-row deletion + stub purposes still present →
  Purpose failures only
- After fills, both clauses pass; requirement-heading snapshot equal
