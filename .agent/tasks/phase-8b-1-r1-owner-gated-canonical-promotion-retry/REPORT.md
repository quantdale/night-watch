# Nightwatch Phase 8B.1-R1 — Owner-Gated Canonical Promotion Retry — Report

- Starting SHA: `a12431522d8545ba94c71ee7f4e6189837342961`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT (canonical adoption commit
  `24fc437f8171a8cb6466423e069380d430bdac11` is the validated implementation
  checkpoint; final docs SHA discovered from Git)
- Task objective: replace the empty-only canonical-catalog CI assumption with
  a catalog-integrity invariant, then execute exactly one fresh owner-gated
  canonical promotion end to end and close the retry task under continuity
  protocol v2.
- Changes: `.github/workflows/hardening.yml` (catalog-integrity step),
  `bin/hardening-check.mjs` (cardinality-agnostic assertions),
  `bin/selfdev-catalog-integrity.mjs` (new read-only check),
  `src/core/selfDev/provenanceManifest.ts` (+1 authoritative path),
  `tests/unit/selfDevAdoptionCatalog.test.ts` (+4 tests),
  `src/core/selfDev/adoptedCaseCatalog.generated.ts` (THE ONE canonical
  adoption: 1 entry), task records, docs.
- Tests/validation: readiness exact CI 31886682576 @ a319849 success (all 22
  steps incl. catalog integrity at EMPTY); canonical exact CI 31887666112 @
  24fc437 success (all 22 steps incl. catalog integrity at COUNT 1); final
  docs exact CI recorded in the task handoff; full Playwright 751/4/0 (clean
  one-entry rehearsal), 752/1/2 (real dirty window — 2 documented
  dirty-tree-only CLI tests), post-commit isolated run 0 failed;
  owner-provenance 91; campaign:synthetic 27; AI regressions 98;
  typecheck/hardening/agent:check/agent:audit/diff all PASS.
- Decisions: see PLAN.md Decision Log (catalog-integrity bin over
  cardinality-locked regex; frozen base without mid-flight commits; the 2
  dirty-tree-only failures are documented/deterministic, not semantic).
- Safety events: NONE. Zero DEV/NEXT/production contacts, zero
  database/infrastructure queries, zero external AI/model calls, zero
  publication, zero Alphaus writes, zero runtime Git writes. Exactly one
  canonical source write (the authorized APPLY), one canonical commit, one
  consumed fresh approval; historical approval never reused.
- Deferred items: variant B remains available-not-adopted (separate
  authorization required); portfolio expansion beyond A+B; historical
  contract-digest process-binding characteristic.
- Remaining blockers: none.
- Recommended next phase/task: STOP. No second approval/APPLY; no B adoption.

Status: COMPLETE
