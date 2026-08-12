# NIGHTWATCH PHASE 2C — REPLAY + ORACLE VERIFICATION

Status: `IN_PROGRESS`; shared Phase 2C implementation, synthetic matrix, and
the six-context DEV matrix are complete. Differential review found one shared
Nightwatch comparator defect that must be repaired before closure.

## Starting identity

- Starting SHA: `1760e594419cabdcec12f6506cabe3aa242331c4`.
- Inherited validated implementation: `78e5d1f049064e594f99ed7e600ecffb081d6b23`.
- Inherited Phase 2B checkpoint: `1b6e7a5ad2d0566aca84a370caa6989e71573f57`.
- Canary set: J1 payer exchange-rate read, J2 common exchange-rate read,
  J3 account inventory.

## Phase 2A/2B closure reconciliation

Phase 2A and Phase 2B are closed. The implementation/checkpoint/terminal SHA
semantics are preserved exactly as recorded in SPEC/PLAN/STATE. The Phase 2B
terminal tree was independently verified clean, and its descendants after
`78e5d1f` are approved `.agent` continuity/documentation changes only. This
task does not reopen either phase.

## Closure sections to populate

- Replay-engine and oracle inventory/audit
- Invariant, variance, fingerprint, causality, and failure-attribution model
- False-positive/false-negative catalog
- Synthetic matrix and golden-fixture result
- Phase 2C serial real-run ledger and differential analysis
- J2 font-502 and malformed-JSON final classifications
- Safety/privacy/architecture/adversarial review
- Final validation and acceptance verdict

## Current blocker

`PHASE_2C_DISCOVERED_SHARED_INFRA_DEFECT`: the V1 replay comparator treated a
one-count difference in expected third-party `CANCELED_BY_POLICY` containment
as strict `resource-lifecycle` divergence for J1. The real journey and safety
result passed; the comparator classification is not defensible until expected
containment is bounded. J2 and J3 comparisons passed. V1 evidence is retained
and no product anomaly is admitted from this event.

## Phase 2C v1 real matrix

Artifact: `artifacts/phase2c-nightwatch-20260812T041319Z-6552-matrix.json`.
Implementation: `043c2cc02b96ce9aec42c6b529978150c09dabfe`.
Contract/oracle/evidence versions: `nightwatch.journey.phase2c.v1`,
`nightwatch.oracle.phase2c.v1`, `nightwatch.evidence.phase2c.v1`.

All six contexts ran serially with valid storage-state facts and page-visible
auth. J1-C1 `nightwatch-20260812T041319Z-6552-j1-c1` and J1-C2
`nightwatch-20260812T041319Z-6552-j1-c2` both finished PASS. J2-C1
`nightwatch-20260812T041319Z-6552-j2-c1` and J2-C2
`nightwatch-20260812T041319Z-6552-j2-c2` both finished PASS. J3-C1
`nightwatch-20260812T041319Z-6552-j3-c1` and J3-C2
`nightwatch-20260812T041319Z-6552-j3-c2` both finished PASS.

The J1 differential had identical route, structural markers, semantic read
families/ledger, auth, safety, and zero oracle observations. Its only
difference was six versus five `THIRD_PARTY/CANCELED_BY_POLICY` resource
records, which are expected containment and must be compared as bounded
variance. V1 therefore produced a false replay divergence:
`ORACLE_DIVERGENCE`, strict mismatch `resource-lifecycle`, timing variance
52 ms. J2 was a bounded match with 58 ms timing variance; J3 was a bounded
match with 6 ms timing variance. No J2 font-502 fingerprint and no historical
malformed-JSON event recurred naturally.

This is admitted as `PHASE_2C_DISCOVERED_SHARED_INFRA_DEFECT`, not a product
bug. V1 is preserved as pre-fix evidence. The repair is to exclude expected
policy/navigation/browser cancellation from strict resource-failure keys while
retaining it in containment/lifecycle evidence; a synthetic regression and
one narrowly scoped post-fix J1 diagnostic context are required before final
closure. Pre-fix and post-fix observations will not be treated as one replay
contract.

## Static replay/oracle audit checkpoint

