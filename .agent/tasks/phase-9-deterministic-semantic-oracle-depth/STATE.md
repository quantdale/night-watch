# Task State

## Identity

Task ID: phase-9-deterministic-semantic-oracle-depth
Phase: 9-ORACLE-DEPTH
Status: IN_PROGRESS
Starting SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
Last validated implementation SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
Last substantive checkpoint SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-16 — M1..M15 complete: oracle-ceiling proof (6/6);
projection layer (22/22); expectation layer + real-source canary (17/17);
oracle/invariant matrix (25/25); fixed fixture report 5/5 detected FP=0
(2/2); sentinel matrix incl. failure paths (15/15); Phase 5 composed stage +
observer hook (10/10); campaign integration incl. paired baseline + sentinel
sweep (4/4); hardening guards + CI matrix step; agent:check/audit PASS with
expected IN_PROGRESS warnings; M16 in progress (full Playwright running).
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Implement the local/synthetic Phase 9 architecture deeply: sanitized
in-memory semantic projections, source-backed declarative expectations,
deterministic semantic expectation + cross-step relation oracles, >=5 seeded
semantic bug classes with zero benign false positives, adversarial sentinel-
leakage proof, integration through the existing campaign/triage/dossier
pipeline, hardening + CI, full regression + isolated checkout, exact
checkpoints + exact CI, durable docs, closure under continuity v2, STOP.
NO DEV, NO Phase 6, NO AI authority, NO selfDev/promotion activity.

## Current Milestone

M16 — focused regression (full Playwright running in background).

## Completed Milestones

- M0 — bootstrap + task records: CASE D confirmed (HEAD == origin/main ==
  09a940340aaa537706d07140995de9bd26d0fdfd, tracked worktree clean);
  durable reads (AGENTS.md, ACTIVE_TASK, CURRENT_STATE incl. machine block,
  ROADMAP, ARCHITECTURE headings, DECISIONS D-53, SAFETY_MODEL headings,
  PHASE_9_ROADMAP, closure task records); source recon (passiveChecks,
  phase5 oracle/types, networkObserver, campaign types, orchestrator seams,
  triage types/pipeline/dossier, journeys admission/fingerprint, redaction,
  ownerScope allowed ops, hardening-check structure, hardening.yml);
  task records SPEC/PLAN/STATE/REPORT created; ACTIVE_TASK.md updated;
  src/oracles/{projections,expectations,invariants,semantic}/ and
  corpus/phase9/{source-fixture,defects,benign}/ created.
- M1 — oracle-ceiling reproduction: tests/unit/oracleCeilingReproduction.test.ts
  (6 tests) proves every seeded defect body is protocol-valid: passiveChecks
  return no issue and Phase 5 evaluateApiResponse returns ORACLE_PASS for
  all five seeded semantic classes; exact ceiling recorded (protocol
  detection of required semantic fixtures: 0/5) — EXPECTED_ORACLE_CEILING.
