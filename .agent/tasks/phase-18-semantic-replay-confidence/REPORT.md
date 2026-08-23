# Phase 18 Report

Status: COMPLETE (LOCAL / SOURCE / SYNTHETIC; EXTERNAL CI BLOCKED)
Task ID: phase-18-semantic-replay-confidence
Phase: 18-SEMANTIC-REPLAY-CONFIDENCE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

START SHA: `80212fcb5dc4e8648b174b209636090a17c89c5c`
FINAL SHA: `DISCOVER_FROM_GIT`
Last validated implementation SHA: `937f887413e5231b385940bd310b7708bc4a0a0e`
Last substantive checkpoint SHA: `937f887413e5231b385940bd310b7708bc4a0a0e`
Last documentation checkpoint SHA: `0a184adc18a5185cfdf00e1b91699ec617983d1b`
Live HEAD authority: `DISCOVER_FROM_GIT`

## PHASE 18 STATUS

Local/source/synthetic implementation, validation, exact parity, authorized
checkpoint push, and terminal documentation are complete. External CI is a
separate blocked fact, not a local failure and not a CI-green claim.

## WORKSTREAMS COMPLETED

- M0: authorization, control plane, and Gate Zero reconstruction.
- M1: additive semantic contracts, strict parsing, projections, and
  source-currentness.
- M2: eight deterministic business-semantic anomaly classes with positive and
  benign controls.
- M3: occurrence-bound replay V3 and explicit replay outcome taxonomy.
- M4: actual synthetic semantic replay/minimization with identity preservation.
- M5: confidence gates/degradation, semantic identity, clustering, and
  change-impact × semantic coverage.
- M6: dossier fidelity, adversarial corpus, parser/privacy/static hardening,
  and dead-surface review.
- M7 local validation: exact canonical/isolated parity and clean trees.

## DEFECTS

- `DEF-18-01` — Reproduced: Phase 15 semantic confidence/minimality could be
  inflated by aggregate replay/cluster counts. Root cause: semantic finding
  identity and occurrence context were not load-bearing in confidence and
  minimality. Repair: strict finding-identity-bound V3 replay evidence,
  occurrence binding, actual reduced evaluation, and unresolved fallback when
  journey reduction is unsupported. Permanent regression: Phase 15 F2/F11/F12
  compatibility plus Phase 18 replay/minimizer/confidence tests. Status:
  `REPRODUCED → ROOT_CAUSED → SOURCE_FIXED → PERMANENT_REGRESSION →
  FOCUSED_GREEN → AFFECTED_GREEN → FULL_GREEN`.
- `DEF-18-02` — Reproduced: required Phase 18 control-plane updates were
  falsely reported as a stale implementation baseline. Root cause: the
  continuity checker omitted four required task-document names from its
  approved checkpoint-path allowlist. Repair: exact allowlist entries plus a
  focused approved-path regression. Permanent regression: 106 continuity
  tests and both full regression cones. Status:
  `REPRODUCED → ROOT_CAUSED → SOURCE_FIXED → PERMANENT_REGRESSION →
  FOCUSED_GREEN → AFFECTED_GREEN → FULL_GREEN`.

## SEMANTIC CAPABILITIES ADDED

The bounded semantic model now evaluates aggregate/detail consistency,
cross-step state relations, pagination-window identity uniqueness,
empty-state coherence, lifecycle/state transitions, sanitized cross-surface
equivalence, and source/fixture-backed HTTP-200 application-error envelope
semantics. Projections retain only categorical type, presence, cardinality,
opaque identity relations, ordering, abstract quantities, and lifecycle facts.

## NEW ANOMALY CLASSES