The audit is complete and the shared implementation plus synthetic matrix are
now recorded below; only the clean pre-real checkpoint and bounded DEV matrix
remain.

Replay findings:

- Fresh `BrowserContext`/page, service-worker blocking, per-context monitors,
  route guards, and network observers are healthy.
- Authentication reuse is safe at the storage-state boundary, but each real
  context still needs page-visible auth equivalence recorded before the
  journey result is admitted.
- Journey definitions are readonly by type but not runtime-deep-frozen or
  digest-checked; this is a contract-freeze risk.
- The existing comparator checks route, shell/markers, selected step state,
  semantic sets, mutation/action-UNKNOWN counts, auth, oracle, privacy, and
  pass state, but loses request counts/methods/order, resource roles,
  background containment, safety vectors, fingerprints, and causality.
- Existing timing/passive-count differences are treated as broad expected
  variance without a dimensioned result vocabulary or rationale.

Generic oracle findings:

- HTTP status is currently role-agnostic; the Phase 2B font 502 therefore
  shares a path with application/bootstrap failures.
- Resource cancellation is correctly separated from real request failure,
  but role and completion state are not carried into journey evidence.
- JSON handling correctly skips empty/204/incomplete bodies and recognizes
  declared JSON, but the NDJSON fallback can classify some declared non-stream
  bodies too aggressively.
- Page errors and console errors are admitted separately; console warnings
  are nonfatal. Unhandled rejections, CSP violations, and bootstrap
  content-type/resource diagnostics are recorded but are not consistently
  admitted to the journey result.
- Route, QLayout/global shell, journey markers, endpoint registry, mutation
  tripwire, and privacy redaction are healthy. Auth and failure attribution
  need explicit result dimensions so an invalid page auth or secondary asset
  issue cannot become an unexplained product failure.

False-positive catalog:

| Pattern | Correct interpretation | Regression anchor |
|---|---|---|
| expired auth | `AUTH_STATE_INVALID`, not product failure | storage plus page-readable auth fixtures |
| Vue pre-mount `#app` | not application-ready failure | post-mount QLayout readiness |
| navigation-canceled resource | cancellation lifecycle, not asset failure | aborted navigation fixture |
| timing-only reload change | not causal without correlated failure | reload causality tests |
| context-only token | not page authentication | live auth readability check |
| one DEV font 502 | visible L0 transient candidate, not baseline | role-aware status fixture |
| HTTP delivery without execution | delivery is not execution | bootstrap/runtime fixture |
| secondary oracle beside primary failure | preserve primary/secondary attribution | attribution matrix |
| source-proven optional containment | `EXPECTED_CONTAINMENT`, not hidden failure | blocked-host fixtures |

False-negative catalog:

- unhandled rejection/CSP and JS-HTML content-type can currently fail to reach
  the journey result;
- optional-resource role can be lost when all request failures use one issue;
- semantic counts/order and action-step attribution are reduced to unique sets;
- navigation-caused UNKNOWN has an exemption that requires explicit audit;
- live page auth is checked after the journey rather than gating it;
- criticality, background variance, anomaly fingerprints, and causal confidence
  are absent or flattened;
- required reads are currently run-wide rather than strictly step-scoped.

These are concrete implementation risks, not claims that the product is
defective. Phase 2C will harden shared infrastructure and exercise the real
observer/classifier/evidence/comparator paths with local fixtures before any
DEV matrix execution.

## Shared model after hardening

The implementation now uses `nightwatch.journey.phase2c.v1`,
`nightwatch.oracle.phase2c.v1`, and `nightwatch.evidence.phase2c.v1`. Journey
definitions are deep-frozen and have a canonical SHA-256 digest. Each real
context creates a new BrowserContext and page, reuses only the approved
external auth state, installs the same safety policy, and starts a fresh
semantic-observation boundary. Mutable monitor, network, evidence, and
comparator state is not shared between contexts.