- M2-M4 — projection layer: src/oracles/projections/{types,identity,
  projector,serializer,numeric,shape,index}.ts — explicit raw/safe boundary
  (RawSemanticObservation ephemeral; SemanticProjection safe DTO,
  nightwatch.semantic-projection.v1), ProjectionContext opaque encounter
  tokens (entity#0001) + numeric refs (numeric#0001) with hard caps and
  non-serializable guard, bounded projector (depth/fields/array items/nodes/
  identity/numeric/bytes caps; overflow -> SEMANTIC_PROJECTION_LIMIT_EXCEEDED;
  hostile inputs -> bounded UNSUPPORTED_INPUT incl. throwing getters, cycles,
  __proto__/constructor keys, non-JSON scalars, NaN/Infinity), canonical
  serializer (sorted keys, structural validation, no JSON.stringify shortcut),
  projectionDigest proj:sha256:<24>, fixed-point numeric relations
  (SUM_EQUALS/COUNT_EQUALS/COUNT_GTE/EQUAL/NOT_EQUAL, MAX_SCALE_DECIMALS 9,
  relation facts only), shape equality (structure-only, array multiset,
  truncation-aware) + semanticStateEquals (opaque tokens/refs for
  transition-state equality). Tests: tests/unit/oracleProjection.test.ts 22.
- M5-M6 — expectations: src/oracles/expectations/{types,paths,validator,
  provenance,sourceAdapter,index}.ts — declarative DTO
  (nightwatch.semantic-expectation.v1), SafePath validation, strict
  validator (unknown fields, duplicate IDs, unsupported kinds, unbounded
  relations, traversal, prototype segments, free-form code, malformed SHA),
  provenance freshness (CURRENT/STALE/UNAVAILABLE fail-closed), admission
  gate, static source adapter (ONE interface for fixture + real source;
  provenance adapter-authoritative). Tests: oracleExpectation.test.ts 15 +
  oracleExpectationRealSource.test.ts 2 (live checkout SHA matches the
  Phase 5 catalog; zero derived expectations -> NOT_ADMITTED; stale class
  proven). corpus/phase9/source-fixture/contracts/entityCatalog.ts with 5
  contract blocks.
- M7-M8 — oracle + invariants: src/oracles/invariants/{types,paths,evaluate,
  index}.ts (fixed vocabulary: FIELD_PRESENT/ABSENT, TYPE_MATCH,
  CARDINALITY_MATCH, ENVELOPE_CLASS, IDENTITY_EQUAL,
  IDENTITY_PRESENT_IN_COLLECTION, NUMERIC_SUM_RELATION, COUNT_RELATION,
  SHAPE_CHANGED; envelope classification; empty/truncated -> NOT_APPLICABLE
  rules) and src/oracles/semantic/{types,fingerprint,oracle,runner,matrix,
  hook,index}.ts (finding DTO nightwatch.semantic-oracle-finding.v1 with
  strict validator; categorical fingerprint fp:sha256 over safe metadata;
  evaluateSemanticExpectation with fail-closed classification order;
  evaluateSemanticResponse ephemeral runner; matrix report builder; hook
  core). Tests: oracleInvariant.test.ts 25 (5 classes x positive/benign/
  N/A/stale/unavailable + limit fail-closed).
- M9-M10 — fixtures + FP control: corpus/phase9/defects/** (five manifests +
  raw bodies with sentinels) and corpus/phase9/benign/** (five counterparts
  + variations); oraclePrecision.test.ts — fixed fixture evaluation report:
  seededDefects 5, detected 5, missed 0, benignCases 10, falsePositives 0,
  precision 1, recall 1 (raw counts, matrix version
  nightwatch.phase9-fixture-matrix.v1).
- M11 — sentinel matrix: semanticSentinel.test.ts 15 — sentinels in every
  raw-value location; sweeps of projection serialization, digests, findings,
  fingerprints, finding JSON; failure paths (limit exceeded, getter throw,
  context serialization, stale/unavailable source, invalid expectation,
  INVALID_INPUT); derived forms (lower/upper/URL-encoded/escaped/prefix/
  last-four/raw amount); absolute-path + raw-numeric sweeps. Zero leaks.
- M12 — integration: src/api/phase5/semantic.ts (composed
  protocol/semantic stage; protocol failure short-circuits; ORACLE_PASS is
  not semantic PASS) + src/oracles/semantic/hook.ts + networkObserver
  semanticOracle option (transient raw text -> safe findings only;
  semanticFindings() ledger; never weakens protocol oracles). Tests:
  semanticIntegration.test.ts 10.
- M13-M14 — pipeline: dossier additive semanticEvidence
  (nightwatch.semantic-dossier-evidence.v1, strict validation, null for
  protocol-only), triage pipeline passthrough, CampaignAnomalyCandidate
  semanticFindings + orchestrator toSemanticDossierEvidence + strict
  checkpoint candidate validation (validateSemanticFinding in
  assertPersistedCandidateShape). Tests: semanticCampaign.test.ts 4 —
  five classes reach dossiers across two runs (one defect per journey;
  maxPromotedClusters policy bound 3 untouched), paired baseline admits
  none, sentinel sweep of checkpoint/dossiers/brief/artifacts zero leaks,
  legacy dossier shape intact.
- M15 — hardening + CI: bin/hardening-check.mjs checkPhase9SemanticCorePurity
  (no AI/selfDev/Phase6/infra/transport/persistence/campaign imports; no
  process/network/persistence capability in the four semantic dirs) +
  checkPhase9IntegrationSeams (observer hook, composed stage, dossier
  evidence wired); .github/workflows/hardening.yml Phase 9 matrix step.
  hardening:check PASS.

## Work In Progress

M16: full Playwright regression at the working tree; then the isolated
full-history checkout (M17).

## Exact Next Action

Await full Playwright result (0 failed required); then build the isolated
full-history checkout in /tmp and run the full matrix there; then M18
(implementation commit + push + exact CI).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/phase-9-deterministic-semantic-oracle-depth/{SPEC,PLAN,STATE,REPORT}.md` | Phase 9 strict-v2 task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to this task IN_PROGRESS | docs |
| `src/oracles/projections/**` | Phase 9 projection layer (M2-M4) | source (new) |
| `src/oracles/expectations/**` | expectation DTO/validator/provenance/source adapter (M5-M6) | source (new) |
| `src/oracles/invariants/**` | cross-step invariant evaluation (M7-M8) | source (new) |
| `src/oracles/semantic/**` | finding DTO/oracle/fingerprint/runner/matrix/hook/dossier evidence (M7-M14) | source (new) |
| `src/api/phase5/semantic.ts` | composed protocol/semantic stage (M12) | source (new) |
| `src/browser/observers/networkObserver.ts` | semantic projection hook + findings ledger (M12) | source (edit) |
| `src/core/campaign/{types,orchestrator,identity}.ts` | semanticFindings passthrough + strict persisted-candidate validation (M13) | source (edit) |
| `src/core/triage/{types,dossier,pipeline}.ts` | additive sanitized semanticEvidence (M13) | source (edit) |
| `tests/unit/oracleCeilingReproduction.test.ts` | M1 oracle-ceiling proof (6) | tests (new) |
| `tests/unit/oracleProjection.test.ts` | projection matrix (22) | tests (new) |
| `tests/unit/oracleExpectation.test.ts` | expectation matrix (15) | tests (new) |
| `tests/unit/oracleExpectationRealSource.test.ts` | real-source canary (2) | tests (new) |
| `tests/unit/oracleInvariant.test.ts` | oracle/invariant matrix (25) | tests (new) |
| `tests/unit/oraclePrecision.test.ts` | fixed fixture report (2) | tests (new) |
| `tests/unit/semanticSentinel.test.ts` | sentinel matrix (15) | tests (new) |
| `tests/unit/semanticIntegration.test.ts` | M12 integration matrix (10) | tests (new) |
| `tests/unit/semanticCampaign.test.ts` | campaign integration + baseline (4) | tests (new) |
| `corpus/phase9/**` | synthetic source fixture + defects + benign + README | corpus (new) |
| `bin/hardening-check.mjs` | Phase 9 purity + integration-seam guards (M15) | source (edit) |
| `.github/workflows/hardening.yml` | Phase 9 matrix step (M15) | workflow (edit) |

## Validation Ledger

- Bootstrap: git fetch origin clean; HEAD == origin/main ==
  09a940340aaa537706d07140995de9bd26d0fdfd; branch main; remote
  https://github.com/quantdale/night-watch.git; `git status --short` empty.
- M1: oracleCeilingReproduction.test.ts — 6 passed (protocol oracles null,
  Phase 5 ORACLE_PASS on all five seeded classes; ceiling recorded).
- M2-M4: oracleProjection.test.ts — 22 passed (SPEC §61 matrix 1-20 +
  byte-budget guard + shape equality helper).
- M5-M6: oracleExpectation.test.ts 15 passed; oracleExpectationRealSource
  .test.ts 2 passed (live checkout SHA == Phase 5 catalog SHA;
  NOT_ADMITTED; stale fail-closed).
- M7-M8: oracleInvariant.test.ts — 25 passed.
- M9-M10: oraclePrecision.test.ts — 2 passed (5/5 detected; benign 10;
  FP 0; precision 1; recall 1).
- M11: semanticSentinel.test.ts — 15 passed (zero leaks incl. failure
  paths + derived forms + absolute-path/numeric sweeps).
- M12: semanticIntegration.test.ts — 10 passed.
- M13-M14: semanticCampaign.test.ts — 4 passed (five classes to dossiers
  across two runs; baseline admits none; sentinel sweep zero; legacy
  dossier shape intact).
- M15: hardening:check PASS (Phase 9 purity + integration-seam guards).
- M16 (so far): typecheck PASS; Phase 9 focused matrix 101 passed;
  existing oracle/journey/triage/evidence suites 70 passed; campaign
  synthetic 27 passed; owner provenance 91 passed; agent:check/audit PASS
  (3 expected IN_PROGRESS warnings: LEGACY_CONTINUITY,
  STALE_IMPLEMENTATION_BASELINE for uncommitted work,
  LEGACY_TASK_NOT_STRICTLY_VALIDATED); project:check reports only
  PROJECT_STATE_CHECKOUT_DIRTY (expected pre-commit; machine truth fields
  otherwise intact).
- M16 full regression at the working tree: 896 passed / 1 skipped (pre-
  existing environment-conditional) / 0 failed; git diff --check clean.
- M18 local: substantive implementation commit created (all Phase 9
  source/tests/corpus/hardening/workflow + task records), ready for the
  isolated full-history checkout at the committed SHA, then push + exact CI.

## Decisions Made During This Task

- D0 (2026-08-16): CASE D — exact expected source; proceed with Phase 9
  implementation.
- D1 (2026-08-16): Phase 9 module layout: `src/oracles/projections/**`,
  `src/oracles/expectations/**`, `src/oracles/invariants/**`, plus
  `src/oracles/semantic/**` for the finding DTO + semantic oracle + finding
  fingerprint (hardening purity guard covers all four areas).
- D2 (2026-08-16): Integration approach — Phase 5 gets a composed
  protocol/semantic evaluation stage (existing `evaluateApiResponse` and its
  DTO untouched); network observer gets a narrowly typed optional semantic
  hook; campaign integration runs through the EXISTING orchestrator/
  admission path via `CampaignAnomalyCandidate` observations whose features
  carry the semantic oracle identity; dossier gains one additive optional
  sanitized `semanticEvidence` field (backward compatible, same
  DOSSIER_VERSION).

## Discoveries

- The network observer currently redacts bodies before protocol oracles;
  Phase 9's semantic hook must project from the raw transient body text
  in-memory (never persisted) so secret-shaped redaction does not corrupt
  semantic relations — the emitted event carries the safe projection/finding
  only.
- `validateCandidatePrivacy` in orchestrator.ts JSON-stringifies candidates
  (functions dropped) — semantic finding data placed into candidate
  observations must be safe DTOs by construction (sentinel sweep covers it).

## Blockers

NONE.

## Safety Events

None. Safety vector: catalog writes 0, promotion intents 0, approvals 0,
APPLY 0, B adoption 0, DEV/NEXT/production contacts 0, product mutations 0,
DB/infra queries 0, AI/model calls 0, Alphaus writes 0, publication 0,
runtime Git writes 0; Nightwatch development Git commits: none yet.

## Deferred / Follow-Up

- P9-C triage confidence / real minimization replay — NEXT_AFTER_PHASE_9
  (not touched by this task; `invalidReducedReplay` stub stays).
- P9-D value-level differential — NEXT_AFTER_PHASE_9.
- Phase 9B contained DEV acceptance — separate later authorization;
  disposition decided at M20.

## Resume Recipe

Read SPEC.md, PLAN.md, STATE.md in order; continue from `Exact Next Action`
(M1 oracle-ceiling reproduction). If context was compacted: verify git HEAD
still == origin/main (09a94034... expected before any commit), then continue.

## Completion Snapshot

(filled at M20/M21 closure: status COMPLETE, PHASE_9_ORACLE_DEPTH_STATUS
COMPLETE, terminal milestone/WIP/next action/resume recipe, substantive
checkpoint SHA, exact implementation CI, final docs closure SHA, exact final
CI, project truth, safety vector, continuity results.)
