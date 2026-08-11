# Nightwatch Phase 2B — Three Deterministic Read-Only Ripple Journeys

## Task purpose

Establish Nightwatch's first reusable authenticated behavioral-journey system
and prove it against exactly three meaningful, source-backed, semantically
read-only Ripple customer journeys. A successful task produces three durable
journey contracts, a declarative reusable execution engine, meaningful local
fixture coverage, and one controlled DEV observation plus one fresh-context
replay for each selected journey. The task ends at Phase 2B closure; it does
not begin Phase 2C or any later phase.

## Established starting state

- Task ID: `phase-2b-three-readonly-ripple-journeys`
- Starting Nightwatch HEAD: `ec4c14376923ffbe12356dd180218eb09cf4f75f`
- Validated Phase 2A implementation baseline: `a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c`
- Phase 2A completion checkpoint: `9bf2c4593c9eb46db8bb8a5975bfa336461641cd`
- Phase 2A final clean terminal HEAD: `ec4c14376923ffbe12356dd180218eb09cf4f75f`
- The Phase 2A SHA meaning is preserved: `a6d7c8b` is implementation,
  `9bf2c45` is the validated closure checkpoint, and later descendants through
  `ec4c143` are approved documentation/continuity advances.
- Phase 2A proved page-readable DEV authentication, the canonical
  `https://appdev.alphaus.cloud/ripple/` entry, the authenticated
  `/ripple/dashboard` route, the rendered `DIV.q-layout-container.layout`
  shell, 750 ms structural stability, mandatory proxy/browser containment,
  metadata-first evidence, and one successful fresh-context landing replay.
- The historical expired-auth and refuted root-routing conclusions remain
  preserved. The fresh external state is outside the repository and must be
  validated by boolean semantics before every real context; its contents are
  never printed or inspected as evidence.
- Ripple and every other Alphaus repository are read-only inputs. Only this
  Nightwatch repository may be modified.

## Required deliverables

- A completed candidate inventory created before final selection, including
  safe, constrained, and rejected candidates with source and freshness facts.
- Exactly three selected journeys, each represented in a durable
  `JOURNEYS.md` contract with source-backed route, selector, action, endpoint,
  privacy, replay, determinism, and stop-condition evidence.
- A semantic endpoint/action registry that distinguishes `KNOWN_READ`,
  `KNOWN_MUTATION`, and `UNKNOWN`, with source provenance for every intentional
  journey action.
- A generic declarative journey engine and sanitized evidence/comparison model
  reusable by a fourth journey without another bespoke runner.
- A journey-level mutation tripwire and a distinct passive-unknown versus
  action-caused-unknown accounting path.
- Local synthetic/fixture tests exercising the real policy, semantic
  classifier, executor, evidence writer, and replay comparator across normal,
  unsafe, privacy, lifecycle, containment, and divergence cases.
- Six controlled real DEV contexts in strict order: first observation then one
  fresh-context replay for Journey 1, then the same pair for Journey 2, then
  the same pair for Journey 3. A narrow Nightwatch repair may use at most one
  diagnostic retry per journey only after evidence, focused tests, full local
  validation, and self-review.
- Final task `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`, a clean Nightwatch
  handoff commit, and `ACTIVE_TASK.md` marked complete. No Phase 2C task is
  created.

## Explicit non-goals

- Any Phase 2C, Phase 3, change-intelligence, data-oracle, API replay, fuzzing,
  generative exploration, AI planning, datastore investigation, or model-based
  functionality.
- Production browsing, production requests, database queries, scans, writes,
  mutations, or any Alphaus repository modification.
- Login/MFA automation or receiving credentials. Human auth capture may use
  the existing guarded workflow only when the external state is expired or
  unusable.
- Deliberate execution of an endpoint or action classified `UNKNOWN`.
- Export/download/report-job journeys unless source proves the entire backend
  behavior is a pure read without job, audit, persistence, or billing effects.
- Customer-specific assertions, exact costs, exact account names/IDs, raw
  payloads, DOM/text/HTML dumps, screenshots, or authenticated traces.