| Class | Positive fixture | Benign control | Detection |
| --- | --- | --- | --- |
| Aggregate/detail consistency | `aggregate-count` | matching count/detail rows | detected; control PASS |
| Identity uniqueness | `detail-identity` | unique opaque identities | detected; control PASS |
| Cross-step state | `cross-step-state` | permitted stable state | detected; control PASS |
| Pagination/window | `pagination-window` | disjoint windows and coherent metadata | detected; control PASS |
| Empty-state | `empty-state` | zero count/rows/empty marker agree | detected; control PASS |
| Lifecycle transition | `lifecycle-transition` | permitted transition sequence | detected; control PASS |
| Cross-surface equivalence | `cross-surface` | equivalent sanitized browser/API projection | detected; control PASS |
| HTTP-200 error envelope | `http-200-error-envelope` | source-backed success envelope | detected; control PASS |

## PROVENANCE/CURRENTNESS IMPROVEMENTS

Expectations now classify `CURRENT`, `STALE`, `AMBIGUOUS`, `MISSING`,
`UNSUPPORTED`, and `SYNTHETIC_ONLY`. Digest changes, removed/renamed source,
multiple definitions, missing provenance, and unverified evidence fail closed;
formatting/property-order-only normalization remains current. Stale evidence
is retained as historical context but cannot support current HIGH confidence.

## REPLAY

- Occurrence binding: V3 carries action kind, step ordinal, semantic
  expectation identity, predecessor-context digest, observation fingerprint,
  and sanitized occurrence ordinals. Repeated action IDs without ordinals are
  explicitly ambiguous.
- Result taxonomy: `REPRODUCED_EXACT`, `REPRODUCED_EQUIVALENT_SEMANTIC`,
  `PRECONDITION_DIVERGENCE`, `SEMANTIC_DIVERGENCE`, `NOT_REPRODUCED`,
  `AMBIGUOUS_OCCURRENCE`, `SOURCE_STALE`, `INVALID_REPLAY`, and
  `INFRA_FAILURE`; infrastructure failure is never product non-reproduction.
- Deterministic reproduction evidence: the same semantic finding and contract
  identity, current source, uniquely bound occurrence, clean safety vector,
  and deterministic executor are required for exact claims.

## MINIMIZATION

- Candidate count: bounded at 64 reduced-candidate evaluations and 65 total
  replay slots per synthetic minimization (the fresh replay is separate).
  Cross-scenario aggregate counts are intentionally not persisted.
- Successful reductions: semantic-trigger-to-single-step, first/middle/last
  noise removal, and repeated-occurrence reduction while retaining occurrence
  ordinals.
- Rejected reductions: joint/order/expectation/predecessor requirements,
  precondition divergence, executor throw, executor nondeterminism, and
  different-fingerprint candidates; each records a bounded reason.
- Wrong-anomaly acceptance count: `0`.

## TRIAGE

HIGH requires a deterministic semantic oracle, current provenance, exact
finding/contract identity on replay, unique occurrence binding, verified
minimality evidence where claimed, and clean privacy, safety, source,
precondition, determinism, and infrastructure gates. Adversarial false-HIGH
count: `0`. Stale source, semantic divergence, ambiguous occurrence,
precondition divergence, missing expectation, and infrastructure failure all
degrade or block HIGH.

## CONFIDENCE DEGRADATION

The synthetic degradation matrix changes a current exact replay receipt to
precondition-divergent and then stale-source evidence; neither remains HIGH.
Historical observation evidence is preserved while current confidence is
recomputed from explicit receipt/currentness fields.

## CLUSTERING

Semantic identity is deterministic and excludes timestamps, run IDs,
filesystem paths, and raw values. It separates invariant kind, surface,
provenance identity, stale/current state, and protocol-vs-semantic outcomes;
harmless property ordering and run changes do not split the same contract.

## CHANGE-IMPACT × SEMANTIC COVERAGE

The Phase 17 approved portfolio bridge now emits bounded reasons for source
change with semantic coverage, source change without semantic coverage,
baseline health with semantic coverage, and unresolved source evidence.
Fallback, stale, ambiguous, irrelevant, and unlinked evidence receives no
semantic-impact authority.

