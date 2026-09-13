## 1. Archive-index parser and the garbage row

- [ ] 1.1 Add `bin/lib/openspec-archive-index.mjs` that parses `openspec/changes/archive/ARCHIVE-INDEX.md` against schema `nightwatch.openspec-archive-index.v1` with a strict four-column row grammar (Change id, Task status, Classification allowlist, Reason)
- [ ] 1.2 Fail `ARCHIVE_INDEX_MALFORMED_ROW` on a Change cell that is empty, `undefined`, or a bare integer; fail `ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY` / `ARCHIVE_INDEX_DIRECTORY_WITHOUT_ROW` on 1:1 mismatches with `openspec/changes/archive/*/` (date prefix stripped); fail `ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING` when a `CAPABILITY_BEARING` `published:` name has no `openspec/specs/<name>/spec.md`; fail when a `BLOCKED_NOT_PUBLISHED` row contains `published:`
- [ ] 1.3 Add `tests/unit/openspecArchiveIndex.test.ts` that reproduces the current trailing `| 54 | undefined | … |` row as a failing fixture, plus missing-directory, missing-spec, and well-formed 1:1 cases
- [ ] 1.4 Delete the trailing garbage row from `ARCHIVE-INDEX.md`; leave the 54 named rows and their classifications unchanged
- [ ] 1.5 Call the parser from `bin/agent-state.mjs` inside `AGENT_CONTINUITY` so a malformed index fails `agent:check` / `gate:local`

## 2. Published spec Purpose

- [ ] 2.1 Add `PUBLISHED_SPEC_PURPOSE_STUB` when `openspec/specs/<cap>/spec.md` `## Purpose` is empty, `TBD`, or matches `TBD - created by archiving change`; bound Purpose body to 40–800 characters
- [ ] 2.2 Fill each of the 56 stub Purposes from the archived change's `proposal.md` `## Why` (or archived spec) as one capability-shaped paragraph; edit only the Purpose section
- [ ] 2.3 Prove a heading-diff of zero: every `### Requirement:` and `#### Scenario:` heading in `openspec/specs/` is unchanged; no SHA, receipt, or census figure in those bodies is altered
- [ ] 2.4 `openspec validate --specs --strict` PASS after the fills

## 3. Closeout

- [ ] 3.1 `npm run agent:check` PASS on the repaired index + filled Purposes; the 1.3 fixtures still fail when the garbage row is reintroduced
- [ ] 3.2 `openspec validate nightwatch-published-spec-baseline-integrity-v1 --strict` PASS
- [ ] 3.3 Do not re-run `openspec archive` and do not rewrite requirement bodies
