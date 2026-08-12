# Nightwatch Phase 2C — Replay + Oracle Verification

## Task purpose

Turn the three completed Phase 2B Ripple journeys into trustworthy behavioral
canaries. Phase 2C verifies that Nightwatch can distinguish strict contract
violations, bounded replay variance, expected containment, invalid
authentication, transient DEV noise, and Nightwatch measurement defects. The
observable outcome is a versioned replay/oracle model, synthetic failure
regressions, six additional bounded fresh-context observations, and an
evidence-backed closure report. This task does not begin Phase 3.

## Established starting state

- Task ID: `phase-2c-replay-oracle-verification`
- Starting Nightwatch HEAD: `1760e594419cabdcec12f6506cabe3aa242331c4`
- Validated Phase 2B implementation: `78e5d1f049064e594f99ed7e600ecffb081d6b23`
- Phase 2B completion checkpoint: `1b6e7a5ad2d0566aca84a370caa6989e71573f57`
- Phase 2B terminal clean HEAD: `1760e594419cabdcec12f6506cabe3aa242331c4`
- Phase 2A validated implementation: `a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c`
- Phase 2A closure checkpoint: `9bf2c4593c9eb46db8bb8a5975bfa336461641cd`
- Phase 2A terminal clean HEAD: `ec4c14376923ffbe12356dd180218eb09cf4f75f`
- Phase 2A/2B closure is independently reconciled. Their implementation and
  journey contracts remain closed; only shared replay/oracle/evidence/
  comparison infrastructure may be hardened if a concrete defect is proven.
- The canary set is frozen to the existing Phase 2B contracts: payer
  exchange-rate read, common exchange-rate read, and account inventory.
- The Phase 2B J2 DEV font HTTP 502 is one `L0` non-blocking anomaly candidate;
  its bounded diagnostic pair did not reproduce it. It must not be promoted
  without new same-fingerprint fresh-context evidence.
- The historical malformed JSON at the unresolved semantic endpoint
  `/m/blue/cost/v1/` remains a separate genuine protocol anomaly. It is not
  intentionally invoked or replayed.
- The historical Phase 1.1 `api.alphaus.cloud` contact remains preserved as a
  historical safety fact. It must not be rewritten as “never contacted
  production”; current controlled-run accounting is reported separately.

## Required deliverables

- A completed Phase 2A/2B closure reconciliation in this task's state.
- Frozen three-journey contract and definition digests before real execution.
- An audited replay model with explicit `FIRST_OBSERVATION`,
  `FRESH_CONTEXT_REPLAY`, and `BOUNDED_REPETITION` vocabulary.
- A complete generic oracle inventory and a journey-specific oracle audit,
  including severity, safety/product/infra class, causality, evidence,
  replay expectation, privacy risk, and test coverage.
- Explicit strict invariants and justified bounded-variance classes; no
  arbitrary magic tolerances.
- Versioned sanitized anomaly fingerprints, failure attribution, and a
  conservative `L0`/`L1`/`L2` admission model.
- Durable false-positive and false-negative catalogs, including historical
  Nightwatch failure modes and regression coverage references.
- A real-implementation synthetic failure matrix covering status,
  criticality, content type, JSON/NDJSON/empty/aborted responses, runtime
  signals, CSP, auth, structural/route/semantic divergence, cancellation,
  containment, privacy, fingerprint reproducibility, and variance.
- Six additional real DEV contexts, serially executed as J1-C1/J1-C2,
  J2-C1/J2-C2, J3-C1/J3-C2, using fresh browser contexts and the frozen
  Phase 2B definitions. A repair retry is allowed only after a proven
  Nightwatch defect, with a new matrix version and a fresh validation gate.
- Sanitized differential evidence covering Phase 2B and Phase 2C runs,
  failure attribution, J2's conservative font-502 status, and historical
  malformed-JSON status.
