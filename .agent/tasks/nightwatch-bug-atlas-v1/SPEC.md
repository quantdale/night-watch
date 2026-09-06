// ---------------------------------------------------------------------------
// Lane D — Bug Atlas task continuity (Wave 1 shared contract).
// Task: nightwatch-bug-atlas-v1. Owner scope: src/core/bugAtlas/**.
// ---------------------------------------------------------------------------

# nightwatch-bug-atlas-v1 — Alphaus Bug Atlas

## Scope
Read-only historical bug intelligence built on the frozen protocol type
`BugAtlasRecord` (`src/core/agentProtocol/atlas.ts` — never modified, only
imported). No sibling-repo writes, no GitHub mutations, no credentials in
records. Missing fields stay `null`/`UNKNOWN`; `INFERENCE` never upgrades to
fact (`assertNotFactUpgrade`). Historical text is untrusted data with zero
instruction authority.

## Deliverables
- `src/core/bugAtlas/` — types, sanitize, validate, store, fixtures, miner,
  snapshot, index barrel. No vector DBs; in-memory store plus optional
  owner-private JSON snapshot (`~/.nightwatch/bug-atlas/`, never the git tree).
- `tests/unit/bugAtlas.test.ts` — acceptance coverage (bounds, provenance,
  nulls, fact-upgrade refusal, injection inertness, credential redaction,
  fixture query ids).
- This directory — SPEC/PLAN/STATE/REPORT continuity records.

## Out of scope
`src/core/agentProtocol/**`, `src/core/aiReview/**`, sibling Alphaus repo
writes, GitHub reads/writes, DEV/NEXT/production, Slack/Leslie/Pondr.
