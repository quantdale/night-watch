# Nightwatch Phase 4 — Seeded / Model-Based Exploration

Status: `FROZEN_INTENT`

## Task purpose

Extend the trusted Phase 2A/2B/2C authenticated Ripple foundation from fixed
canary journeys to a bounded, source-proven, read-only state space. A
deterministic seed may choose only from a versioned catalog of independently
approved actions. Every planned and observed transition must be explainable,
privacy-safe, fail-closed, and replayable from durable metadata.

This task proves the explorer architecture with local synthetic graphs first,
then performs a small controlled DEV validation around the three trusted
anchors when source archaeology establishes a meaningful safe frontier. It is
not a crawler, fuzzer, AI planner, mutation runner, datastore verifier, or
Phase 5 implementation.

## Established starting state

- Task ID: `phase-4-seeded-model-based-exploration`.
- Starting Nightwatch SHA: `acdb4a27a953dbff2c3408815efe634468d4ad20`.
- Validated Phase 3 implementation: `8d72ec9159cba450e4e9d763d0f9e9d0ba7a493b`.
- Phase 3 checkpoint: `058a1ab4168324f346bd80f8fd3c2c3edec45c77`.
- Phase 3 terminal clean HEAD: `acdb4a27a953dbff2c3408815efe634468d4ad20`.
- Phase 3 closure is independently reconciled. Phase 2A, 2B, and 2C remain
  closed inputs; their shared safety, journey, oracle, replay, and evidence
  infrastructure must be reused.
- Trusted anchors are J1 payer exchange-rate read, J2 common exchange-rate
  read, and J3 account inventory. No new formal canary is required.
- Relevant Alphaus source freshness is `LOCAL_TRACKING_REF_ONLY`; deployment
  identity is unresolved. Source-derived action contracts must retain source
  SHA and cannot silently claim current deployment semantics.
- Nightwatch is the only repository that may be modified. Alphaus repositories
  are read-only and no datastore query or product mutation is permitted.

## Scope

1. Audit the current Ripple source narrowly around J1/J2/J3 and identify a
   modest candidate pool of adjacent tabs, local views, read-only filters,
   pagination, route returns, and passive detail/list transitions.
2. Record every candidate, including rejected candidates, with source symbol,
   source SHA, endpoint semantics, selector provenance, persistence/analytics
   effects, privacy risk, and explicit verdict.
3. Publish a versioned safe-action catalog,
   `nightwatch.safe-actions.phase4.v1`, containing only `KNOWN_READ` or
   source-proven local-only actions. No intentional `UNKNOWN` or mutation
   action may enter the catalog.
4. Implement versioned privacy-minimized state and transition models,
   bounded exploration envelopes for the selected anchor surfaces, a
   deterministic seeded planner, coverage/novelty accounting, exact sequence
   replay, and source/model staleness checks.
5. Reuse the existing safety kernel, endpoint semantic registry, journey
   engine, oracle engine, evidence writer, auth gate, and replay primitives;
   extend shared abstractions only where a concrete Phase 4 requirement needs
   them.
6. Validate the real explorer against a rich local fixture graph containing
   safe, mutation, unknown, unavailable, cycle, route, host, runtime, and
   oracle branches. Exercise the real engine, not a test-only imitation.
7. Run a predeclared bounded DEV matrix serially, using fresh contexts and
   the same valid external auth state. Preserve exact planner decisions and,
   for selected sequences, run strict exact-sequence reproduction.

## Non-goals

- Phase 5 Oops/API generation or expansion.
- AI/LLM/DeepSeek action selection, autonomous source/model edits, fuzzing,
  arbitrary form input, arbitrary DOM control discovery, or API corpus work.
- New journeys outside the three trusted anchors, production access, writes,
  mutations, database queries, datastore oracles, or Ouchan integration.
- Modifying, fetching, checking out, resetting, stashing, cleaning, installing
  into, or committing any Alphaus repository.
- Deliberate triggering of unknown endpoints, historical malformed JSON, the
  J2 font anomaly, or any mutation-like control.
- Persisting DOM/HTML/text dumps, screenshots, authenticated traces, bodies,
  headers, cookies, tokens, customer/account/resource identifiers, costs, or
  customer-derived selector values.

## Safety and semantic action admission

Safety policy outranks semantic contracts, which outrank models, which
outrank seeds. A seed can select only an already approved action that is
currently eligible. If safety or a precondition excludes it, the planner
records the deterministic exclusion and chooses from the remaining set. An
empty eligible set terminates as `SAFE_FRONTIER_EXHAUSTED`.

