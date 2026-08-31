## Context

Nightwatch's current replay and campaign stack is already bounded, sanitized,
and fail closed, but its recent DEV history exposed a distinction it does not
make strongly enough: a first strict replay divergence followed by a passing
retry is evidence about two observations, not a PASS verdict. The current
source census also correctly admits no new proof family, so additional yield
must come from choosing and composing existing mechanically justified work
better. Finally, project-state validation contains a narrow post-acceptance
exception keyed primarily by task-name shape, which is brittle authorization
semantics.

The change crosses pure replay/identity, campaign planning/triage, and the
continuity/project-state control plane. Real DEV remains an optional,
serial, owner-authenticated observation through existing launchers. No new
executor, source proof, data, infrastructure, publication, or credential
authority is introduced.

## Goals / Non-Goals

**Goals:**

- Make every replay comparison produce a stable categorical outcome and a
  bounded observation ledger that explains whether a difference is semantic,
  timing-only, environmental, authentication-related, telemetry-only,
  capture-related, or unknown.
- Define canonicalization by explicit field semantics, with metamorphic
  tests proving both permitted equivalence and meaningful difference.
- Schedule existing eligible surfaces with deterministic proof-aware scores,
  diversity constraints, and bounded yield attribution.
- Keep repeated product anomalies in stable clusters while preserving
  conservative false-positive behavior and sanitized evidence.
- Make project-verdict effects explicit task metadata, and make continuity
  and live-document checks consume structured fields rather than incidental
  prose or task-name prefixes.
- Strengthen persisted-state interruption, auth, cache, property, and
  observability coverage without weakening safety or strict replay.

**Non-Goals:**

- A new source proof family, semantic invariant vocabulary, product route,
  runtime adapter, or DEV execution authority.
- Automatic retries that turn an unexplained divergence into success.
- Raw response/DOM/customer values, credentials, cookies, traces, or private
  findings in source, artifacts committed to Git, or task records.
- Production, NEXT, mutation, datastore, cloud/infrastructure, sibling
  repository writes, publication, model authority, or canonical promotion.
- A repository-wide historical task-format rewrite.

## Decisions

### 1. Compare semantic identity separately from timing and environment

The replay comparator will operate on an explicit sanitized ledger. Stable
semantic records retain the rule/action/method/step/classification and other
meaningful categorical fields. Timing, ordering only where a contract proves
it irrelevant, request multiplicity, and reviewed telemetry are separate
variance channels. A difference is classified before any caller decides
whether the overall run is successful. An unexplained difference is
`UNKNOWN_DIVERGENCE` and remains non-success.

Alternative considered: retry until two runs agree. Rejected because it
conceals intermittent product or framework behavior and cannot explain the
first observation.

### 2. Use allowlisted canonicalization policies, not generic normalization

Canonical serialization will sort object keys and preserve array order by
default. Only fields with a declared semantic policy may be treated as an
unordered set or have volatile metadata removed. Header/query ordering and
telemetry fields receive explicit bounded policies. Meaningful method,
route, status, oracle, action, and semantic-contract changes remain identity
changes. Unsupported values, cycles, oversized input, and unknown field
policies fail closed.

Alternative considered: recursively sort/dedupe all collections. Rejected
because it can erase product behavior such as ordering, duplicates, and
pagination semantics.

### 3. Extend the existing planner with explainable deterministic selection

Selection uses a versioned integer score assembled from safe inputs already
available to Nightwatch: semantic-contract and relation density, source
change, proof/currentness confidence, age, anomaly history, replay
confidence, estimated cost, redundancy, and diversity. Hard eligibility and
owner gates run first. A deterministic greedy selector applies bounded
per-dimension quotas/penalties and stable tie-breakers, then emits reason
codes and a coverage report. No opaque or model-generated score controls
execution.

Alternative considered: add more candidates or use an LLM to rank them.
Rejected because the census has no safe new family and opaque ranking cannot
be audited as execution authority.

### 4. Preserve dual identities for protocol and semantic findings