## DOSSIER CHANGES

Sanitized dossier evidence now carries the failed invariant category,
provenance/currentness, semantic and contract identities, occurrence-bound
replay outcome, minimization/rejection evidence, confidence blockers, and
safety/privacy gates. Strict v2 root/prototype/schema validation rejects
malformed or cross-identity documents; legacy readers remain compatible.

## CORPUS

- Fixture/scenario count: 8 semantic business-behavior classes, each with a
  positive and benign control, plus hostile parser/privacy/replay/triage
  scenarios.
- Deterministic repetitions: 3 runs with property and fixture-order variants;
  generated outputs remained byte-stable.
- Quality floors: `privacyLeaks=0`, `safetyEscapes=0`,
  `unauthorizedOperations=0`, `falseHighConfidence=0`,
  `semanticIdentityEscapes=0`, `replayOccurrenceAmbiguitiesAccepted=0`,
  `staleExpectationHighPromotions=0`, `nondeterministicArtifacts=0`,
  `wrongAnomalyMinimizationsAccepted=0`.

## PRIVACY

Hostile synthetic sentinels produced `0` leaks through findings, triage,
replay plans, clusters, dossiers, CLI diagnostics, or continuity files.

## VALIDATION

- typecheck: PASS.
- focused Phase 18 semantic depth: 22 passed.
- focused continuity repair matrix: 106 passed.
- affected semantic/triage compatibility: 143 passed.
- hardening: PASS.
- campaign synthetic: 27 passed.
- owner provenance: 91 passed.
- agent check: PASS with 3 expected checkpoint/legacy warnings.
- agent audit: `tasks=61 strict_v2=37 legacy_v1=24 strict_errors=0
  legacy_warnings=33`.
- project check: PASS; catalog count/digest unchanged and promotion authority
  `NONE`.
- canonical regression: 2,285 enumerated; 2,281 passed; 4 skipped; 0 failed.
- isolated regression: fresh clone, `npm ci`, read-only sibling links,
  `NIGHTWATCH_SIBLING_ROOT`, distinct proxy port; 2,285 enumerated; 2,281
  passed; 4 skipped; 0 failed.
- parity: exact enumeration, pass/fail counts, skip inventory, and clean tree.
- skip inventory in both runs: `tests/unit/phase5Api.test.ts:197`, `:246`,
  `:280` (source-built OOPS unavailable), and
  `tests/unit/selfDevSandboxConfinement.test.ts:147` (base uid condition).
- `git diff --check`: PASS at each checkpoint.

## CI

Actions run `32637996369` / job `97190524900` for pushed head
`0a184adc18a5185cfdf00e1b91699ec617983d1b` completed as failure with
`steps=[]` under the standing billing/spending restriction. It was inspected
once and not retried. Local validation is not represented as CI green.

## SAFETY

DEV contacts: 0
NEXT contacts: 0
production contacts: 0
authenticated sessions: 0
product mutations: 0
data-plane operations: 0
DB/datastore operations: 0
cloud/infra operations: 0
Alphaus sibling writes: 0
external publications: 0
credential leaks: 0

## DEFERRED WORK

Real-product acceptance, DEV/NEXT/production contact, Phase 16D, Phase 6,
Phase 11B/13B, infrastructure/data operations, AI authority, canonical
promotion, sibling writes, publication, and raw evidence persistence remain
outside this authorization.

## NEXT BEST DEVELOPMENT TARGET

A separately authorized local/source/synthetic wave for deeper source-proven
multi-window aggregate/state contracts and broader semantic coverage, with
fresh benign controls and the same occurrence/currentness/privacy gates.

## CURRENT CLOSURE

`HEAD == origin/main`: true after the authorized push.
Working tree: clean.
Final live SHA: `DISCOVER_FROM_GIT` (the final documentation descendant is
discovered from Git and must remain equal to `origin/main`).
Phase 18 is terminal local/source/synthetic complete with external CI blocked.