The comparator reports dimensions rather than a single unexplained boolean:
`STRICT_MATCH`, `BOUNDED_MATCH`, `EXPECTED_VARIANCE`,
`INVARIANT_DIVERGENCE`, `SAFETY_DIVERGENCE`, `AUTH_DIVERGENCE`, and
`ORACLE_DIVERGENCE`. Its differential evidence is metadata-only: route and
structure classes, semantic request families/dispositions/steps, bounded
counts and timing, oracle IDs/fingerprints, containment counts, auth/safety,
and privacy status. Query strings, IDs, request/response bodies, DOM, and
customer values are not part of comparison or persistence.

## Generic oracle inventory

The following is the complete Phase 2C inventory of the generic paths used by
the three canaries. “Class” is deliberately separate from severity: a warning
or product/protocol anomaly is not a safety violation.

| Oracle ID/family | Purpose, input, and trigger | Severity/class | Evidence and replay expectation | False-positive/negative risk and coverage | Verdict |
|---|---|---|---|---|---|
| `critical-resource-status`, `known-read-status`, `unexpected-status` | Classify HTTP status by resource role: document, application entry/critical script/style, known-read API, font/image/optional/third-party. Trigger on a non-success status outside the role policy. | Critical roles/error; known-read error; font/image/optional warning. Product or DEV-infra anomaly, not automatically safety. | Sanitized role, status class, path template, lifecycle, issue and fingerprint. Exact role/fingerprint comparison; optional/background variance remains visible. | Font 502 is no longer equivalent to bootstrap 502. A wrongly inferred role remains a precision risk. Covered by critical JS 500, font 502, optional image fixtures and unit matrix. | HEALTHY after role-aware hardening. |
| `critical-resource-content-type`, `known-read-content-type`, `unexpected-content-type` | Compare status/resource role with content-type class; trigger when JS/CSS/API/font delivery is semantically incompatible. | Bootstrap/known-read protocol anomaly according to role; asset anomaly for font/image. | Status, role, content-type class, path template, fingerprint; no body. Repeated exact fingerprint is comparable. | JS-as-HTML and API-as-HTML are strong signals; noncritical asset mismatch must not become app-entry failure. Covered by browser fixture and protocol tests. | HEALTHY. |
| Resource lifecycle | Distinguish `REQUESTED`, `COMPLETED`, `NETWORK_FAILED`, `HTTP_FAILED`, `CANCELED_BY_NAVIGATION`, `CANCELED_BY_DOCUMENT_REPLACEMENT`, `CANCELED_BY_BROWSER`, `CANCELED_BY_POLICY`, and `UNRESOLVED`. | Cancellation is containment/lifecycle evidence; actual critical failure can be fatal; optional failure is nonfatal unless contract says otherwise. | Role, lifecycle, method, step, status class, completion state. Comparator compares meaningful failed-resource classes, not cancellation noise. | Late `ERR_ABORTED` after a response must not overwrite HTTP delivery; a misclassified optional resource could hide a defect. Covered by browser cancellation and resource matrix. | HEALTHY after regression fix. |
| JSON / NDJSON / empty / 204 / aborted | Parse only declared JSON responses; preserve valid NDJSON ownership; skip empty/204 and aborted/incomplete bodies. | Protocol anomaly for malformed declared JSON; no anomaly for valid stream, empty/204, or transport termination without a complete body. | Content-type/status class and parser category only; bodies are never persisted. | Prior declared-nonstream sniffing false positive is repaired. A missing declaration can still remain unresolved by policy. Covered by protocol matrix. | HEALTHY for in-scope semantics. |
| `pageerror` | Record uncaught page runtime exception. | Runtime/product anomaly; configured fail-on policy determines journey result, separate from safety. | Sanitized category/fingerprint only; no exception text. Fresh replay compares oracle ID/fingerprint. | A browser-generated diagnostic can be noisy; swallowing errors remains a documented false-negative risk. Covered by browser-backed fixture and monitor tests. | HEALTHY. |
| `unhandled-rejection` | Observe page-level unhandled rejection separately from pageerror. | Runtime/product anomaly; fatal when configured for the environment. | Oracle observation with category, severity, causality, and fingerprint. | Must not collapse into console error or warning. Covered by explicit rejection fixture. | HEALTHY after admission hardening. |
| `console-error` / `console-warning` | Classify application console errors; retain warnings as nonfatal observations unless an explicit policy says otherwise. | Error can be product/runtime anomaly; warning is informational, never fatal by default. Expected containment is recorded separately. | Sanitized category/location class and containment event; no arbitrary text in authenticated evidence. | Browser/background/support-widget messages can be false positives; a swallowed application error is a false-negative risk. Covered by warning and existing containment fixtures. | HEALTHY with expected-containment separation. |
| `csp-failure` | Observe security policy violations and required-script bootstrap blockage. | Bootstrap/security anomaly; not a production-attempt count. | Category, required-resource role, and sanitized fingerprint. | A noncritical CSP report must not be treated as required JS failure; covered by CSP fixture and runtime matrix. | HEALTHY after admission hardening. |
| Route / global structure / journey structure | Verify approved route class, QLayout/global shell, and the contract-specific marker/component after readiness. | Strict product/journey invariant. | Route class, global/journey marker booleans, step and failure attribution. | Pre-mount `#app` and optional components are not readiness; source-backed markers avoid customer text. Covered by route/structure fixtures. | HEALTHY. |
| Auth validity | Validate storage-state provenance/expiry/applicability and page-readable semantic auth before actions and before result admission. | `AUTH_STATE_INVALID`; not a product failure and not a safety success. | Boolean auth facts only, auth divergence category, no token/cookie values. | Context-only token and stale auth are known false-positive paths; page auth can expire after preflight, so post-run evidence remains required. Covered by auth fixtures and real runner gate. | HEALTHY. |
| Semantic request / safety | Require expected `KNOWN_READ` families after the action boundary; reject `KNOWN_MUTATION`, action-caused `UNKNOWN`, production/unknown destinations, proxy violations, and unknown approvals. | Safety/semantic stop for mutation, unsafe destination, or action-caused UNKNOWN; passive UNKNOWN is recorded but not mutation. | Method/disposition/family/step, safety vector, production/unknown/mutation/action-unknown counts. Exact semantic replay; passive/background classes are bounded. | Navigation-caused UNKNOWN needs explicit exemption; required-read step attribution is now scoped. Covered by semantic and safety fixtures. | HEALTHY; strict by design. |
| Fingerprint / admission | Produce stable sanitized anomaly identity and admit only exact same-fingerprint fresh-context evidence. | Classification layer, not a new failure severity. | Journey/step/oracle/role/path template/status/content/route/structure/runtime category plus stable hash. | Similar resources are not the same anomaly; no customer data or body may enter. Covered by deterministic/privacy/admission tests. | HEALTHY. |
| Replay comparator / attribution | Compare strict invariants, bounded dimensions, oracle sets, and safety/auth/privacy; separate primary failure, secondary oracles, containment, likely cause, and confidence. | Comparison classification; causality is `PROVEN`, `LIKELY`, `UNRESOLVED`, or `NOT_CAUSAL`. | Structured differential and last-success/first-failure fields. Timestamp order alone cannot prove cause. | Over-normalization or flattened secondary signals are risks; covered by strict/bounded/semantic/fingerprint/attribution tests. | HEALTHY after hardening. |

