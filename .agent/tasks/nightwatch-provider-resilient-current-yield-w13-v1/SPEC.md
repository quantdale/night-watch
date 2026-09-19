# W13 — Provider-resilient current-source unknown-defect yield

## Task purpose

Use the mature W7–W12 Nightwatch stack to answer the distinct successor
question:

> Can Nightwatch, under a provider-resilience policy fixed before probing,
> investigate the frozen owner-local current-source universe across all eight
> admitted repositories despite a single provider's availability failure,
> mechanically reproduce and admit a current-source defect when one exists,
> and report the resulting yield without seeded bug truth, fabricated
> evidence, unsafe execution, result-driven provider shopping, or post-result
> experiment tuning?

W13 is a new wave. W11 and W12 remain frozen predecessor evidence. W13 MUST
NOT rerun W11's historical EXACT arm, alter W12's measured figures, or treat
any provider-blocked predecessor run as zero yield.

Phase A closes every locally closable W12 residual (provider-failure budget
mismatch, `gate:local` synthetic-lane timeout classification, provider
failure taxonomy, census truncation, measurement completeness,
candidate/admission invariant, fake-progress guards, and Group 12/programme
reconciliation) before Phase B freezes and executes the provider-resilient
campaign. Phase B does not open while a register entry is `LOCAL_FIX_REQUIRED`
or otherwise blocks the wave by its own classification.

## Starting state

- Task ID: `nightwatch-provider-resilient-current-yield-w13-v1`
- Phase: `PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1`
- Wave: `W13`
- Starting Nightwatch SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Predecessor: `nightwatch-current-source-unknown-yield-w12-v1`, verdict
  `PARTIAL — BLOCKED`, preserved at the starting tree.
- OpenSpec: `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/`
- Owner authorization: the W13 provider-resilient master execution prompt and
  the owner instruction to apply this pending OpenSpec change.

## Scope

The W13 task directory, its OpenSpec change, W13 residual-register, policy,
freeze, evidence, and report artifacts, the minimum repository-local
measurement, classification, or correctness fixes proved necessary by the
residual register, the governed Group 12 successor ledger, parent
autonomous-programme state, Nightwatch docs and governed yield surfaces, and
validation/integration through one owned C-00 session.

The campaign may read the eight admitted Alphaus sibling repositories through
the existing read-only source/reproduction boundaries. It may use the existing
configured reasoner CLI and its provider network access for provider failover
between predeclared candidates. It may execute only already-admitted contained
local reproduction classes with disposable Nightwatch-owned state.

## Explicit non-goals

- DEV, NEXT, production, authenticated Alphaus runtime, browser product
  journeys, database, customer-data, cloud, infrastructure, or datastore
  access.
- Sibling checkout writes, checkout/fetch/install operations, dependency
  installation in siblings, external publication, Slack/Leslie/Pondr/Notion,
  issue/PR creation, credential acquisition, force-push, or history rewrite.
- Re-running W11's historical arm or W12's frozen runs; hidden historical
  ground-truth disclosure; a weaker admission class; general shell/tool
  authority; result-driven provider reselection; scope widening; or
  success-driven model/budget/stopping-rule tuning.
- Raising `gate:local`'s timeout bound; that remains an owner decision with
  its own authorization.

## Fixed claims vocabulary

W13 may emit only evidence-bounded classifications:

- `CURRENT_SOURCE_CANDIDATE`
- `CURRENT_SOURCE_MECHANICALLY_REPRODUCED`
- `CURRENT_SOURCE_MECHANICALLY_ADMITTED`
- `MATCHES_EXISTING_NIGHTWATCH_KNOWN_DEFECT`
- `NEW_TO_FROZEN_NIGHTWATCH_CORPUS`
- `NOVELTY_AMBIGUOUS`
- `ALPHAUS_CONFIRMED_PREVIOUSLY_UNKNOWN` only with independent evidence that
  actually supports organizational novelty.

An investigation hypothesis, suspicious source pattern, model assertion, or
candidate is not a finding. A Nightwatch admission is not an Alphaus-confirmed
bug. An unfound defect is not an absent defect. A provider failure is not
zero yield.

## Phase A — residual closure

