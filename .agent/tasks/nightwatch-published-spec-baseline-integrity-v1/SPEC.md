# SPEC.md

**Task:** nightwatch-published-spec-baseline-integrity-v1
**Campaign:** OpenSpec truth-surface closure
**Objective:** Implement the OpenSpec change
`nightwatch-published-spec-baseline-integrity-v1`: make the archive index a
machine-checked 1:1 table, repair its trailing garbage row, and replace the 56
archive-stub Purposes with capability-shaped paragraphs without touching any
requirement body.

**Scope:**

- `bin/lib/openspec-archive-index.mjs` strict parser and the
  `ARCHIVE_INDEX_*` / `PUBLISHED_SPEC_PURPOSE_STUB` diagnostics, called from
  `bin/agent-state.mjs` inside `AGENT_CONTINUITY`.
- `tests/unit/openspecArchiveIndex.test.ts` negative probes.
- The one-line garbage-row repair and the 56 Purpose fills under
  `openspec/specs/` with a heading-diff of zero.

**Non-goals:** rewriting requirement bodies, re-running `openspec archive`,
arching the still-active changes, or editing archived change documents.

**Safety constraints:** edit only the `## Purpose` section of published
specs; no SHA, receipt, count or date in any spec body is altered.

**Acceptance criteria:** `npm run agent:check` PASS with the parser wired in;
`openspec validate --specs --strict` PASS after the fills; the change's own
strict validation PASS.

**Deliverables:** the parser module, the test, the repaired index and the 56
filled Purposes.

**## Declared Deletions:**

NONE