## Strict invariants and bounded variance

The strict set is frozen before real execution: contract version/digest;
page-visible auth; zero production attempts, proxy violations, unknown
destinations, unknown approvals, mutations, DB queries, and action-caused
UNKNOWN; approved route; global and journey structural readiness; expected
known-read families with no known mutation; fatal runtime/oracle status; and
privacy/evidence safety. A strict mismatch is never accepted as timing noise.

Only these dimensions may vary within their declared semantic class:

| Dimension | Comparison | Why it can vary | Suspicious condition |
|---|---|---|---|
| readiness and cleanup timing | contract readiness upper bound and ordered checkpoints, not exact equality | browser scheduling, network/cache, teardown | readiness contract violated or timing-only difference correlates with a strict failure |
| request ordering/concurrency | semantic family/disposition/step equality; passive initialization ordering is bounded | browser scheduling and parallel fetches | known-read/mutation/action-UNKNOWN order or step changes |
| request/resource counts | compare required semantic ledger exactly; optional/background/cleanup counts as bounded metadata | telemetry, browser background, optional assets | required family disappears, unexpected critical role appears, or unbounded growth |
| optional/noncritical assets | role and containment class | asset availability and cache state | resource is actually critical, produces bootstrap failure, or exact anomaly repeats |
| passive UNKNOWN/background hosts | approved containment category and bounded count | browser/background services | new destination, policy/proxy event, or action-caused UNKNOWN |
| network initialization/concurrency | category and safe count, never exact packet replay | browser/network startup scheduling | safety policy changes or semantic read diverges |

