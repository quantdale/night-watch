# Nightwatch Phase 8B.1-R1.1.1 — Canonical Catalog Authority Wording Closeout — Living Plan

Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
PHASE_8B_1_R1_1_1_STATUS: COMPLETE

## Purpose

See SPEC.md. Narrow source-truth closeout: remove the false absolute
"runtime code never writes canonical source" from the renderer header and the
regenerated generated catalog, replace it with the exact truthful authority
boundary, and guard the invariant in tests + hardening so the contradiction
cannot recur.

## Starting State

- HEAD == origin/main == `7d43162d8464f1f474b5c3cc987eacdc805cfffa`
  (Phase 8B.1-R1.1 docs closure); worktree clean.
- Active task: phase-8b-1-r1-1-project-memory-canonical-truth COMPLETE.
- Canonical catalog: 1 entry; raw digest
  `sha256:401b2c673e8e0486f697f3af159833cca6102410f690e82731377829b1e95b6c`;
  adoptedCaseId `adopted-case:sha256:90248aae...`; equivalentFingerprint
  `sha256:6a322450...`; fixture `selfdev.fixture.local-regression.v1`;
  actions `[selfdev.synthetic.expand-summary]`; assertions
  `[selfdev.assert.state.expanded, selfdev.assert.transition.expansion,
  selfdev.assert.oracle.structural-stable]`; coverage
  `[oracle:structural-stable, state-action:ready:selfdev.synthetic.expand-summary,
  transition:ready-read-only-expansion]`; strategy
  `DECLARATIVE_REGRESSION_CATALOG_PROMOTION`.
- sourceBundleDigest `sha256:bfa99d205525c6661a7a9de4ab049a8b5d218a584ee97475cda6c292805e4ee7`;
  contractDigest `sha256:d8012faecd3d5bd4843e6257eb9edd7cec64b25c8928a0303d7d20525ed6beb7`.
- Project-state v1 block: `CANONICAL_CATALOG_SHA256: sha256:401b2c67...`,
  count 1, `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`,
  `NEXT_PROMOTION_AUTHORITY: NONE`.

## Scope

- `src/core/selfDev/adoptedCases.ts`: module header + `renderAdoptedCatalogSource()`
  header comments only.
- `src/core/selfDev/adoptedCaseCatalog.generated.ts`: regenerated through the
  trusted renderer.
- `tests/unit/selfDevAdoptionCatalog.test.ts`: authority wording regression
  tests + semantic-preservation round-trip test.
- `bin/hardening-check.mjs`: extend the generated-source provenance guard with
  negative false-absolute checks (diagnostic
  `PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT`).
- `docs/CURRENT_STATE.md` (digest + tail), `docs/ROADMAP.md` (single false
  hit), `docs/DECISIONS.md` (D-51).

## Non-Goals

See SPEC.md. NO B adoption, NO promotion chain invocation, NO semantics
change, NO currentness change, NO owner-policy change, NO historical rewrite.

## Safety Constraints

See SPEC.md. Regeneration only via the renderer; contractDigest unchanged;
semantic fields unchanged; narrow corrected wording only; never hand-edit the
generated file.

## Architecture / Approach

1. **Single source of truth for the authority header.** The full invariant
   lives in one code-owned location: `renderAdoptedCatalogSource()` header
   strings in `src/core/selfDev/adoptedCases.ts`. The module-level comment
   states the same model in prose. Tests and hardening assert against these
   exact stable phrases — no second policy engine.
2. **Canonical invariant (exact concepts):**
   - generated source is declarative data;
   - ordinary development never hand-edits it;
   - Phase 8B sandbox executor: mirror-only write;
   - Phase 8B.1 canonical-promotion executor: the ONLY runtime authority for
     the bounded canonical target write, after the complete owner-gated
     promotion chain;
   - runtime promotion code never commits/pushes Git; the development session
     commits the promoted result;
   - candidates never directly write source;
   - no generic runtime source-writing interface exists.
3. **Regression guard.** Test asserts positive concepts AND negative false
   absolutes against both the live generated file and fresh renderer output.
