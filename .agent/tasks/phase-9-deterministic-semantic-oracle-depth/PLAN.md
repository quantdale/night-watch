# Task Plan

Task ID: phase-9-deterministic-semantic-oracle-depth
Phase: 9-ORACLE-DEPTH
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Implement the owner-authorized local/synthetic Phase 9 stage: sanitized
in-memory semantic projections, declarative source-backed expectations,
deterministic semantic expectation + cross-step relation oracles, >=5 seeded
semantic bug classes with zero benign false positives, adversarial sentinel
proof, integration through the existing campaign/triage/dossier pipeline,
hardening + CI, full regression, exact checkpoints + exact CI, durable docs,
continuity-v2 closure, STOP. NO DEV, NO Phase 6, NO AI authority, NO
selfDev/promotion activity.

## Starting State

- Starting SHA: 09a940340aaa537706d07140995de9bd26d0fdfd
  (HEAD == origin/main == expected authorization SHA; worktree clean — CASE D).
- Active task at start: phase-8-final-closure-phase-9-roadmap-selection
  COMPLETE. Phase 8 COMPLETE; Phase 9 DESIGNED/NOT_STARTED/NOT_AUTHORIZED
  before this task; catalog digest bd35b934... count 1; B
  AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE.
- Oracle ceiling baseline: protocol/structural oracles only; HTTP-200 error
  envelopes and all five seeded semantic classes pass today (proven at M1).

## Scope

