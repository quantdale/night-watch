# Nightwatch Phase 8B.1-R1 — Owner-Gated Canonical Promotion Retry

## Purpose

Replace the empty-only canonical-catalog CI assumption with a
catalog-integrity invariant, then execute exactly one fresh owner-gated
canonical promotion end to end (fresh session -> sandbox proof -> one-entry
future-state rehearsal -> one intent -> one approval -> one APPLY -> verify ->
commit -> exact CI -> post-commit continuation proof) and close the task under
continuity protocol v2.

## Starting State

- Task ID: `phase-8b-1-r1-owner-gated-canonical-promotion-retry`
- Starting Nightwatch SHA: `a12431522d8545ba94c71ee7f4e6189837342961`
- Relevant architecture: `src/core/selfDev/` (pure evaluation + catalog
  schema/renderer + portfolio), `src/core/selfDevSandbox/` (disposable mirror
  adoption), `src/core/selfDevPromotion/` (the one canonical-write boundary),
  `src/core/provenance/localGit.ts` (read-only Git DTOs), `bin/*.mjs`
  (exact-ID CLIs), `.github/workflows/hardening.yml` + `bin/hardening-check.mjs`
  (CI gates), `.agent/templates/*` + `bin/agent-state.mjs` (continuity v2).
- Dependencies: node_modules installed (playwright, typescript).
- Established facts that must not be rediscovered:
  - Empty-only gates: hardening.yml step "Phase 8B.1.0 checkout cleanliness
    (real catalog must stay empty)" (grep `SELFDEV_ADOPTED_CASES = [];`) and
    hardening-check.mjs `checkPhase8B10PortfolioIntegrity` (rejects non-empty
    real catalog).
  - CLI syntaxes (from source): `selfdev:adopt-sandbox -- inspect|plan|run`
    (run confirm token `SANDBOX_ONLY`); `selfdev:promote-canonical --
    inspect|prepare|approve|apply|verify|status` (approve confirm token
    `CANONICAL_ONE_FILE_ONLY`); `selfdev:synthetic` (no options).
  - Portfolio: EMPTY -> EXPAND_SUMMARY (A); A -> EXPAND_THEN_COLLAPSE (B);
    A+B -> EXHAUSTED (null), passCandidateCount 0 is a valid terminal state.
  - Historical approval consumed (1 approval + 1 consumption record).
  - Private store root: `$HOME/.nightwatch/findings/selfdev-canonical-promotion/`
    (approvals / approval-consumption / promotions / receipts / verifications).
  - The canonical catalog target is
    `src/core/selfDev/adoptedCaseCatalog.generated.ts` (pure data, max 64
    entries, digest ffe3d635... at EMPTY).
  - Post-apply state is intentionally dirty in exactly that one file;
    `verify` requires fresh-process invocation semantics (fresh module load
    per call) and must run before the development commit.

## Scope

Readiness transition (workflow + hardening + integrity check + tests +
continuity records; NOT the generated catalog), fresh selfDev/sandbox
artifacts, one-entry disposable rehearsal, one real promotion
(prepare/approve/apply/verify), canonical commit + exact CI, post-commit
continuation proof (B eligible, isolated regression), continuity v2 closure +
docs finalization + final exact CI.

## Non-Goals

Second approval/APPLY; promoting B; changing promotion semantics; rewriting
the historical 8B.1 record; Phase 6 / real product / AI / publication /
database / infrastructure work.

## Safety Constraints

One canonical source write max; zero runtime Git writes; zero external calls;
approval consumed atomically before the write; rehearsal clones disposable and
never pushed; rollback (only after successful APPLY + failed acceptance gate)
restores the exact preimage bytes as a development action; then STOP with a
classification.

## Architecture / Approach

- **Catalog integrity check (new).** `bin/selfdev-catalog-integrity.mjs`:
  read-only, whole-repo cleanliness via `assertRepositoryFullyClean`-equivalent
  `git status --porcelain` empty; fresh-load the repository's own
  `adoptedCases.ts` (via the established require-extensions loader);
  `validateAdoptedCatalog(SELFDEV_ADOPTED_CASES)`; byte-compare the on-disk
  generated file with `renderAdoptedCatalogSource(SELFDEV_ADOPTED_CASES)`;
  verify pure-data shape (no imports/functions/executable code) and count <=
  `SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES`. Cardinality-agnostic (0/1/2/...).
- **Workflow step replacement.** Rename "Phase 8B.1.0 checkout cleanliness
  (real catalog must stay empty)" to "Phase 8B.1 catalog integrity / checkout
  cleanliness": `test -z "$(git status --porcelain)"` + run the new script.
- **Hardening replacement.** `checkPhase8B10PortfolioIntegrity` no longer
  requires the empty array; instead requires the generated file to be pure
  declarative data (no imports/functions/expressions), the integrity bin to
  exist, and the workflow to invoke it.