Finding clusters continue to use stable sanitized bug identity, but the
cluster key includes the applicable oracle/semantic contract identity and
normalized divergence class. Context, campaign ID, timing, and occurrence
count remain occurrence metadata. Equivalent irrelevant payload/timing
variation must not create a new cluster; a changed contract or meaningful
behavior must not merge. Cluster updates are deterministic and idempotent.

### 5. Make verdict effect an explicit bounded task field

Continuity-v2 task metadata will carry a required, exact-key
`PROJECT_VERDICT_EFFECT` with a small vocabulary: `PRESERVE`, `REEVALUATE`,
or `SUPERSEDE`. `PRESERVE` is permitted for explicitly authorized
post-acceptance hardening while the project remains `OPERATIONALLY_ACCEPTED`.
`REEVALUATE` requires the operational verdict to remain pending/blocked until
the campaign earns it. `SUPERSEDE` requires explicit replacement evidence and
cannot silently preserve an old verdict. Missing, duplicate, malformed, or
incompatible effects fail closed. Existing completed historical records are
not bulk-migrated; relevant active/current records receive the field.

Alternative considered: infer semantics from `nightwatch-*` task names.
Rejected because names are labels, not authorization and cannot express
requalification or invalidation.

### 6. Parse live state only from canonical structured fields

The continuity checker will use exact field locations and field-specific
grammars for status, milestone status, WIP, next action, blockers, and
completion snapshots. Narrative prose remains informational unless it is in
an explicitly declared machine-owned block. Documentation truth checks use
bounded live sections and cross-file identity/effect/status relationships;
historical sections are not globally keyword-scanned.

Alternative considered: broaden regexes to catch more contradictions.
Rejected because free-text status words already caused false state changes.

### 7. Roll out behind fail-closed compatibility fixtures

New pure modules and validators are introduced with positive and negative
fixtures before current task metadata is switched. The old accepted verdict
remains intact through an explicit `PRESERVE` field. A validator failure
stops the campaign before executor construction. No migration rewrites
historical task directories.

## Risks / Trade-offs

- [Risk] A too-aggressive timing/telemetry normalization hides a real bug →
  default to strict identity, require an allowlisted field policy, and keep
  unknown differences non-success.
- [Risk] New scoring starves a valid surface or over-favors anomalies →
  cap each contribution, enforce age/diversity floors, emit explanations,
  and retain deterministic portfolio fallback coverage.
- [Risk] Explicit task metadata breaks current active-task validation →
  add the field to the current successor first and test malformed/missing/
  duplicate combinations before changing the project checker.
- [Risk] Product drift is mistaken for a Nightwatch defect →
  classify auth/environment/product-state drift separately and keep raw
  product data ephemeral.
- [Risk] Repeated DEV observations are unavailable or unsafe →
  record the exact guarded blocker and rely on local deterministic fixtures;
  never bypass a gate or claim reliability from a retry.
- [Risk] Full regression duration grows → measure before optimizing, use
  bounded caches only when identity inputs are complete, and preserve byte
  output parity.

## Migration Plan

1. Add the new pure replay, selection, clustering, and metadata contracts
   with synthetic fixtures and pre-fix regressions where a defect exists.
2. Wire validators and current task metadata to the explicit verdict effect;
   retain historical task records and preserve `OPERATIONALLY_ACCEPTED`.
3. Run focused, compatibility, quality-gate, clean-checkout, and isolated
   validation. Only then run bounded owner-approved DEV observations.
4. If a new implementation is unsafe, revert the source checkpoint and keep
   the prior task records untouched; if a state migration fails, the checker
   must reject the task rather than infer a default.

## Open Questions

- Which exact current real DEV divergence category will be observed after the
  local classifier is in place? The outcome remains an evidence result, not a
  design assumption.
- Whether the existing portfolio's current candidate count benefits from
  selection changes is measurable only after backtesting the new score against
  its frozen synthetic corpus; no yield claim is made before that comparison.