- Final privacy/safety/adversarial review, full validation, a clean Nightwatch
  handoff commit, and `ACTIVE_TASK.md` marked `COMPLETE`.

## Explicit non-goals

- Phase 3 change-directed journey selection or commit intelligence.
- New customer journeys, journey actions, selectors, endpoint approvals, or
  contract redesign merely to improve replay results.
- Fuzzing, random/model-based exploration, AI planning, LLM diagnosis, or
  autonomous bug filing.
- Datastore queries, API datastore oracles, DynamoDB/BigQuery/Spanner access,
  production traffic, product mutations, exports, or writes of any kind.
- Deliberately inducing the DEV font failure or invoking the historical
  malformed-JSON endpoint.
- Raw request/response bodies, DOM, screenshots, traces, auth values,
  customer/account/resource identifiers, costs, cookies, tokens, or query
  secrets in evidence.
- A future full failure minimizer, statistical precision/recall claims, or
  source/change correlation beyond existing source proof.

## Safety constraints

- Only `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch` may be
  modified. Alphaus repositories are read-only inputs.
- Reuse the canonical Phase 2A/2B safety kernel. Production and unknown
  destinations remain fail-closed; no dynamic approval or policy fork is
  allowed.
- Validate the external DEV auth state with boolean-only applicability,
  provenance, expiry, and live page-readability checks before every real
  context. If invalid, stop with the human-auth blocker.
- Run real contexts serially. Stop all remaining contexts immediately on a
  production attempt, proxy violation, unknown destination/approval, known
  mutation, action-caused UNKNOWN, privacy leak, auth integrity failure, or
  safety-kernel regression.
- Do not inspect or persist response bodies, storage state, DOM/text, headers,
  query values, screenshots, traces, or customer data.
- Do not use a product anomaly as permission to weaken an oracle or retry
  until green. Preserve unresolved and refuted classifications.

## Frozen canary set and real-run budget

The only real canaries are the existing Phase 2B definitions:

| ID | Contract | Phase 2B baseline |
|---|---|---|
| J1 | `ripple-payer-exchange-read` | first + fresh-context replay PASS |
| J2 | `ripple-common-exchange-read` | initial font-502 L0; bounded diagnostic first + replay PASS |
| J3 | `ripple-account-inventory` | first + fresh-context replay PASS |

The Phase 2C base matrix is exactly six additional contexts, serially:

`J1-C1 → J1-C2 → J2-C1 → J2-C2 → J3-C1 → J3-C2`.

Each context is a new BrowserContext with the same external auth path,
environment, target, semantic registry, journey definition, selector/action
list, safety policy, and oracle policy. The six-context base budget is fixed
before real execution. At most one narrowly justified additional diagnostic
context may be used per proven Nightwatch defect, and only after checkpointing
the failed evidence, adding a synthetic regression, full local validation,
and starting a new matrix version. No retry is permitted for a product,
infrastructure, auth, or unresolved anomaly.

## Replay and comparison model

The implementation must preserve these terms:

- `FIRST_OBSERVATION`: the first context for a frozen journey contract.
- `FRESH_CONTEXT_REPLAY`: one newly created BrowserContext after the prior
  context closes, using the same definition and external auth state.
- `BOUNDED_REPETITION`: a declared serial set of independent fresh contexts
  used to measure reproducibility without load testing.

Fresh contexts must not share a Page, service-worker state, mutable journey
definition, test-mutated local state, or in-memory oracle state. Intentional
external auth reuse is allowed only through the existing guarded state path.
The comparator must preserve dimensions rather than collapse them to PASS or
FAIL. Its result vocabulary is:

`STRICT_MATCH`, `BOUNDED_MATCH`, `EXPECTED_VARIANCE`,
`INVARIANT_DIVERGENCE`, `SAFETY_DIVERGENCE`, `AUTH_DIVERGENCE`, and
`ORACLE_DIVERGENCE`.

