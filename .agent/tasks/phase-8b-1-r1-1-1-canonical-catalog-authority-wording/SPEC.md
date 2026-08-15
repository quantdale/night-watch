# Nightwatch Phase 8B.1-R1.1.1 —
# Canonical Catalog Authority Wording Closeout

Status: IN_PROGRESS (frozen intent; PLAN.md is living)
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
PHASE_8B_1_R1_1_1_STATUS: IN_PROGRESS

## Purpose

Close the remaining source-truth defect introduced by the R1.1 header
correction: the generated-catalog authority header now contains a FALSE
ABSOLUTE that contradicts its own two-writer partition.

`renderAdoptedCatalogSource()` in `src/core/selfDev/adoptedCases.ts` (and the
regenerated `adoptedCaseCatalog.generated.ts`) currently say both:

- the Phase 8B.1 canonical-promotion executor MAY rewrite the exact canonical
  target after the complete owner-gated promotion chain; AND
- "runtime code never writes canonical source".

The canonical-promotion executor IS runtime code, so the second statement is
false. The accepted authority model is:

- generic runtime code cannot write canonical source;
- candidates cannot write source;
- the Phase 8B sandbox executor can mutate only a disposable private mirror;
- the specifically owner-gated Phase 8B.1 canonical-promotion executor may
  perform exactly the bounded canonical source write when all promotion gates
  pass;
- that runtime executor does NOT commit or push Git;
- the development session separately commits the verified promoted source.

## Scope

- Source: `src/core/selfDev/adoptedCases.ts` (module-level authority
  explanation + `renderAdoptedCatalogSource()` header only — no semantic
  logic), regenerated one-entry catalog via the trusted deterministic
  renderer (entry set unchanged; only comment/header bytes may differ).
- Tests: deterministic regression guard for the exact authority invariant
  (positive required concepts AND negative false absolutes) in
  `tests/unit/selfDevAdoptionCatalog.test.ts`; semantic deep-equality
  round-trip proof of the one-entry catalog.
- Hardening: extend `bin/hardening-check.mjs` with a narrow negative guard
  rejecting reintroduction of the false absolute in the live renderer and the
  current generated target.
- Docs: `docs/CURRENT_STATE.md` (machine-checked `CANONICAL_CATALOG_SHA256`
  update + narrow R1.1.1 tail), `docs/ROADMAP.md` (correct the one
  CURRENT_FALSE hit), `docs/DECISIONS.md` (append D-51 narrow clarification
  only; D-50 preserved as the historical R1.1 decision record).
- Task records under `.agent/tasks/phase-8b-1-r1-1-1-canonical-catalog-authority-wording/`.

## Non-Goals

- NO variant-B adoption; NO selfdev sandbox adoption of B; NO promotion
  prepare/approve/apply; NO new promotion intent; NO new owner approval; NO
  reuse/reset/delete of historical approvals.
- NO change to the catalog ENTRY SET (semantic count stays exactly 1; all
  adopted-case fields byte-identical apart from generated header bytes).
- NO proposal/evaluator/portfolio/currentness/owner-policy semantics change:
  `contractDigest` must stay `sha256:d8012fae...`.
- NO weakening of promotion currentness: the historical R1 verification stays
  `COMMITTED_EXACT` at its accepted checkpoint; later validated source changes
  keep producing the strict source mismatch — never a relaxed reclassification.
- NO product / data / infra / AI / DEV / NEXT / production activity.
- NO rewriting of historical defect reports or decision records that quote the
  old phrase (D-50, R1.1 task records).

## Safety Constraints

- Catalog regeneration happens ONLY through the real deterministic renderer
  (`renderAdoptedCatalogSource`); never hand-edited.
- If `contractDigest` changes: STOP and investigate before accepting.
- If any catalog semantic entry field changes: STOP.
- The corrected statement must remain NARROW: only the owner-gated
  canonical-promotion executor, only the fixed canonical target, only after
  complete promotion evidence/approval, no runtime Git commit, no candidate
  direct write, no generic writer. Never broaden to "runtime may write
  canonical source".

## Milestones

M0 bootstrap/task creation/pre-state capture
M1 defect reproduction + repository-wide phrase audit
M2 module + renderer authority wording correction
M3 one-entry catalog deterministic regeneration + semantic deep-equality proof
M4 regression guard tests (positive + negative) + semantic-preservation test
M5 hardening guard extension
M6 CURRENT_STATE digest + ROADMAP + DECISIONS corrections
M7 focused validation
M8 full regression matrices + Playwright
M9 isolated clean checkout validation
M10 source-bearing implementation commit + push + exact CI
M11 clean project:check + catalog integrity + fresh current-source synthetic proof
M12 v2 docs closure + final exact CI
M13 STOP + report

## Validation Strategy

- `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`,
  `npm run agent:audit`, `npm run project:check`
- `npm run selfdev:catalog-integrity` (clean tree only)
- focused adopted-catalog / project-state / currentness / portfolio /
  owner-scope tests
- Phase 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1/8B.1.0 matrices, owner provenance,
  campaign synthetic
- full unfiltered Playwright `--project=nightwatch --workers=1`
- `git diff --check`; isolated full-history checkout at candidate source
- exact CI at source-bearing SHA and final SHA

## Decision Log

- (living) see PLAN.md Decision Log.

## Discoveries

- (living) see PLAN.md.

## Deferred Work

- Variant B adoption (separate authorization).
- Portfolio expansion beyond A+B.

## Completion Criteria

Acceptance sections 47–52 of the task authorization (wording, catalog,
provenance, project truth, validation, remote) all satisfied; final verdict
`PHASE_8B_1_R1_1_1_COMPLETE_AUTHORITY_WORDING_TRUTHFUL`.
