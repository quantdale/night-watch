# Nightwatch Phase 7 — Private Autonomous Nightly Campaigns

Status: `FROZEN INTENT`
Frozen: 2026-08-13

## Objective

Coordinate the existing source selector, trusted journeys, safe exploration,
read-only API corpus, replay/oracle admission, private clustering, bounded
minimization, source correlation, fault-boundary triage, and private dossier
writers into one deterministic, bounded, recoverable local campaign. A fresh
session must be able to resume from the manifest and checkpoint ledger without
conversation history, infrastructure access, a coworker, publication, or AI.

The campaign is an orchestrator, not a replacement browser runner, API runner,
explorer, oracle, minimizer, or dossier engine.

## Permanent scope

Nightwatch remains private, local, DEV-only, read-only at product level,
fail-closed, and evidence-driven. Only this repository may be modified.
Alphaus repositories are read-only source inputs. GCP/GKE/Kubernetes, kubectl,
AWS infrastructure/IAM/STS/runtime identity, DynamoDB, BigQuery, Spanner,
production SQL, deployment archaeology, external-team requests, Slack, email,
GitHub/Jira/Linear issues or PRs, shared documents, uploads, and customer
publication are permanently blocked by owner policy. Phase 6 remains
`FROZEN_BY_OWNER` with a maximum real datastore budget of 6 and 0 used.

The campaign runtime cannot modify Nightwatch code, widen the safe-action or
API catalog, select UNKNOWN or mutation semantics, invoke infrastructure/data
connectors, or call an AI model. AI-ready output is deterministic data only.

## Versioned contracts

- Campaign schema: `nightwatch.campaign.private.v1`.
- Orchestrator: `nightwatch.orchestrator.private.v1`.
- Budget: `nightwatch.campaign-budget.private.v1`.
- Manifest: `nightwatch.campaign-manifest.private.v1`.
- Checkpoint: `nightwatch.campaign-checkpoint.private.v1`.
- Morning brief: `nightwatch.campaign-morning-brief.private.v1`.
- Existing owner policy: `nightwatch.owner-scope-policy.v1`.
- Existing journeys, exploration, API, oracle, cluster, minimizer, dossier,
  and private-artifact versions are inputs and are recorded in the manifest.

## Explicit campaign modes

Only these modes are valid:

- `CHANGE_DIRECTED` — use the Phase 3 committed source-range selector. Dirty
  worktree changes are recorded but never treated as deployed changes.
- `BASELINE_HEALTH` — run the explicit owner-approved trusted J1/J2/J3
  baseline when the committed source window is empty. It does not alter Phase
  3 baselines or claim deployment.
- `COVERAGE_EXPANSION` — use only the existing Phase 4 safe envelopes and
  deterministic seeds, preferring under-exercised actions/states/transitions
  and linked Phase 5 operation families.
- `REPRODUCTION_ONLY` — execute only a supplied admitted anomaly's exact
  reproduction and bounded minimization workflow; no new journey, API, or
  exploration work is selected.
- `LOCAL_SYNTHETIC` — run the repository-owned campaign fixture matrix through
  the same orchestrator and ledgers; no external target is permitted.

No free-form mode or arbitrary work-item injection is supported.

## Campaign identity and source semantics

The identity is a canonical SHA-256 digest of mode, sanitized source
baselines, selector/map/contract/catalog/model versions, seed corpus version,
budget-policy version, privacy/owner-scope policy versions, and orchestrator
version. Timestamp is metadata only and never identity input. The manifest
schema is `nightwatch.campaign.private.v1`; every work item has a stable ID.

Source snapshots capture, for relevant repositories only: repository ID,
branch, HEAD, tracking ref/SHA when locally available, ahead/behind, dirty
state/count, source-map SHA, freshness, and `readOnly=true`. The committed
window is an explicit baseline-to-HEAD range. Empty ranges are represented as
empty. Dirty files remain separately labeled `DIRTY_WORKTREE_CHANGE` and are
excluded from deployment or committed-change inference. Source correlation
uses `SOURCE_CHANGE_CANDIDATE` and `DEPLOYMENT_STATUS_UNRESOLVED`; it never
claims causality or deployment.

## Selection and lineage

`CHANGE_DIRECTED` calls Phase 3 `selectJourneys` and preserves selected and
non-selected explanations, confidence, risk, fallback, unresolved impact, and
negative-selection reasons. An unknown runtime-relevant impact uses the Phase
3 conservative fallback; proven documentation/test-only changes may select
zero. `BASELINE_HEALTH` selects only the three trusted canaries with an
explicit baseline-health reason. `COVERAGE_EXPANSION` selects existing Phase
4 envelopes and seeds through deterministic coverage scoring. `REPRODUCTION_ONLY`
selects no new work. `LOCAL_SYNTHETIC` uses the fixed fixture corpus.