4. **Hardening guard.** In `checkGeneratedCatalogAuthority`-style block:
   reject the exact false phrase and equivalent false claims in
   `adoptedCases.ts` + `adoptedCaseCatalog.generated.ts` with
   `PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT`.
5. **Docs.** CURRENT_STATE: update only `CANONICAL_CATALOG_SHA256` in the
   machine-checked block (project-state v1 requires the exact raw digest) +
   narrow R1.1.1 tail; ROADMAP: replace the one CURRENT_FALSE phrase
   ("runtime never writes canonical source" -> runtime never commits Git);
   DECISIONS: append D-51; D-50 untouched (historical record).

## Milestones

M0 bootstrap/task creation/pre-state capture — CLOSED (CASE D)
M1 defect reproduction + repository-wide phrase audit — CLOSED (TRUE_POSITIVE)
M2 module + renderer authority wording correction — CLOSED
M3 one-entry catalog deterministic regeneration + semantic deep-equality
    proof — CLOSED (digest 401b2c67.. -> bd35b934..; semantics identical)
M4 regression guard tests (positive + negative) + semantic-preservation
    test — CLOSED (3 new tests in selfDevAdoptionCatalog.test.ts)
M5 hardening guard extension — CLOSED (PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT)
M6 CURRENT_STATE digest + ROADMAP + DECISIONS corrections — CLOSED
M7 focused validation — CLOSED (typecheck, hardening, 82/82 focused tests)
M8 full regression matrices + Playwright — CLOSED (781/1/2 dirty-tree-only
    documented failures; matrices green)
M9 isolated clean checkout validation — CLOSED (780/4/0 + all gates)
M10 source-bearing implementation commit + push + exact CI — CLOSED
    (044c4a6; CI 31908896481 success)
M11 clean project:check + catalog integrity + fresh current-source synthetic
    proof — CLOSED (eligible true, B selected, contractDigest unchanged)
M12 v2 docs closure + final exact CI — CLOSED
M13 STOP + report — CLOSED

## Validation Strategy

- Focused (dirty tree allowed): typecheck, hardening:check, adopted-catalog
  tests, project-state tests, currentness flow tests, portfolio tests,
  owner-scope tests, git diff --check.
- Clean tree: project:check, catalog-integrity, agent:check, agent:audit.
- Full Playwright `--project=nightwatch --workers=1`; isolated full-history
  checkout with read-only sibling mirrors at /tmp/<workspace>/nightwatch.
- Exact CI at implementation SHA and final SHA.

## Decision Log

- D-R1.1.1-1 — The corrected statement keeps the existing stable phrases that
  the hardening guard already requires (`Phase 8B sandbox`, `disposable`,
  `private source mirror`, `owner-gated`, `canonical-promotion`,
  `No generic self-modification authority`) and adds the truthful boundary
  clauses (bounded canonical target write by the owner-gated executor only,
  runtime never commits/pushes Git, candidates never directly write source,
  no generic runtime source-writing interface).
- D-R1.1.1-2 — DECISIONS D-50 and the R1.1 task records are HISTORICAL_BUG_QUOTE
  records: preserved verbatim; the correction is recorded in new D-51 and this
  task's records.

## Discoveries

- The R1.1 module-level header (adoptedCases.ts lines 8-15) is already
  truthful (it says "runtime code never commits; the development session
  commits the promoted result") — only the renderer string and the generated
  file carry the false absolute. The module header gains the missing
  candidate-never-writes clause for full symmetry.
- Exact false phrase hits: `src/core/selfDev/adoptedCases.ts:250` (renderer
  string), `src/core/selfDev/adoptedCaseCatalog.generated.ts:17` (generated) —
  both CURRENT_FALSE. Variant hit "runtime never writes canonical source" in
  `docs/ROADMAP.md:1068` — CURRENT_FALSE. D-50 + R1.1 task records —
  HISTORICAL_BUG_QUOTE (preserved).

## Deferred Work

- Variant B adoption (separate authorization).
- Portfolio expansion beyond A+B.

## Completion Criteria

Acceptance sections 47–52 of the task authorization all satisfied; verdict
`PHASE_8B_1_R1_1_1_COMPLETE_AUTHORITY_WORDING_TRUTHFUL`.