- New source: src/oracles/projections/**, src/oracles/expectations/**,
  src/oracles/invariants/**, src/oracles/semantic/**.
- Narrow integration: src/api/phase5/semantic.ts (composed stage),
  src/browser/observers/networkObserver.ts (semantic hook),
  src/core/campaign/{types,orchestrator,identity}.ts (finding passthrough +
  strict persisted-candidate validation),
  src/core/triage/{types,dossier,pipeline}.ts (additive sanitized dossier
  semanticEvidence).
- Fixtures: corpus/phase9/**; tests: oracleProjection, oracleExpectation,
  oracleExpectationRealSource, oracleInvariant, oraclePrecision,
  semanticSentinel, semanticIntegration, semanticCampaign,
  oracleCeilingReproduction.
- Hardening + CI: bin/hardening-check.mjs Phase 9 guards;
  .github/workflows/hardening.yml Phase 9 matrix step.
- Docs: DECISIONS D-54; ROADMAP/CURRENT_STATE/ARCHITECTURE Phase 9
  transitions; PHASE_9_ROADMAP implementation record; Phase 9B disposition;
  .agent/** closure.

## Non-Goals

- No DEV/NEXT/production browser or API execution; no Phase 6
  (data/infra); no AI oracle authority; no campaign authority changes
  (budget/admission/promotion thresholds untouched); no triage trust
  bypass; no invalidReducedReplay fix (P9-C); no differential rewiring
  (P9-D); no source-change selection work (P9-E); no catalog/promotion/
  selfDev activity; no owner-policy expansion; no Alphaus writes; no
  publication.

## Safety Constraints

- Raw customer values never cross the projection boundary; projections/
  findings/dossiers carry shape/count/type/identity-token/relation facts
  only; ProjectionContext is in-memory only and never serialized; sentinel
  sweep zero leaks incl. failure paths; exception messages bounded
  classifications; no persistence/network/child_process in the semantic
  core (hardening-guarded); source repos read-only (static text only, no
  execution); expectation provenance bound to repo @ SHA with stale
  fail-closed.

## Architecture / Approach

```
EPHEMERAL RAW OBSERVATION -> bounded in-memory projection (opaque tokens/
numeric refs) -> declarative source-backed expectation + cross-step
invariants -> SemanticOracleFinding (safe DTO) -> existing anomaly/admission
-> triage -> dossier (additive sanitized semanticEvidence).
```

Ordering: privacy-safe projection -> expectations -> invariants -> bug
classes -> pipeline integration. Projection suite must PASS before oracle
integration; expectation acceptance before campaign integration.

## Milestones

- M0 — bootstrap + strict-v2 task records + ACTIVE_TASK IN_PROGRESS. DONE.
- M1 — oracle-ceiling reproduction (protocol oracles pass on the five
  seeded classes). DONE.
- M2-M4 — projection layer (raw/safe boundary, canonical DTO + serializer +
  digest, bounds, hostile fail-closed, opaque identity, fixed-point numeric
  relations, shape/state equality). DONE.
- M5-M6 — expectation DTO + strict validator + provenance/staleness +
  synthetic source fixture adapter + real-source canary. DONE.
- M7-M8 — semantic expectation oracle + cross-step invariant oracle +
  finding DTO + fingerprint. DONE.
- M9-M10 — five seeded defect fixtures + benign corpus + fixed fixture
  evaluation report (5/5 detected, FP 0). DONE.
- M11 — sentinel leakage matrix incl. failure paths + derived shapes +
  absolute-path/numeric sweeps. DONE.
- M12 — Phase 5 composed semantic stage + network observer semantic hook.
  DONE.
- M13-M14 — dossier semanticEvidence (additive), campaign finding
  passthrough + strict checkpoint validation, paired baseline-vs-semantic
  campaign proof, sentinel sweep of campaign outputs. DONE.
- M15 — hardening purity + integration-seam guards; CI Phase 9 matrix step.
  DONE.
- M16 — focused regression (typecheck, hardening, Phase 9 matrices,
  protocol/Phase 5/journey/triage/evidence/campaign suites, owner
  provenance, campaign synthetic, agent:check/audit, project:check, catalog
  integrity, git diff --check). IN PROGRESS.
- M17 — full Playwright 0 failed at a clean source-equivalent checkout +
  isolated full-history checkout.
- M18 — substantive implementation commit + push fast-forward + exact CI
  (dedicated Phase 9 matrix step green).
- M19 — fresh clean-checkout synthetic acceptance with raw counts.
- M20-M21 — docs closure (D-54, ROADMAP, CURRENT_STATE, ARCHITECTURE,
  PHASE_9_ROADMAP record, Phase 9B disposition, STATE/REPORT terminal
  fields) + final docs commit + exact final CI.
- M22 — STOP + final report.

## Validation Strategy

- `npm run typecheck`; `npm run hardening:check`; Phase 9 focused matrix
  (nine test files, `--project=nightwatch --workers=1`);
  `npm run campaign:synthetic`; `npm run test:owner-provenance`;
  `npm run agent:check`; `npm run agent:audit`; `npm run project:check`;
  `node bin/selfdev-catalog-integrity.mjs`; full Playwright
  (`npx playwright test --project=nightwatch --workers=1`, 0 failed);
  isolated full-history checkout in /tmp; `git diff --check`.
- Exact CI on the implementation SHA and on the final docs closure SHA.

## Decision Log

- D0 (2026-08-16): CASE D — exact expected source; proceed.
- D1 (2026-08-16): module layout incl. src/oracles/semantic/** for the
  finding DTO/oracle/fingerprint/runner/matrix/hook/dossier evidence.
- D2 (2026-08-16): integration approach — composed Phase 5 stage (existing
  evaluateApiResponse untouched), observer semantic hook (transient raw
  text, safe findings only), campaign via existing orchestrator admission,
  dossier additive optional semanticEvidence (same DOSSIER_VERSION,
  backward compatible).
- D3 (2026-08-16): state-transition equality (semanticStateEquals) includes
  opaque identity tokens/numeric refs through the shared context — value
  changes are observable as transitions while canonical shape equality
  stays value-free.
- D4 (2026-08-16): empty/truncated collections in identity membership and
  numeric-sum invariants are NOT_APPLICABLE (never false anomalies);
  empty collection sum compares 0 vs the scalar.
- D5 (2026-08-16): real-source canary = adapter provenance binding against
  the live checkout SHA with zero derived expectations (no invented real
  semantics) — REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED.

## Discoveries

- networkObserver redacts bodies before protocol oracles; the semantic hook
  must project from the raw transient text (never persisted) so redaction
  cannot corrupt relations.
- validateCandidatePrivacy + checkpoint strict validation serialize
  candidates; semantic findings are safe DTOs and pass both, but the
  checkpoint candidate allowlist needed the explicit semanticFindings field
  with strict finding validation.
- The budget validator hard-caps maxPromotedClusters at 3; the campaign
  integration uses one defect per journey across two runs so every promoted
  cluster carries semantic findings without touching promotion policy.

## Deferred Work

- P9-C triage confidence / real minimization replay — NEXT_AFTER_PHASE_9.
- P9-D value-level differential — NEXT_AFTER_PHASE_9.
- P9-E source-change selection — NEXT_AFTER_PHASE_9.
- P9-A budget intelligence — VIABLE_LATER.
- Phase 9B contained DEV acceptance — separate authorization; disposition
  at M20.

## Completion Criteria

- >=5 required semantic bug classes, all detected; benign FP = 0; sentinel
  leaks 0 (incl. failure paths); projection byte-identical across runs;
  source-stale fail-closed PASS; semantic defect reaches dossier via the
  real orchestrator; baseline protocol comparison measurable; typecheck/
  hardening/agent/project/catalog/full Playwright/isolated checkout all
  green; exact implementation + final CI green; catalog byte-identical
  bd35b934...; PHASE_8_STATUS COMPLETE; B AVAILABLE_NOT_ADOPTED;
  NEXT_PROMOTION_AUTHORITY NONE; closure under continuity v2; STOP.