Journey → exploration envelope → API operation linkage is explicit and
catalog-backed. API-only Phase 5 expansions are not selected by default from
an unrelated journey. Every selected item records why selected, source
impact, confidence, risk, and linked journey/API/envelope. Every trusted
surface not selected records why not selected.

## Frozen execution ordering

Within the frozen manifest, sort by: safety-critical/shared prerequisites,
highest Phase 3 priority, direct journey canaries, linked API operations,
safe exploration envelopes/seeds, anomaly reproductions, then minimization
and dossier finalization. Ties use stable work-item IDs. No filesystem order,
insertion order, timestamp, or random choice affects ordering.

## Initial real DEV campaign profile

The first bounded real campaign is deliberately small:

- mode is `CHANGE_DIRECTED` when the committed Phase 3 window is non-empty;
  otherwise explicit `BASELINE_HEALTH` (the current window is expected to be
  empty and must not be fabricated);
- J1, J2, and J3: one fresh first context each;
- one Phase 4 envelope/seed for each linked J1/J2/J3 surface;
- one Phase 5 linked `KNOWN_READ` operation per J1/J2/J3 family, with one
  fresh replay per operation because the existing Phase 5 contract requires
  `FIRST_PLUS_FRESH_REPLAY`;
- no API-only expansion by default;
- anomaly reproduction only after admission and only for the deterministic
  representative clusters, maximum 3;
- minimization only after the required fresh exact replay and only with the
  existing real policy: one exact replay plus at most four reduced candidate
  evaluations / five total replay calls;
- serial execution and no load generation.

The initial profile maximums are: 6 browser contexts, 3 journey contexts, 3
exploration contexts, 6 API executions, 8 replays, 4 minimization candidates,
24 total actions, 15 minutes, 120 seconds per test, 3 promoted clusters, and
10 MiB private evidence. The eight-replay ceiling is the sum of three required
Phase 5 fresh replays, one representative reproduction allowance, and the
existing private-triage allowance of one exact replay plus up to four reduced
candidate evaluations. The minimizer still cannot exceed its own five-call
policy. These are maximums, not quotas. The general policy supports multi-hour
campaigns up to the explicitly supplied runtime ceiling; short synthetic
clocks and local fixtures prove time control without waiting.

## Budget policy

The manifest freezes maximums for total browser contexts, journey contexts,
exploration contexts, API executions, replays, minimization candidates, total
actions, total campaign runtime, per-test timeout, promoted clusters, and
private evidence bytes. A budget manager reports used/remaining values and
rejects rather than silently extending work. Unused budget is successful
conservatism. A minimizer may not use spare campaign budget to exceed its own
private policy.

## Pre-flight and authentication

No browser/API context is created until owner policy, `DEV`/local synthetic
target, production deny, mandatory loopback proxy, outbound policy, safe-action
catalog, API catalog/lineage, auth applicability, source snapshots, budget,
manifest immutability, and private destination are valid. The existing secure
DEV auth provider is reused. Valid state is reused first; an expired state may
perform one bounded guarded refresh. Raw credentials, cookies, tokens, or
storage state never enter campaign state, logs, dossiers, MCP, or argv.
Auth failure is `PARTIAL_AUTH_BLOCKED`, never a product anomaly. Chrome
DevTools MCP remains optional and subordinate to Playwright; it is not required
for campaign completion and may not receive credentials, DOM, bodies, cookies,
screenshots, or Authorization.

## Health gates and failure handling

Shared safety, auth, proxy, router, or runtime prerequisites have explicit
stop/partial-stop semantics. A production attempt, proxy violation, unknown
destination/approval, mutation, action-caused UNKNOWN, privacy failure, or
owner-policy violation stops the applicable scope immediately. A shared
fingerprint/root prerequisite observed across multiple work items is recorded
as `FAILURE_STORM / SHARED_ROOT_SYMPTOM`; duplicate work is stopped before
replay/minimization budget is consumed. The morning brief says
`SHARED DEV FAILURE / CAMPAIGN DEGRADED` for this result.

Campaign result classes are:
`COMPLETE_CLEAN`, `COMPLETE_WITH_FINDINGS`, `PARTIAL_BUDGET_EXHAUSTED`,
`PARTIAL_AUTH_BLOCKED`, `PARTIAL_SAFETY_BLOCKED`,
`PARTIAL_RUNTIME_INFRA_FAILURE`, `ABORTED_OWNER_POLICY`, and
`INCOMPLETE_PROCESS_INTERRUPTION`.

Existing journey/API/test result classes remain authoritative. The campaign
only aggregates them and labels Nightwatch defects separately.