The residual register is built and committed before any entry is fixed. Each
entry names source, exact evidence, why it matters, who can close it, and its
next action, and carries exactly one `residual-closure` taxonomy class and a
Phase B blocking flag. Every entry must resolve to `PROVEN`,
`BLOCKED_EXTERNAL`, or an explicit `OWNER_DECISION_REQUIRED` classification
before Phase B opens.

The named inherited gaps are:

1. Provider-failure budget mismatch: frozen supplemental `providerFailures: 3`
   versus `HOUR_1` runtime ceiling `8` (`docs/DECISIONS.md` D-138). Locate
   both origins, decide single authority versus two distinctly named
   concepts, implement the decision, add a regression, add a negative probe
   that fails closed on divergence, and record a new decision succeeding
   D-138 without rewriting it.
2. `gate:local` `SYNTHETIC_CAMPAIGN` timeout (receipt
   `sha256:c5107a12b6bd0a89263c5c2`): re-measure directly and gate-dispatched
   on an idle host with load/process snapshots, diff the synthetic manifest
   file count against the base SHA, and classify as exactly one of
   `REAL_GATE_TIMEOUT_DEFECT`, `STALE_BOUND`, `HOST_CONTENTION`,
   `EXPECTED_ENVIRONMENT_VARIANCE`, `DUPLICATE_WORK`, `OTHER_MEASURED_CAUSE`
   with a lane receipt. Never raise the timeout bound.
3. Provider failure taxonomy: extend classification to `PROVIDER_ABSENT`,
   `PROVIDER_PROBE_TIMEOUT`, `PROVIDER_RUNTIME_TIMEOUT`,
   `PROVIDER_NONZERO_EXIT`, `PROVIDER_INVALID_STRUCTURED_RESPONSE`,
   `PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE`, `PROVIDER_AUTH_FAILURE`,
   `LOCAL_CLI_FAILURE`, `VALID_PROVIDER_RESPONSE`, and
   `UNKNOWN_EXTERNAL_PROVIDER_FAILURE`; sanitize retained provider text;
   cover each transition with a regression.
4. Census truncation: determine whether the Ouchan enumeration bound can be
   safely raised or paginated within the existing resource contract; if yes,
   implement the exhaustive bounded/paginated census and re-run it; if no,
   add a mechanical check that every yield-metric denominator consuming the
   source inventory treats `sourceInventory.completeness` `TRUNCATED` as a
   floor, reusing `truncation-truth-discovery-paging` vocabulary; prove the
   chosen closure with a regression.
5. Measurement completeness: cross-check the required global-metric list
   against `global-yield-aggregation.json`'s schema and W12 evidence; capture
   real machine metrics or add explicit `NOT_CAPTURED` schema fields with
   reasons; regress that no required metric is silently absent.
6. Candidate/admission invariant and fake-progress guards: a fixture record
   with `admitted: true` and no reproduction receipt, evidence reference, or
   dossier identity must be rejected by aggregation; a failed provider call
   must never mint a source action, inspected target, hypothesis, candidate,
   admission, or dossier, and repeated provider failure must produce a
   provider-blocked result, never a valid zero-yield result.
7. Group 12 and continuity reconciliation: re-annotate Group 12 items 12.7,
   12.8, 12.11, and 12.12 as Phase A evidence truthfully supports, preserving
   predecessor text; reconcile `PROGRAMME.json` to W12's actual COMPLETE
   state and route to W13; update governed current-state and README yield
   figures.

## Provider-resilience policy

Before any Phase B probe, `provider-resilience-policy.json` (or equivalent
machine-readable document) MUST bind: the ordered candidate list; allowed
CLI(s) and required structured-response schema; probe and runtime timeouts;
per-provider retry count; maximum consecutive failures; failover-eligible
failure classes; maximum transitions; recovery permission; and exhaustion
behavior. Its canonical fingerprint covers every bound field. Failover
triggers only on a frozen failover-eligible class at its frozen threshold,
moves exactly one step down the frozen order, and is deterministic on replay.
A mutated policy fails a resume closed before any provider call. Recovery to a
degraded provider is forbidden unless the policy explicitly permits it.

## Phase B fixed campaign shape

Before the first W13 investigative call, the machine-readable evaluation
freeze MUST bind the provider/toolchain identity and policy fingerprint, all
eight approved repository IDs and exact current SHAs, source census digest,
the broad-plus-eight-scoped run matrix and order, budgets, target-selection
policy, source/reproduction classes, admission and refusal rules, novelty
timing, metric denominators, stopping rules, leakage rules, sibling-write
rules, zero-yield acceptability, and provider-exhaustion behavior.