An action is admitted only when source evidence proves its complete effect:
control handler → client/store action → endpoint/client → backend operation
where required. HTTP method and labels are insufficient. Approved semantic
classes are `KNOWN_READ` and `LOCAL_ONLY`; `UNKNOWN`, `KNOWN_MUTATION`,
persisted server preference, customer-specific selection, unstable selector,
new host, and unresolved source freshness are rejected or review-required.

The catalog uses constrained declarative primitives only:
`NAVIGATE_APPROVED_ROUTE`, `CLICK_APPROVED_READ_CONTROL`,
`SELECT_APPROVED_READ_OPTION`, `TOGGLE_LOCAL_VIEW`,
`OPEN_READ_ONLY_DETAIL`, `CLOSE_READ_ONLY_DETAIL`,
`ADVANCE_READ_ONLY_PAGE`, `CHANGE_READ_QUERY_FILTER`, and
`RETURN_TO_ANCHOR`. It exposes no arbitrary selector click, script evaluation,
free-text input, form submission, or generic DOM crawler.

Every approved action records source provenance, preconditions, a stable
locator strategy, expected route/structural delta, expected read families,
forbidden request families, privacy policy, replay policy, and whether local
preferences/analytics are contained. Any action-caused `UNKNOWN` or
`KNOWN_MUTATION` is a hard stop and invalidates the action pending source
review. Passive initialization unknowns remain separate and are never
deliberately replayed.

## State and transition identity

The state schema is `nightwatch.exploration-state.phase4.v1`. A state contains
only canonical sanitized enums/booleans/count classes:

- `stateId`, `product`, `surface`, `routeClass`, global shell checkpoint;
- source-approved structural flags and safe view/modal/detail enums;
- bounded page ordinal where source-approved; never row text or identifiers;
- sorted available action IDs, semantic read-family classes, and terminal flags.

State IDs are a stable hash of the canonical representation. They exclude DOM,
timestamps, request IDs, timing, dynamic IDs, customer values, resource IDs,
costs, response bodies, and arbitrary visible text. Collision risk from
privacy minimization is documented and resolved only with another safe
structural/enum dimension.

The transition schema is `nightwatch.exploration-transition.phase4.v1` and
contains `fromStateId`, `actionId`, `seedDecisionIndex`, `toStateId`,
`actionOutcome`, route/structural/semantic deltas, oracle results, safety
result, and duration class. Logical transition identity is
`(fromStateId, actionId, toStateId, catalogVersion, modelVersion)` and never
contains a run ID.

Source-allowed edges and runtime-observed edges are separate. A source-allowed
action absent at runtime is recorded as `ACTION_NOT_AVAILABLE_AT_RUNTIME` and
deterministically excluded; it is not a product anomaly by itself.

## Exploration model and envelopes

The exploration model is `nightwatch.exploration-model.phase4.v1`. It is a
bounded state-aware seeded frontier walk. At each state it canonical-sorts
catalog actions, excludes unsafe/unavailable/precondition-false/exhausted
actions with explicit reasons, prefers actions leading to unseen logical
transitions, then uses the seeded PRNG to choose within the highest-priority
bucket. It tracks state/transition visits and terminates on budget, terminal
state, fatal oracle, safety stop, or safe frontier exhaustion. Immediate
backtracks and cycles are bounded but useful revisits remain possible.

Three envelopes are required and are anchored at the completed J1/J2/J3
start states. Each envelope declares approved route classes, surfaces, action
IDs, expected/passive network classes, forbidden mutations, maximum depth,
actions, states, transitions, route changes, duration, and stop conditions.
No action may silently leave its route or network envelope. An unexpected
route is `UNEXPECTED_ROUTE_ESCAPE` and stops the run.

The initial budget policy is
`nightwatch.exploration-budget.phase4.v1`: max 6 actions/depth per sequence,
12 unique states, 12 logical transitions, 2 visits per state, 2 visits per
transition, 2 immediate backtracks, 4 route changes, and 120 seconds per
real context. The synthetic fixture may use smaller budgets to prove each
stop branch. Browser contexts are fresh per seed; no context is resumed after
crash or interruption.

## Seed and deterministic planner semantics

Seeds are canonical lowercase 16-hex-digit uint64 strings prefixed by `0x`.
The planner uses `SplitMix64` algorithm version `splitmix64.v1`, with an
explicit draw counter and no wall-clock/global randomness. Derived envelope
seeds use a canonical hash of master seed, envelope ID, and run ordinal; they
never use timestamps. The planner records seed, derived seed, RNG/version,
catalog/model fingerprints, eligible actions, exclusion reasons, draw/index,
chosen action, and remaining budget at each decision.