- Random navigation, fuzzing, AI-generated control selection, or a universal
  planner. The engine is declarative and constrained, not exploratory.

## Journey selection requirements

The final set contains exactly three journeys, selected only after a broader
candidate pool is inventoried. The set must:

1. represent three materially different customer-facing purposes and behavior
   classes, not three dashboard tabs or near-identical URLs;
2. be meaningful beyond Phase 2A shell readiness;
3. use an approved DEV entry/route and source-defined structural markers;
4. prove every intentional action as local-only or `KNOWN_READ` from the
   frontend callsite through the API handler/backend operation where locally
   available; and
5. be deterministic enough for strict invariants plus explicitly bounded
   timing/background variance.

If fewer than three defensible journeys remain after source proof, the task
must stop with the repository's `JOURNEY SELECTION BLOCKED` result. The bar
must not be lowered to force three.

## Semantic read-only proof model

HTTP method, labels, route names, and runtime success are not semantic proof.
For every intentional action, Nightwatch records:

`frontend callsite → API client method → route/handler where locally available → semantic backend operation`

Each action and endpoint is classified exactly as:

- `KNOWN_READ`: source proves no mutation, persistence, job creation, billing,
  audit write, or other state-changing behavior;
- `KNOWN_MUTATION`: source proves a write or mutation; prohibited; or
- `UNKNOWN`: evidence is incomplete; never intentionally triggered.

Passive application initialization may naturally emit an unclassified request.
It is recorded as `PASSIVE_UNKNOWN_OBSERVED` and does not become an approved
action. If a journey step causally produces an unknown request, execution
stops as `ACTION_CAUSED_UNKNOWN` and no replay is allowed. HTTP POST is not
automatically mutation or read; a POST read requires source proof.

## Endpoint and action safety model

Only constrained action types may be used:

- `NAVIGATE_APPROVED_ROUTE`
- `CLICK_READ_ONLY_CONTROL`
- `SELECT_LOCAL_VIEW`
- `SELECT_READ_QUERY_FILTER`
- `OPEN_READ_ONLY_DETAIL`
- `WAIT_STRUCTURAL_CHECKPOINT`

The engine must not expose a generic `CLICK_ANYTHING`, arbitrary script
execution, arbitrary route selection, form submission, or dynamically blessed
host/endpoint action. Intentional steps must carry their purpose, source proof,
semantic class, approved route, expected structural result, expected network
result, timeout, privacy constraint, and failure classification.

The following are prohibited even when a UI label sounds harmless:

save, submit, create, edit, update, delete, archive, invite,
activate/deactivate, role/RBAC change, token generation/revocation,
billing-group change, exchange-rate change, invoice generation/finalization,
commitment purchase/update, account mapping, tag write, bulk action, uncertain
form submission, and uncertain export/download behavior.

## Global and journey-specific readiness

Every journey must begin with the established Phase 2A authenticated baseline:

- exact approved DEV target and environment agreement;
- fresh page-readable external auth state and 13/13 pre-real-run gate;
- mandatory healthy L5 proxy and browser containment;
- complete document;
- source-backed `DIV.q-layout-container.layout` authenticated shell;
- unchanged approved route for at least 750 ms;
- no fatal lifecycle, containment, runtime, or page condition.

The global shell is necessary but insufficient. Each journey also requires a
source-backed page/view checkpoint: a stable data-testid, semantic selector,
source-defined component root, stable role/name independent of customer data,
or route/view-state predicate. Arbitrary body text and customer values are
not readiness markers.

## Replay and determinism contract

A replay is one newly created browser context after the first context closes.
It uses the same external auth path, journey definition, action list,
selectors, target, semantic policy, and evidence/privacy policy. No third
replay, random exploration, or journey modification is permitted.

Strict invariants include, as applicable:

- same journey ID and contract/source version;
- same approved route class and final view class;
- same authenticated shell and journey-specific structural checkpoint;
- same intentional step sequence and semantic endpoint classes;
- zero known mutations, action-caused unknowns, production attempts, proxy
  violations, unknown destinations/approvals, DB queries, and privacy failures;
