# Nightwatch Phase 9 — Deterministic Semantic Oracle Depth

## Task purpose

Implement the owner-authorized Phase 9 local/synthetic stage:
`PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY` for
`PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH` (selected by the Phase 8
closure task; D-53; design in `docs/design/PHASE_9_ROADMAP.md`).

Deliver a bounded deterministic semantic projection layer, a declarative
source-backed expectation system, deterministic semantic expectation oracles,
deterministic cross-step relational invariant oracles, a fixed synthetic
semantic-bug fixture corpus (>=5 seeded classes) with benign false-positive
control, strict privacy/sentinel-leakage enforcement, integration of semantic
findings into the existing deterministic campaign -> triage -> dossier
pipeline, hardening + CI matrices, durable Phase 9 task/docs/decision state,
full Nightwatch regression, exact CI on exact checkpoints, and closure under
`nightwatch.agent-continuity.v2`.

This task performs NO DEV/NEXT/production browser or API execution, NO Phase 6
(data layer / infra), NO AI oracle authority, NO selfDev/promotion activity,
NO catalog mutation, NO owner-policy expansion, NO Alphaus repository writes,
NO publication.

## Authorization

- Authorization class: `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`
- Phase: `9-ORACLE-DEPTH`
- Protocol: `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`
- This authorization covers ONLY the LOCAL/SYNTHETIC implementation stage.
  Contained DEV acceptance (if any) is a separate later authorization,
  provisionally Phase 9B.

## Established starting state

- Task ID: `phase-9-deterministic-semantic-oracle-depth`
- Starting SHA (expected at authorization time):
  `09a940340aaa537706d07140995de9bd26d0fdfd`
  (HEAD == origin/main == expected SHA; worktree clean — CASE D).
- Active task at start: `phase-8-final-closure-phase-9-roadmap-selection`
  COMPLETE. Phase 8 COMPLETE; Phase 9 DESIGNED / NOT_STARTED / NOT_AUTHORIZED
  before this task; PHASE_9_IMPLEMENTATION_AUTHORITY granted now by this task
  only.
- Canonical catalog: count 1; raw digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`;
  variant B `AVAILABLE_NOT_ADOPTED`; `NEXT_PROMOTION_AUTHORITY: NONE`.
  The catalog MUST remain byte-identical through this task. Any drift ->
  `PHASE_9_ORACLE_DEPTH_BLOCKED_PHASE8_BOUNDARY_DRIFT`.
- Project-state protocol: `nightwatch.project-state.v1` (unchanged; no new
  machine fields for Phase 9 without a deterministic checker source).

## Oracle ceiling (implementation baseline)

Current oracles are protocol/structural only: unexpected status, malformed
JSON/NDJSON, content-type/resource-lifecycle classes, request failure,
browser console/page/stability/auth signals (passiveChecks.ts), and Phase 5
parseability (`evaluateApiResponse` reaching `ORACLE_PASS` after expected
2xx + content type + parseable JSON without application semantics). An
HTTP-200 application error envelope can currently pass. Do not weaken
protocol oracles; semantic oracles are ADDITIVE.

## Architecture (frozen intent)

```
EPHEMERAL RAW OBSERVATION -> (bounded, in-memory only) ->
SANITIZED SEMANTIC PROJECTION ->
  SOURCE EXPECTATION ORACLE + CROSS-STEP RELATION ORACLE ->
