# Proposal — Published spec baseline integrity

## Why

G1 of the production completion programme archived 54 terminal changes and
published 56 capability specs so the project would finally have a consolidated
statement of what Nightwatch is required to do. Measured at HEAD `ebe26ce` on
2026-09-14, that baseline is structurally present (`openspec list --specs`
returns 56 names, `openspec doctor` is ok) and substantively untrustworthy:

1. `openspec/changes/archive/ARCHIVE-INDEX.md` declares schema
   `nightwatch.openspec-archive-index.v1` and then ends with a garbage row
   `| 54 | undefined | CAPABILITY_BEARING | archived with specs; published:  |`.
   No source file references the index. Nothing validates it.
2. **Every** published spec under `openspec/specs/` has Purpose
   `TBD - created by archiving change <id>. Update Purpose after archive.`
   G1.16 required only that the directory be non-empty and that
   `openspec validate --all` exit zero. The archive CLI's stub purpose
   satisfied that bar. The baseline therefore cannot answer "what is this
   capability for" without reading the archived change.

A capability baseline whose index contains `undefined` and whose 56 purposes
are identical stubs is the same class of defect F-01 named for the pre-archive
ledger: the project's own answer surface is untrustworthy. G1's checked boxes
1.14–1.16 claim this work is done; the artefacts they produced need a
mechanical integrity layer they do not have.

## What Changes

- Treat `ARCHIVE-INDEX.md` as data: parse the table, require a 1:1 match with
  `openspec/changes/archive/*/` directories (date-prefix-stripped names),
  forbid `undefined` / empty change ids, and require every
  `CAPABILITY_BEARING` "published:" name to exist under `openspec/specs/`.
  `BLOCKED_NOT_PUBLISHED` rows MUST list zero published specs.
- Repair the trailing garbage row as part of making the check green.
- Require every published spec's Purpose to be a non-stub statement of the
  capability (not the archive CLI placeholder, not empty, not `TBD`).
- Fill those purposes from the archived change's proposal/spec (prose
  preserved, no receipt/SHA/count rewrites) so the baseline is readable.
- Register the check in `AGENT_CONTINUITY` or `HARDENING_CHECK` with negative
  probes (extra row, missing directory, stub purpose, published name that
  does not exist).

No product runtime behaviour changes. No re-archiving. No `--no-validate`.

## Capabilities

### New Capabilities

- `published-spec-baseline-integrity`: the G1-published OpenSpec baseline
  (archive index + `openspec/specs/` purposes) SHALL be machine-checked
  against the archive directories and the spec files, and SHALL NOT contain
  archive-CLI stubs or unparseable rows.

### Modified Capabilities

None. `completion-ledger-truth` lives only inside the still-active production
completion change and governs change↔task checkbox agreement, not archive-index
or spec Purpose text. This capability is the missing integrity layer *on the
artefacts G1 already published*.

## Impact

- `openspec/changes/archive/ARCHIVE-INDEX.md` (repair the malformed row;
  keep every existing classification)
- `openspec/specs/*/spec.md` Purpose lines only (56 files; requirement text
  and scenarios stay byte-stable)
- A new checker in `bin/` (prefer a focused module consumed by
  `bin/agent-state.mjs` or `bin/hardening-check.mjs`, not a 200-line addition
  to the 5,950-line hardening file without a module boundary)
- `tests/unit` negative probes over disposable index/spec fixtures
- `openspec validate --specs --strict` remains required and must still pass
  after Purpose fills

## Evidence (measured 2026-09-14, HEAD `ebe26ce`)

| Claim | Measurement |
|---|---|
| Archive directories | 54 |
| `ARCHIVE-INDEX.md` rows matching `^\| nightwatch-` | 54 |
| Extra malformed row | `\| 54 \| undefined \| CAPABILITY_BEARING \| archived with specs; published:  \|` |
| Code references to `ARCHIVE-INDEX` | **0** (`rg` over `src`, `bin`, `tests`) |
| Published specs | 56 |
| Specs whose Purpose is the archive stub | **56 / 56** |
| G1.16 as recorded | directory non-empty, `openspec list --specs` non-empty, validate exits 0 |

## Out of scope

- Re-deriving or rewriting requirement bodies and scenarios
- Archiving the four still-active changes
- Changing OpenSpec CLI archive behaviour upstream (we can wrap or
  post-process; we do not vendor a fork)
- Completing production-completion G1.18 integration/release
- Filling TBD in archived *change* documents under
  `openspec/changes/archive/*/`; only the *published* `openspec/specs/`
  baseline is in scope

## Dependencies

- Depends on G1 having archived the 54 changes and published the 56 specs
  (already on `main`).
- Independent of `agent-continuity-live-waypoint` and
  `validation-classification-and-skip-truth`.
- Purpose fills MUST NOT alter requirement identifiers, scenario names, or
  any SHA/receipt/count already in those spec bodies.