The same seed, initial StateID, catalog/model/planner versions, and budget
must regenerate the same canonical decisions. Exact-sequence replay bypasses
planning and executes the recorded action IDs in order; a failed precondition
stops as `REPLAY_PRECONDITION_DIVERGENCE` and never substitutes another action.
Version-incompatible artifacts are not compared as equivalent.

## Coverage and novelty

Coverage is scoped to each envelope and records approved/encountered/executed/
unavailable/excluded actions, discovered/revisited states, attempted and
completed transitions, route classes, semantic read families, oracle classes,
new states, new transitions, and termination. Where a denominator exists,
reports use `ENVELOPE_ACTION_COVERAGE` and
`ENVELOPE_TRANSITION_COVERAGE`; no product-wide UI percentage is claimed.

Novelty is a deterministic signal only: new state, new transition, approved
route class, known-read family, or structural flag combination. Novelty is
never an anomaly, severity, or bug candidate. Oracle anomalies, safety events,
and coverage are separate ledgers.

## Evidence, attribution, replay, and anomaly admission

Run evidence is `nightwatch.exploration.phase4.v1`. It is metadata-first and
contains run/seed/version fingerprints, sanitized state/transition sequences,
planner decisions, coverage, novelty, oracle categories, safety/privacy
vectors, and termination. It does not contain DOM, HTML, text, screenshots,
authenticated traces, request/response bodies, headers, cookies, tokens,
customer/resource IDs, costs, or storage state.

Action/request attribution uses a bounded action window plus source-expected
semantic families, route/structural completion, request start/finish metadata,
and the existing semantic observer. Timestamp order alone is insufficient.
Natural passive UNKNOWN remains passive. A strongly action-attributed unknown
stops immediately; any new host is blocked and stops; production is fatal;
known mutation stops all real Phase 4 execution.

Phase 2C oracle severity is reused. A novel state is not an oracle anomaly.
Anomaly candidates retain seed, action sequence, state/transition IDs, last
success, first failing action, fingerprint, network class, route, and safety.
Admission remains L0 one observation, L1 exact fresh replay, L2 repeated exact
fingerprint under the same versions. Historical J2 font-502 remains
`L0_NOT_REPRODUCED`; malformed JSON remains a genuine unresolved historical
protocol anomaly and is not deliberately invoked.

## Real DEV budget and stop policy

Real seeds are selected before execution and recorded in the seed ledger. The
base budget is six fresh contexts: two seeds for each of E1/J1, E2/J2, and
E3/J3, serially. Up to one fresh exact-sequence reproduction per envelope is
allowed when that envelope produced a nontrivial sequence, for at most three
additional contexts. One narrowly justified diagnostic retry is allowed only
after checkpointing evidence, repairing a proven Nightwatch defect, adding a
regression, and rerunning full validation.

Before every context, the existing auth/readiness/safety gate plus current
catalog/model/fingerprint, envelope, seed, budget, semantic monitor, and
mutation tripwire must pass. Any production attempt, proxy violation, unknown
destination/approval, mutation, action-caused unknown, privacy leak, auth
failure, new host, route escape, or stale model stops the current and
remaining real execution. No retry may be used to hunt for an interesting
result.

## Completion criteria

Phase 4 is complete only when:

1. Phase 3 closure and freshness limitations remain reconciled.
2. Native Phase 4 task docs and frozen acceptance exist before implementation.
3. Source-proven candidate inventory and rejected-action ledger are complete.
4. Versioned catalog, state/transition/model/envelope schemas, fingerprints,
   budgets, coverage, novelty, replay, and evidence models exist.
5. Every approved intentional action is `KNOWN_READ` or proven local-only;
   unknown and mutation actions are never intentionally executed.
6. Deterministic RNG/planner/order/cycle/budget behavior and source staleness
   are tested, including Phase 3 impact links.
7. Synthetic exploration, same-seed planning, exact replay, mutation/unknown/
   new-host tripwires, privacy, crash/partial-run, and compatibility tests pass.
8. Pre-real adversarial review passes and the declared DEV budget is honored.
9. If a meaningful branching safe frontier exists, multiple fixed seeds run in
   each applicable envelope and exact-sequence reproduction is attempted as
   declared. If source proof cannot establish such a frontier, stop with the
   repository's safe-frontier blocker and do not admit unsafe actions.
10. Real safety counts remain zero for production, proxy, unknown destination,
    unknown approval, mutation, action-caused UNKNOWN, and DB queries; privacy
    passes; no authenticated trace or screenshot is enabled.
11. Cross-seed analysis, architecture review, full validation, Alphaus
    integrity comparison, clean Nightwatch handoff, and ACTIVE_TASK closure
    are complete. Phase 5 is only recommended, never started.