- same successful readiness and fatal-oracle status;
- valid page-readable auth in both contexts.

Bounded variance may include elapsed milliseconds, concurrent request order,
optional/background request counts, non-critical asset counts, and safe
asynchronous cleanup timing. Byte-for-byte evidence identity is not required.
Every difference is classified as `MATCH`, `EXPECTED_TIMING_VARIANCE`,
`EXPECTED_REQUEST_COUNT_VARIANCE`, `EXPECTED_BACKGROUND_VARIANCE`,
`STRUCTURAL_DIVERGENCE`, `ROUTE_DIVERGENCE`, `SEMANTIC_REQUEST_DIVERGENCE`,
`ORACLE_DIVERGENCE`, `SAFETY_DIVERGENCE`, or `AUTH_DIVERGENCE`.

## Privacy contract

Persist metadata, booleans, enums, bounded counts, sanitized route classes,
safe endpoint paths, and structural predicates only. Never persist passwords,
credentials, authorization/cookie/token values, storage-state contents,
customer names/emails/IDs, account/resource IDs where prohibited, raw costs,
request/response bodies, DOM/HTML/text, screenshots, authenticated traces, or
query-bearing secret URLs. The external state remains outside Git and the
Nightwatch workspace. Evidence scans are category/count based and must not
print the sensitive value being scanned.

## Real-run budget and stop conditions

- One fresh external auth validity check before each first-run/replay context.
- Exactly one first observation and one replay per selected journey in the
  order Journey 1 pair, Journey 2 pair, Journey 3 pair.
- At most one real diagnostic retry per journey, only for a narrowly proven
  Nightwatch defect, and never as a loop to make a result green.
- If a first run fails due to auth expiry, stop without blaming Ripple and use
  the guarded human capture workflow. If it fails due to a semantic safety
  event, close the context, checkpoint evidence, and do not replay.
- Any production attempt, unknown destination, dynamic host approval, known
  mutation, action-caused unknown, proxy violation, DB query, trace/privacy
  leak, or containment/readiness regression stops the current and remaining
  real execution until reviewed.
- A new hostname is blocked and fails closed; it is never auto-approved.
- A product anomaly may be recorded at L0–L2 and independent safe journeys may
  continue only when shared infrastructure and safety invariants remain valid.

## Completion criteria

Phase 2B may be marked complete only when:

1. Phase 2A closure and SHA semantics are independently reconciled.
2. The native Phase 2B task and frozen SPEC are checkpointed before code.
3. Candidate inventory and source-freshness record are complete.
4. Exactly three distinct journeys are selected and contracted.
5. Every intentional action is local-only or source-proven `KNOWN_READ`.
6. No selected journey intentionally triggers `UNKNOWN` or mutation behavior.
7. A reusable declarative engine, semantic registry, mutation tripwire, and
   sanitized evidence/replay comparator exist.
8. Synthetic tests exercise real engine code and all required safe/unsafe,
   privacy, lifecycle, destination, auth, and replay branches.
9. Full local TypeScript, Playwright, agent continuity, and whitespace checks
   pass before and after real execution.
10. Each of the three first observations and its fresh-context replay passes;
    strict invariants match and all variance is explicitly classified.
11. Across all six contexts: production attempts, proxy violations, unknown
    destinations, unknown approvals, known mutations, and DB queries are zero.
12. Auth validity, safety, privacy, global readiness, journey readiness, and
    final adversarial self-review pass.
13. Alphaus repositories are byte/state unchanged, external auth remains
    outside Git, Nightwatch is clean, and closure docs are committed.

## Safety authority

Existing `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, the shared
`OutboundPolicy`, `createNightwatchContext`, 13/13 gate, trace-off behavior,
and Phase 2A shell/readiness primitives remain authoritative. Phase 2B may
add journey semantics and evidence fields, but may not weaken containment,
unknown-host fail-closed behavior, production deny, auth proof, privacy, or
the Phase 2A global shell contract.