No arbitrary percentage tolerance is used. The existing readiness/cleanup
contract supplies the only timing bound, and semantic/category equality is
preferred for requests and resources.

## Journey-specific oracle audit

J1 requires the payer exchange-rate route, global shell, exchange-rate root and
data-table markers, and the `ripple.payer-exchange.read` known-read family.
J2 requires the common exchange-rate route, global shell, common data-table
marker, and `ripple.common-exchange.read`. J3 requires the accounts route,
global shell, custom data-table marker, and both billing-groups and account-
inventory known-read families. These are structural/source-backed contracts,
not customer-value or customer-text assertions. No journey-specific oracle
engine fork was added; all three use the same generic engine and evidence
schema. Their definitions, actions, selectors, timeouts, semantic policy, and
oracle policy are frozen for the matrix.

## Fingerprint and admission model

Fingerprints contain only journey ID, step ID, oracle ID, resource role,
sanitized host/path template, status class, content-type class, route class,
structural checkpoint, and runtime category. The stable representation is a
short SHA-256 digest prefixed `fp:sha256:`. Query strings, IDs, tokens,
customer names, costs, request/response bodies, and DOM are excluded by
construction. Exact equality gives the following bounded evidence ladder:

- `L0_OBSERVED`: one context and one exact fingerprint.
- `L1_REPRODUCED`: the exact fingerprint recurs in a fresh context under the
  same contract/oracle versions.
- `L2_REPEATED`: the exact fingerprint occurs in at least three independent
  contexts under the same frozen contract.
- `NOT_REPRODUCED`, `REFUTED`, and `SUPERSEDED_BY_NIGHTWATCH_DEFECT` preserve
  uncertainty and audit history; similar-looking anomalies do not promote a
  candidate.

The J2 font event is inherited as one L0 candidate. It is not expected
behavior and will not be promoted by frequency alone.

## Synthetic failure matrix and golden fixtures

The real observer, monitor, evidence builder, replay comparator, fingerprint,
and admission code are exercised by local browser fixtures and direct
classifier tests. The matrix covers: critical JS 500; font 502; optional image
failure; navigation cancellation; JS-as-HTML; malformed JSON; valid NDJSON;
empty/204; aborted JSON; pageerror; unhandled rejection; warning-only; CSP;
expired/page-unreadable auth; shell-versus-journey marker; route mismatch;
passive versus action-caused UNKNOWN; known mutation; bounded timing/request
variance; structural/semantic divergence; same/different fingerprints; and
fake secrets/body privacy exclusion. Full local browser and unit coverage is
green. These fixtures are durable regression anchors, not a claim of a full
future known-bug benchmark.

## Evidence compatibility

Phase 2A/2B evidence remains readable through the legacy projection. New
Phase 2C fields are explicit and versioned under `phase2c.v1`; unknown fields
are not admitted into the sanitized evidence projection. Old artifacts are
not rewritten. A legacy artifact without a contract digest is not treated as
identical to a Phase 2C frozen-contract observation unless its contract is
independently established.

## Pre-real adversarial review

PASS. The implementation does not weaken an oracle to accommodate Phase 2B
noise; the font 502 remains visible and nonfatal by resource role. Cancellation
is not failure, delivery is not execution, and the comparator does not use
arbitrary tolerances or erase semantic differences through normalization.
Fresh contexts have independent page/monitor/network state, page-visible auth
is required before actions, and the canonical safety kernel remains single and
fail-closed. No journey action or contract was altered, no customer/private
data enters fingerprints, historical false-positive fixtures are covered,
false-negative risks remain explicit, and no Phase 3, AI, fuzzing, or datastore
work was introduced.