SEMANTIC FINDING -> EXISTING ANOMALY/ADMISSION/TRIAGE -> DOSSIER
```

Raw customer values must never cross the projection boundary. Persisted/
loggable projections contain only field paths, JSON types, presence,
nullability, shape, bounded counts, safe relations, opaque identity labels,
source provenance, operation/journey/step identifiers, finite categorical
enums. Forbidden: raw strings, raw IDs, raw numbers (financial), DOM text,
body fragments, arbitrary stringification.

## Required deliverables

1. Strict-v2 task records (SPEC/PLAN/STATE/REPORT.md) + `.agent/ACTIVE_TASK.md`
   IN_PROGRESS during the task, COMPLETE at closure with terminal fields;
   `PHASE_9_ORACLE_DEPTH_STATUS` IN_PROGRESS then COMPLETE; no future-value
   placeholders.
2. Pre-implementation oracle-ceiling reproduction matrix: the five seeded
   semantic defect classes pass / produce no semantic anomaly under current
   protocol/API oracles (recorded as EXPECTED_ORACLE_CEILING).
3. Projection layer (`src/oracles/projections/**`): explicit raw/safe
   boundary types; canonical safe DTO (`nightwatch.semantic-projection.v1`);
   deterministic canonical serializer + digest (byte-identical across runs);
   hard caps (depth/fields/array items/nodes/identity tokens/raw bytes);
   overflow -> deterministic `PROJECTION_LIMIT_EXCEEDED`; hostile input
   fail-closed (cycles, throwing getters, __proto__, deep/massive input,
   bigint/symbol/function); no persistence inside projection core.
4. `ProjectionContext` opaque identity correlation: in-memory raw->token map
   (e.g. `entity#0001`), token never hashes/contains the raw value, map never
   exported/logged/persisted, hard cap, deterministic encounter ordering,
   discarded after evaluation. No unsalted SHA of low-entropy IDs.
5. Numeric semantics: ephemeral arithmetic only; persist relation facts
   (relationId, MATCH|MISMATCH|NOT_APPLICABLE|INVALID_INPUT, operandCount);
   never raw amounts/differences in production DTOs. NaN/Infinity rejected;
   deterministic integer/decimal-safe model; no float tolerance.
6. Expectations (`src/oracles/expectations/**`): declarative data contracts
   only (no callbacks/executable snippets); fields equivalent to schemaVersion,
   expectationId, targetKind, targetId, sourceProvenance, projectionContract,
   invariantDefinitions; strict validator (unknown fields, duplicate IDs,
   unsupported paths, free-form code, unbounded arrays, missing/malformed
   provenance, unknown invariant types, path traversal rejected);
   `EXPECTATION_SOURCE_STALE` fail-closed when source SHA differs;
   `EXPECTATION_UNAVAILABLE` where source does not support a real expectation.
7. Fixed invariant vocabulary (small deterministic set; only what fixtures
   require): FIELD_PRESENT, FIELD_ABSENT, TYPE_MATCH, CARDINALITY_MATCH,
   ENVELOPE_CLASS, IDENTITY_EQUAL, IDENTITY_PRESENT_IN_COLLECTION,
   NUMERIC_SUM_RELATION, SHAPE_CHANGED. No arbitrary expression evaluator.
8. Cross-step invariant layer (`src/oracles/invariants/**`): consumes only
   safe projections + declarative contracts; list/detail identity consistency,
   expected shape change across a step, cardinality relations, numeric
   relations, envelope semantics.
9. Five required seeded semantic bug classes (corpus/phase9/defects/):
   HTTP_200_ERROR_ENVELOPE, LIST_DETAIL_IDENTITY_MISMATCH,
   STALE_STATE_AFTER_TRANSITION, AGGREGATE_TOTAL_RELATION_MISMATCH,
   CARDINALITY_RELATION_MISMATCH. Synthetic values only; explicit
   `synthetic-*`/`sentinel-*` markers.
10. Benign control corpus (corpus/phase9/benign/) with a benign counterpart
    for every seeded defect (valid envelope; same identity; expected
    transition; valid aggregate; valid cardinality; optional/null fields;
    empty list where allowed; reordered keys; safe array order; omitted
    optional fields). ZERO false positives required (FP = 0/N). Ambiguity ->
    NOT_APPLICABLE / EXPECTATION_UNAVAILABLE, never anomaly.
11. Source-backed expectation fixtures: tiny synthetic source repo under
    corpus/phase9/source-fixture/ consumed through the SAME source adapter
    interface used for real read-only Alphaus source (one implementation for
    both). Optionally a READ-ONLY real-source structural canary; if not
    practical, record `REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED` with the
    exact reason.
12. Semantic finding DTO (`nightwatch.semantic-oracle-finding.v1`): strict
    safe fields (schemaVersion, findingId, oracleId, category, severity,
    journeyId?, stepId?, operationId?, expectationId, sourceProvenance,
    expectedClass, observedClass, projectionDigest(s), relationId?); no raw
    fields; validator rejects unknown fields; deterministic fingerprint from
    safe categorical metadata only (never hashes raw values).
13. Finding categories (finite): APPLICATION_ERROR_ENVELOPE,
    LIST_DETAIL_IDENTITY_MISMATCH, STALE_STATE_AFTER_TRANSITION,
    AGGREGATE_RELATION_MISMATCH, CARDINALITY_RELATION_MISMATCH,
    SOURCE_EXPECTATION_MISMATCH. Severity: no customer/business severity
    inference; admission/triage owns escalation.
14. Integration: Phase 5 API second semantic evaluation stage (protocol PASS
    is not semantic PASS; protocol failure short-circuits when body cannot be
    safely interpreted; composed result with explicit protocol/semantic
    channels); network observer narrowly typed semantic projection hook
    (transient bounded body -> safe projection/finding only; raw discarded;
    no generic response-body subscription API); campaign integration via the
    EXISTING orchestrator/admission path (no test-only dossier injection);
    triage reuse (clustering/confidence/FP catalog/localization/dossier);
    dossier carries sanitized semantic evidence (additive, backward
    compatible).
15. Sentinel leakage harness: plant obvious synthetic sentinels
    (SENTINEL_CUSTOMER_NAME_X7Q, SENTINEL_ACCOUNT_884422,
    SENTINEL_EMAIL_X7Q@example.invalid, SENTINEL_AMOUNT_987654321,
    SENTINEL_ERROR_MESSAGE_X7Q) in every raw-value location; sweep projection
    serialization, findings, fingerprints, recorder events, campaign result,
    triage artifacts, dossier, AI-ready package, thrown error messages,
    snapshot-friendly debug output. Require sentinelLeakCount = 0, including
    failure paths (limit exceeded, expectation invalid, source stale,
    admission fails). Also derived-shape leak checks (lower/upper/URL-encoded/
    escaped/last-four/prefix) with conservative default (content-derived
    string metadata forbidden unless admitted).
16. Exception privacy: bounded classifications
    (SEMANTIC_PROJECTION_LIMIT_EXCEEDED, SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
    SEMANTIC_PROJECTION_PRIVACY_VIOLATION, SEMANTIC_EXPECTATION_INVALID,
    SEMANTIC_EXPECTATION_SOURCE_UNAVAILABLE, SEMANTIC_EXPECTATION_SOURCE_STALE,
    SEMANTIC_EXPECTATION_AMBIGUOUS, SEMANTIC_ORACLE_NOT_APPLICABLE,
    SEMANTIC_ORACLE_ANOMALY). No raw values in error.message/cause/diagnostics.
17. Oracle precision metric over the fixed corpus: seededDefects,
    detectedSeededDefects, missedSeededDefects, benignCases,
    falsePositiveBenignCases, precision, recall. Acceptance: all 5 required
    classes detected; 0 false positives. Baseline comparison: protocol-only
    detection of the 5 required fixtures recorded truthfully (expected 0/5);
    Phase 9 semantic 5/5. Do not manufacture results.
18. Campaign integration fixtures: paired baseline (semantic oracle
    disabled/absent) vs Phase 9 (semantic enabled) through the real
    orchestrator; at least one full end-to-end seeded campaign carrying
    multiple semantic findings into dossiers; each of the five classes
    exercised somewhere in integration coverage.
19. Hardening (`bin/hardening-check.mjs`, narrow): Phase 9 semantic core
    (projections/expectations/invariants/semantic) has no AI import, no
    selfDev/promotion import, no DB/infra dependency, no network transport,
    no persistence APIs, no child_process, no arbitrary app-code execution;
    core projection code never persists. CI: dedicated workflow step
    "Phase 9 deterministic semantic oracle depth matrix"; existing steps
    unchanged; read-only permissions.
20. Validation: typecheck, hardening, Phase 9 matrices, protocol/Phase 5
    oracle matrices, journey/network observer tests, campaign/triage/dossier
    tests, Phase 8/selfDev matrices, owner provenance, campaign synthetic,
    agent:check, agent:audit, project:check, catalog integrity, full
    Playwright 0 failed, isolated full-history checkout, git diff --check.
21. Checkpoints: substantive implementation commit
    (LAST_VALIDATED_IMPLEMENTATION_SHA = LAST_SUBSTANTIVE_CHECKPOINT_SHA),
    push fast-forward, exact implementation CI green (dedicated Phase 9
    matrix actually runs), fresh clean-checkout synthetic acceptance, docs
    closure commit, exact final CI green, final HEAD == origin/main, clean
    worktree.
22. Durable docs: D-54 decision; ROADMAP/CURRENT_STATE/ARCHITECTURE Phase 9
    transitions; PHASE_9_ROADMAP.md implementation record section;
    PHASE_9B DEV-acceptance disposition (RECOMMENDED_SEPARATE_AUTHORIZATION or
    NOT_NEEDED_FOR_PHASE_9_COMPLETION) with evidence; AGENTS.md only if a
    permanent rule needs stating.
23. Closure under continuity v2: Status COMPLETE; PHASE_9_ORACLE_DEPTH_STATUS
    COMPLETE; terminal milestone/WIP/next action/resume recipe; completion
    snapshot complete; no unresolved placeholders; STOP.

## Success metrics (minimum)

- Required semantic bug classes: >= 5; all required detected.
- Benign false positives: 0.
- Raw sentinel leaks: 0 (incl. failure paths).
- Projection determinism: byte-identical across repeated fixture runs.
- Source-stale fail-closed: PASS.
- Synthetic campaign: semantic defect reaches dossier via real admission.
- Protocol baseline comparison: measurable improvement proven.
- Catalog byte-identical bd35b934...; PHASE_8_STATUS COMPLETE; B
  AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE.

## Allowed files

- New: `src/oracles/projections/**`, `src/oracles/expectations/**`,
  `src/oracles/invariants/**`, `src/oracles/semantic/**`,
  `corpus/phase9/**`, `tests/unit/oracleProjection*.test.ts`,
  `tests/unit/oracleExpectation*.test.ts`, `tests/unit/oracleInvariant*.test.ts`,
  `tests/unit/semanticSentinel*.test.ts`, `tests/unit/semanticCampaign*.test.ts`
  (or repository-conventional names).
- Narrow integration edits only where required for the safe finding path:
  `src/api/phase5/oracle.ts`, `src/api/phase5/types.ts`,
  `src/api/phase5/relay.ts`, `src/browser/observers/networkObserver.ts`,
  `src/core/journeys/**`, `src/core/campaign/**` (types only if needed),
  `src/core/triage/**` (dossier additive semantic field),
  `src/core/evidence/**`.
- `bin/hardening-check.mjs`, `.github/workflows/hardening.yml`,
  `docs/**`, `.agent/**`, `AGENTS.md` (only if a permanent rule is needed).

## Forbidden

- `src/core/selfDev/**`, `src/core/selfDevSandbox/**`,
  `src/core/selfDevPromotion/**`, `src/core/policy/ownerScope.ts`
  (no owner-policy expansion), product mutation catalogs, environment
  allowlists, production deny policy, Phase 6 code, AI provider code,
  promotion authority. Any need -> STOP and re-design.
- Real DEV/API execution; NEXT; production; authenticated product execution;
  product mutation; DynamoDB/BigQuery/Spanner; GCP/GKE/Kubernetes; runtime
  deployment discovery; infra/log archaeology; Phase 6 resurrection;
  external/local model execution; AI oracle authority; AI campaign control;
  Alphaus repository writes; publication; selfDev candidate adoption;
  sandbox adoption; canonical promotion prepare/approve/APPLY; catalog
  mutation; variant-B adoption; owner-policy expansion; raw value/body
  persistence; arbitrary DOM text; executing Alphaus source code; dynamic
  arbitrary expressions; unbounded recursive projection; invented real
  product semantics; source-backed expectation without provenance;
  lowering existing containment/privacy protections.
- Do not fix the unrelated `invalidReducedReplay` minimization stub
  (P9-C follow-up territory).

## Stop conditions

- `PHASE_9_ORACLE_DEPTH_STOPPED_SOURCE_ADVANCED` — starting source advanced
  (no reset/rebase/overwrite; recover from continuity STATE or switch mode).
- `PHASE_9_ORACLE_DEPTH_BLOCKED_PROJECTION_LEAKAGE` — raw-value leakage
  cannot be solved cleanly (STOP immediately).
- `PHASE_9_ORACLE_DEPTH_BLOCKED_EXPECTATION_MODEL` /
  `_BLOCKED_EXPECTATION_DRIFT` / `_BLOCKED_FP_BOUND` /
  `_BLOCKED_CAMPAIGN_INTEGRATION` / `_BLOCKED_FULL_REGRESSION` /
  `_BLOCKED_CI` / `_BLOCKED_CONTINUITY` / `_BLOCKED_PHASE8_BOUNDARY_DRIFT` —
  gates are never weakened to force closure.
- Any requirement to persist raw values, execute Alphaus source, use Phase 6,
  infra, promotion machinery, AI oracle authority, or expand owner policy ->
  STOP and re-design; classify and report.