- **Tests.** Extend `tests/unit/selfDevAdoptionCatalog.test.ts` with
  cardinality-agnostic live-file byte-roundtrip proof + one-entry/two-entry
  fixture validations + noncanonical-byte rejection; existing tests unchanged.
- **Fresh chain.** After readiness CI green at the frozen base HEAD:
  `selfdev:synthetic` -> `adopt-sandbox inspect/plan/run` -> disposable
  one-entry clone rehearsal (write planned postimage, local commit, full
  suite + portfolio B selection) -> `promote-canonical prepare` -> `approve`
  -> `apply` -> fresh `verify` -> post-apply regression -> canonical commit ->
  exact CI -> currentness `status` -> fresh post-commit session (B) ->
  isolated regression -> continuity closure.

## Milestones

### M1 — Bootstrap, recovery reads, v2 task creation, safety snapshot, approval recheck, assumption audit

- Objective: verify CASE D; create task records; record pre-task digests;
  recheck historical approval consumed; classify every empty-catalog
  occurrence A–E.
- Files/areas: `.agent/tasks/phase-8b-1-r1-*/`, `.agent/ACTIVE_TASK.md`,
  repo-wide grep audit.
- Acceptance criteria: snapshot recorded; approval consumed (1+1 records);
  audit table complete; only D-class items flagged for change.
- Validation commands: `git rev-parse HEAD`, `sha256sum` catalog,
  read-only approval store recheck, repo-wide grep.
- Status: DONE

### M2 — Catalog-integrity invariant implementation (workflow + hardening + bin + tests)

- Objective: replace both empty-only gates with cardinality-agnostic
  catalog-integrity semantics; add focused tests.
- Files/areas: `.github/workflows/hardening.yml`,
  `bin/hardening-check.mjs`, `bin/selfdev-catalog-integrity.mjs`,
  `src/core/selfDev/provenanceManifest.ts`, `tests/unit/selfDevAdoptionCatalog.test.ts`.
- Acceptance criteria: typecheck + hardening PASS; new integrity check PASS
  at EMPTY; focused catalog tests green; no existing test weakened; generated
  catalog file untouched (digest ffe3d635..., count 0).
- Validation commands: `npm run typecheck`, `npm run hardening:check`,
  `node bin/selfdev-catalog-integrity.mjs`, catalog test file,
  `git diff --check`.
- Status: DONE

### M3 — Readiness validation suite

- Objective: full pre-commit validation per authorization §14.
- Files/areas: none (validation only).
- Acceptance criteria: typecheck, hardening, focused selfDev lineage,
  owner-provenance, campaign:synthetic, agent:check, agent:audit, diff check
  all PASS.
- Validation commands: as listed in §14 of the authorization.
- Status: DONE (12/12 catalog tests, 83/83 focused matrix, 71/1 lineage,
  typecheck/hardening/agent:check/agent:audit/owner-provenance 91/campaign
  27/diff all PASS)

### M4 — Readiness commit, push, exact CI

- Objective: commit readiness (no generated-catalog change), push
  fast-forward, wait exact hardening CI on that SHA, all steps green incl.
  the new catalog-integrity step at EMPTY.
- Acceptance criteria: HEAD == origin/main == readiness SHA; exact CI
  completed/success; catalog still empty; this SHA becomes the frozen
  promotion base.
- Validation commands: `git status`, `git push origin main`, GitHub Actions
  run inspection.
- Status: DONE

### M5 — Fresh synthetic session + sandbox proof at the frozen base

- Objective: fresh v2 artifact (replay PASS, candidate A eligible,
  passCandidateCount 1) and fresh sandbox plan/run
  (SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED, five probes PASS, counters
  1/0/0/0, cleanup PASS).
- Acceptance criteria: all required fields recorded; canonical checkout
  untouched.
- Validation commands: `npm run selfdev:synthetic`,
  `npm run selfdev:adopt-sandbox -- inspect|plan|run`.
- Status: DONE

### M6 — Disposable one-entry future-state rehearsal

- Objective: full-history isolated clone at the frozen base; write the exact
  planned postimage; temporary local-only commit; full suite + CI-equivalent
  gates + portfolio B selection inside that checkout; never push.
- Acceptance criteria: full Playwright 0 failed; new catalog-integrity step
  semantics PASS with one entry; `selfdev:synthetic` selects B with
  passCandidateCount 1 and replay PASS.
- Validation commands: all §21 commands in the disposable checkout.
- Status: DONE

### M7 — Promotion prepare + exactly one approval

- Objective: `promote-canonical prepare` at the frozen base from fresh
  artifacts; record intent; create exactly one fresh one-shot approval with
  `CANONICAL_ONE_FILE_ONLY`; record consumed=false before apply.
- Acceptance criteria: intent pre/post digests exact; approval ID differs
  from historical; zero writes so far; no Git changes after prepare.