The fixed matrix is:

1. `w13-broad-all-repositories-1`: all eight repositories, 60-minute maximum.
2. `w13-repository-01` through `w13-repository-08`: one per repository in
   stable admitted-registry order, 30 minutes each except
   `mobingilabs/ouchan`, which receives 60 minutes only if the pre-experiment
   census still proves it the sole current deterministic-reproduction
   repository.

The Ouchan exception is fixed by execution coverage, not suspected defect
likelihood. No run may be added or extended after results appear.

## Current-source and contamination rules

The eight-repository census MUST prove exact membership, expected/live SHA
equality, non-vacuous eligible source, language/surface counts, executable
files/targets, reproduction classes, refusal reasons, and its completeness
state. Before and after identity snapshots MUST prove no sibling mutation.

W13 investigative requests MUST NOT contain W11 or W12 hidden known-failing
values, hidden benchmark truth, historical fix/PR/issue material, known
reproducer source, post-fix diffs, credentials, cookies, customer values, or
raw authenticated evidence. Bug Atlas/known-defect data is post-admission
novelty input only unless an existing rigorously leak-isolated product path
proves otherwise.

## Mechanical reproduction and admission

The existing Nightwatch mechanical path remains authoritative. The reasoner
may request only already-admitted contained reproduction. Every attempt is
bounded by the existing toolchain, process/output/time controls, sibling
identity checks, and deterministic repeated-failure requirements. Candidates
without a qualifying reproduction remain refused, including
`MISSING_REPRODUCTION`. No dossier, evidence reference, or reproduction count
may be synthesized from model text. Novelty adjudication occurs only after a
mechanical admission.

## Metrics and safety

Metrics MUST be derived from raw machine receipts, not prose. Per run, per
repository, and global reports MUST distinguish planned/attempted/valid/
provider-blocked runs, investigations, calls, failures by taxonomy class,
retries, provider transitions, tool actions, repositories/paths/targets,
hypotheses, reproduction outcomes, candidates, refusals, admissions, novelty
classes, bytes, wall time, and termination. Every denominator is named. A
`TRUNCATED` population count is a floor, never a total. Missing fields are
`NOT_CAPTURED` with a reason, never silently zero. Provider failure is never a
zero-yield denominator.

The final safety proof MUST report zero DEV/NEXT/production contacts,
authenticated browser runs, database/data-plane operations, sibling writes,
sibling dependency installs, issue/PR creations, external publications,
credentials committed, hidden-ground-truth leaks, force pushes, and history
rewrites. Provider CLI egress is reported separately from Alphaus product
traffic.

## Declared Deletions

The OpenSpec lifecycle archive of the completed W12 change relocates the
following tracked files under `openspec/changes/archive/`; this declaration
names only the deleted original paths.

- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/.openspec.yaml`
- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/audit.md`
- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/design.md`
- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/proposal.md`
- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/specs/current-source-yield-measurement/spec.md`
- `openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/tasks.md`

## Acceptance criteria

- W11 and W12 remain frozen; W13 has a fresh owned C-00 session and governed
  task.
- The residual register is committed before any fix; every entry resolves to
  `PROVEN`, `BLOCKED_EXTERNAL`, or `OWNER_DECISION_REQUIRED` before Phase B.
- The provider-resilience policy and fingerprint are committed before any
  Phase B probe; mutation and resume guards are live.
- The machine-readable evaluation freeze is committed before the first
  investigative call.
- Broad and all eight scoped runs execute validly or are categorically
  provider-blocked under the frozen policy; successful failover does not by
  itself block the wave; no post-result tuning occurs.
- Every candidate passes through existing mechanical reproduction/admission;
  candidate/admission/refusal counts are independent and correct; a failed
  provider call mints nothing.
- Novelty is performed only after admission and remains evidence-bounded.
- Metrics, non-vacuity, leakage, sibling-write, safety, and anti-gaming proofs
  are mechanically preserved.
- Group 12 and the parent programme are reconciled from actual W13 evidence;
  predecessor blocked records are not rewritten.
- Required focused/full validation, `gate:local`, `gate:clean` at the
  lifecycle-approved point, fast-forward integration, `HEAD == origin/main`,
  session release/removal, and exactly one final W13 verdict are complete.