## Anomaly, replay, clustering, and minimization

Every candidate enters the existing exact sanitized fingerprint/cluster model.
Clusters are formed before costly reproduction. Equivalent observations share
one representative and bounded occurrence count; materially different stable
features remain separate. Reproduction priority is deterministic from
existing confidence, technical severity, breadth, source relevance,
browser/API differential, novelty, and owner-facing priority. At most 3
clusters are promoted in the initial policy.

Admission is the active owner-scope ladder:

- `L0` — first exact sanitized anomaly observation;
- `L1` — fresh deterministic reproduction;
- `L2` — repeated deterministic reproduction;
- `L3` — independent browser/API/state contradiction;
- `L4` — `OUT_OF_SCOPE_BY_OWNER` (datastore evidence is never attempted);
- `L5` — source/change relevance/correlation, which never proves causality.

Transient one-offs remain L0/non-admitted for costly work. Historical J2 font
502 remains `L0_NOT_REPRODUCED`; historical malformed JSON remains
`UNKNOWN/HISTORICAL_ANOMALY_PRESENT` and is never deliberately triggered.
Minimization uses only original source-approved safe action occurrences and
the existing `1-MINIMAL`/`BOUNDED_MINIMAL` implementation. It may not add an
action, selector, route, request, value, UNKNOWN, or mutation.

## Dossier, privacy, retention, and brief

Only admitted/reproduced clusters receive full private dossiers. A dossier is
written `INCOMPLETE` first and atomically finalized `READY` only after all
sections validate. It contains the sanitized candidate/cluster identity,
occurrences, lineage, minimal safe sequence, fingerprint, admission level,
browser/API differential, source relevance, application fault boundary,
categorical confidence/priority, alternatives, uncertainty, concise human
recipe, safety, and privacy. It never contains customer data, identifiers,
costs, credentials, cookies, tokens, bodies, DOM, screenshots, or traces.

Real storage is owner-only outside the repository, defaulting to
`$HOME/.nightwatch/findings/`; Nightwatch has `NO_REMOTE` and no publication
method. Retention keeps unresolved findings and synthetic fixtures, bounds
occurrence records to 100, and only marks old resolved/duplicate artifacts as
prunable under an explicit owner-controlled operation.

The morning brief is one concise private artifact with sections: campaign,
what ran, top findings (top 3), strongest reproductions, source areas,
transients/non-findings, coverage gaps, Nightwatch issues, safety, and
privacy. A clean campaign explicitly says `NO ADMITTED PRODUCT ANOMALIES`.

## Checkpoint, resume, and drift

After manifest creation and every major unit, checkpoint manifest fingerprint,
completed/remaining work, used/remaining budgets, clusters, reproduction and
minimization queues, dossier ledger, morning status, safety, privacy, and next
exact action. Checkpoint writes are atomic and owner-only.

Logical manifest/checkpoint/finalization operations are
`EXACTLY_ONCE_LOGICAL`; browser/API execution is `AT_LEAST_ONCE_SAFE` and may
be `REPLAY_REQUIRED` after an interruption. A completed work-item ledger is
never rerun. A `RUNNING` item at restart is re-queued explicitly, not treated
as completed. No entire campaign restart is allowed.

Resume validates owner policy, manifest identity, source snapshot/catalog/
model/selector/orchestrator versions, auth applicability, and private
destination. Any drift is `CAMPAIGN_VERSION_DRIFT`; old and new evidence are
not compared as one campaign. The default response is stop with a recoverable
checkpoint; a new campaign must be explicitly created.

## Synthetic fixture acceptance matrix

The actual orchestrator must run a deterministic local fixture containing:
J1-only, J2/J3, shared, empty baseline, safe exploration branches, linked API
operations, deterministic UI and API bugs, duplicate failure storm, transient
non-reproduction, Nightwatch false positive, minimizable and irreducible
failures, interruption/recovery, privacy sentinels, and owner-policy-blocked
infrastructure/publication requests. It must prove selection, ordering,
budget ceilings, clustering/deduplication, representative replay, bounded
minimization, dossiers, morning brief, resume, version drift, safety block,
privacy, and deterministic logical output.

## Acceptance gate

Phase 7 is complete only when the native task exists, this SPEC remains frozen,
manifest/identity/modes/selection/budget/order/preflight/checkpoint/resume/
drift/failure-storm contracts are implemented, existing Phase 2–5 primitives
are reused, synthetic acceptance passes, one bounded real DEV campaign
completes or stops correctly under this policy, privacy/safety are zero/clean,
full validation passes, Alphaus repositories remain unchanged, and the
architecture/adversarial review answers every scoped question without
reopening Phase 6.