- Validation commands: `npm run selfdev:promote-canonical -- prepare|approve`.
- Status: DONE

### M8 — Exactly one canonical APPLY + fresh-process verify

- Objective: one real APPLY (APPLIED, one changed file, digest exact,
  counters 1/0/0/0); fresh-process verify
  (`CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`, four probes PASS, 0/0/0);
  approval consumed=true; dirty-tree shape exactly one file.
- Acceptance criteria: all of §28–§30; failure -> classified STOP, no retry.
- Validation commands: `npm run selfdev:promote-canonical -- apply|verify`.
- Status: DONE

### M9 — Post-apply real one-entry regression + canonical commit + exact CI

- Objective: full real regression 0 failed on the dirty one-entry tree;
  commit exactly the one file; push; exact canonical-commit CI green incl.
  catalog integrity at count 1; currentness COMMITTED_EXACT.
- Acceptance criteria: all of §31–§37; failure -> exact-preimage rollback +
  classified STOP (no second attempt).
- Validation commands: §31 suite; `git add/commit/push`; GitHub Actions run
  inspection; `promote-canonical -- status`.
- Status: DONE

### M10 — Post-commit continuation proof

- Objective: fresh post-commit session selects B (replay PASS,
  passCandidateCount 1); read-only B eligibility proof; post-commit isolated
  full-history regression 0 failed; record validated implementation SHA.
- Acceptance criteria: B selected at the real committed HEAD; B eligibility
  true via read-only inspect; isolated suite 0 failed.
- Validation commands: `npm run selfdev:synthetic`, sandbox `inspect`, §40
  suite in an isolated clone.
- Status: DONE

### M11 — Continuity v2 closure + docs finalization + final exact CI + report

- Objective: STATE/PLAN/REPORT/ACTIVE_TASK COMPLETE under v2; docs-only
  finalization commit; push; exact final CI green (incl. completed-task audit
  and catalog integrity at count 1); final agent:check/audit zero strict
  errors; 82-field report; STOP.
- Acceptance criteria: all §42–§49; final HEAD == origin/main; final catalog
  count 1.
- Validation commands: `npm run agent:check`, `npm run agent:audit`,
  `git push origin main`, GitHub Actions run inspection.
- Status: DONE

## Validation Strategy

Focused: catalog-integrity bin + tests, hardening, agent checks, selfDev
lineage matrices, owner-provenance, campaign:synthetic. Global: full
Playwright at each committed checkpoint (real + isolated), `git diff --check`.
Remote: exact GitHub Actions hardening runs per pushed SHA (readiness,
canonical, final docs).

## Decision Log

- 2026-08-15 — Decision: implement the catalog-integrity check as a new
  read-only bin (`bin/selfdev-catalog-integrity.mjs`) reusing
  `validateAdoptedCatalog`/`renderAdoptedCatalogSource`, invoked from CI, with
  hardening asserting the pure-data shape instead of emptiness; reason: the
  empty-only regex gate is cardinality-locked, while the runtime validator +
  renderer are the established trust root ("do not create a competing catalog
  validator"); evidence: `validateAdoptedCatalog` already rejects duplicates,
  overflow, unknown fields, and source-injection shapes; consequence: CI stays
  valid for EMPTY / one-entry / two-entry / exhausted states.
- (filled in as decisions occur)

## Discoveries

- (filled in as discovered)

- 2026-08-15 — Decision: frozen promotion base stays exactly at the
  readiness commit; task-doc edits during the promotion window preserved in
  /tmp and restored only at finalization so the tree stayed fully clean for
  prepare/approve/apply/verify (assertRepositoryFullyClean is whole-repo);
  reason: any dirtiness blocks the promotion boundary, any mid-flight commit
  moves the bound HEAD; evidence: SELFDEV_REPOSITORY_NOT_FULLY_CLEAN observed
  when task docs were uncommitted.
- 2026-08-15 — Decision: the 2 dirty-tree-only CLI test failures in the
  post-apply regression window are documented deterministic behavior (tests
  read the real repo's clean state; SELFDEV_AUTHORITATIVE_SOURCE_DIRTY for
  ANY dirty tree) and pass at the clean committed one-entry state; reason:
  §32 permits proceeding when the failure is not semantic; evidence: the same
  tests passed in the clean one-entry rehearsal (751/4/0) and in the
  post-commit isolated run; consequence: no rollback, canonical commit
  proceeded.

## Deferred Work

- Portfolio expansion beyond A+B (deliberate, separately authorized).
- `currentCheckoutState()` contract-digest process-binding characteristic
  (historical, unrelated).

## Completion Criteria

All 34 success conditions of the authorization are true; verdict
`PHASE_8B_1_R1_COMPLETE_CANONICAL_ADOPTION_VERIFIED`; task COMPLETE under
continuity protocol v2; next action STOP.