Request and route comparison must use source/evidence-backed normalization:
query timestamps, cachebusters, random request IDs, and customer/resource
identifiers may be normalized only where semantically irrelevant; meaningful
endpoint, method, route, or class changes must remain visible. Differential
evidence stores categories, counts, classes, sanitized path templates, and
bounded timing deltas, never raw request sets or values.

## Strict invariants

For every canary, the following are strict unless the frozen journey contract
proves a class inapplicable:

- `CONTRACT_IDENTITY`: journey ID, contract version/digest, oracle version,
  semantic registry version, and intentional step sequence are identical.
- `AUTH_INVARIANT`: external state is valid, DEV-proven, applicable, and
  page-readable; stale auth is `AUTH_INVALID`, not a product anomaly.
- `SAFETY_INVARIANT`: production attempts, proxy violations, unknown
  destinations, unknown approvals, mutations, DB queries, and action-caused
  UNKNOWN are zero.
- `ROUTE_INVARIANT`: final route and route class match the source-backed
  contract; aliases are normalized only when source proves equivalence.
- `STRUCTURAL_INVARIANT`: global QLayout shell and the journey-specific
  fixed structural marker set are present with required counts.
- `SEMANTIC_REQUEST_INVARIANT`: every intentional expected `KNOWN_READ` rule
  occurs with the expected class; no `KNOWN_MUTATION` occurs; passive UNKNOWN
  remains distinct from action-caused UNKNOWN.
- `FATAL_RUNTIME_INVARIANT`: no fatal runtime exception, unhandled rejection,
  required-script/CSP failure, critical resource failure, or journey
  readiness failure.
- `ORACLE_INVARIANT`: oracle result, primary failure, and secondary oracle
  categories are attributed without promoting a secondary signal to cause.
- `PRIVACY_INVARIANT`: no forbidden artifact class and no unsafe differential
  or fingerprint field is emitted.

## Bounded variance model

The following may vary only as named categories, not through arbitrary
percentage tolerances:

- route/readiness/cleanup elapsed milliseconds: compare as timing metadata;
  variance is expected when strict readiness and route class both hold;
  a timeout or loss of the required continuous interval is suspicious/fatal;
- concurrent request/response ordering: compare by normalized semantic
  family and required relative action/read ordering; harmless concurrency
  reorder is expected, missing/extra intentional family is divergence;
- passive UNKNOWN and passive initialization counts: compare as bounded
  observation counts and preserve exact deltas; count changes alone are not a
  product failure, but action-caused classification is strict;
- optional/telemetry/browser-background blocked counts: compare by explicit
  containment category; new host or unclassified category is safety failure;
- non-critical asset counts and safe cleanup-incomplete counts: compare by
  resource role/status taxonomy; criticality or completion-state changes are
  strict;
- network concurrency and initialization timing: record bounded metadata;
  it becomes suspicious when it prevents the readiness contract or changes
  semantic request classification.

No field is accepted using “close enough.” Numeric thresholds must come from
the existing 750 ms readiness contract or an explicit role/state taxonomy.

## Oracle and anomaly admission policy

Every oracle result records trigger and causality separately:

`ORACLE_TRIGGERED` is an observation; `CAUSAL_TO_PRIMARY_FAILURE` is one of
`PROVEN`, `LIKELY`, `UNRESOLVED`, or `NOT_CAUSAL`. Causality is not inferred
from timestamps alone. Failure attribution contains `PRIMARY_FAILURE`,
`SECONDARY_ORACLES`, `SAFETY_FAILURE`, `CONTAINMENT_EVENTS`,
`LIKELY_CAUSE`, and `CAUSALITY_CONFIDENCE`.

Anomaly classes remain separate: `NIGHTWATCH_DEFECT`,
`PRODUCT_BEHAVIOR_ANOMALY`, `DEV_INFRA_TRANSIENT`, `BROWSER_BACKGROUND`,
`EXPECTED_CONTAINMENT`, `AUTH_STATE_INVALID`, `SOURCE_CONTRACT_STALE`, and
`UNKNOWN`. `KNOWN_TRANSIENT` may be used only as visible, non-safety,
non-baseline frequency status; it never means ignore forever.

Admission ladder:

- `L0`: one context with one exact sanitized fingerprint; anomaly candidate,
  no reproduction claim.
- `L1`: the exact fingerprint reproduces in a fresh context under the same
  frozen contract/version; causal/product ownership remains open.
- `L2`: the exact fingerprint reproduces in at least three independent
  contexts under the same frozen contract/version. Similar status or route
  anomalies with different fingerprints do not count.

Anomalies may be `NOT_REPRODUCED`, `REFUTED`, or
`SUPERSEDED_BY_NIGHTWATCH_DEFECT`; a passing journey does not erase a
secondary anomaly. The Phase 2B J2 font event begins at L0 and remains
non-baseline unless the matrix supplies exact same-fingerprint evidence.

## Privacy and evidence schema

Phase 2C may add fields only under an explicit evidence schema version. Old
Phase 2A/2B sanitized artifacts must remain parseable or be explicitly
reported as versioned unsupported. Fingerprints may contain only journey ID,
step ID, oracle ID, resource role, sanitized host/path template, status class,
content-type class, route class, structural checkpoint, and runtime category.
They must not contain customer names/IDs, cost values, tokens, secrets,
cookies, query values, request/response bodies, DOM, or screenshots.

Required per-context metadata is limited to run ID, journey/contract/oracle
versions, auth booleans, readiness booleans, strict-invariant results,
bounded-variance categories, oracle IDs, fingerprints, safety counts,
privacy result, classification, and sanitized evidence references.

## Synthetic acceptance matrix

Before real execution, local tests must exercise the real observer,
classifier, evidence builder, fingerprint logic, executor, and comparator for:

1. critical JS 500; 2. font 502 with asset severity distinct from bootstrap;
3. optional image failure; 4. navigation-canceled JS; 5. JS returns HTML;
6. malformed JSON; 7. valid NDJSON; 8. empty/204; 9. aborted JSON;
10. pageerror; 11. unhandled rejection; 12. warning-only console;
13. required-JS CSP block; 14. expired auth; 15. unreadable page auth;
16. shell present/marker absent; 17. route mismatch; 18. passive UNKNOWN;
19. action-caused UNKNOWN; 20. known mutation; 21. bounded timing variance;
22. bounded request-count variance; 23. structural divergence;
24. semantic endpoint divergence; 25. recurring same fingerprint;
26. different 502 resources not conflated; 27. fake sensitive data never
persisted. Golden fixtures must be durable and tied to regression tests.

## Completion criteria

Phase 2C is complete only when:

1. Phase 2A/2B closure and SHA semantics are reconciled.
2. The native task and frozen SPEC/PLAN/STATE/REPORT exist.
3. The three Phase 2B journeys remain the only canaries.
4. Replay, generic oracle, journey oracle, invariant, variance, fingerprint,
   causality, failure attribution, false-positive, false-negative, and
   admission models are durable and evidence-backed.
5. Synthetic tests exercise real implementation code and all matrix cases
   pass; golden failure fixtures exist where appropriate.
6. Evidence is versioned/compatible and privacy-safe.
7. The six-context serial real matrix completes within budget, with all
   safety stop conditions respected.
8. Differential analysis includes Phase 2B and Phase 2C evidence, and J2's
   font anomaly is classified conservatively.
9. Current Phase 2C safety counts are all zero for production attempts,
   proxy violations, unknown destinations, unknown approvals, mutations, DB
   queries, and action-caused UNKNOWN.
10. Privacy, architecture, adversarial self-review, TypeScript, Playwright,
    agent continuity, whitespace, and clean-tree checks pass.
11. Alphaus repositories are unchanged; no Phase 3 task is started.
