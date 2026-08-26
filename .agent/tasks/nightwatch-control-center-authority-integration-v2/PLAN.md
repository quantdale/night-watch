# Control Center Authority Integration + Whole-Repository Hardening V2 Plan

## Purpose

Wire the completed Control Center V1 to Nightwatch's existing authoritative
local run, source, campaign, and owner-local findings state through bounded,
read-only readers, then harden the dependency cone and close with validated
local and clean-repository evidence.

## Starting State

- Task ID: `nightwatch-control-center-authority-integration-v2`
- Starting Nightwatch SHA: `ccbb57721d99020667881481411aa961d12229e5`
- Branch: `main`, synchronized with `origin/main` after the requested
  fast-forward-only pull.
- V1 implementation anchor: `e5ac2fff0f8840c80bb48a57ca0df56cba39c90d`;
  the completed V1 task remains immutable history.
- The pulled planner prompt is the active V2 campaign authorization.

## Scope

Bounded in-process authority facades/readers, existing Control Center adapter
and server integration, synthetic authority fixtures, source/campaign/findings
bridges, cache/currentness/SSE hardening, built UI browser qualification,
whole-repository hardening audit, hygiene inventory, documentation, and
continuity closure.

## Non-Goals

DEV/NEXT/production execution, authenticated browser/API access, product
observation, mutations, database/datastore/cloud/infrastructure/IAM work,
Alphaus sibling writes, external publication, remote hosting, arbitrary file
or raw-evidence browsing, child-process routes, and any second domain
authority remain outside this task.

## Safety Constraints

Readers are fixed-root, bounded, read-only, in-process, deterministic, and
fail-closed. Public DTOs remain explicit allowlists; raw source, bodies,
customer values, credentials, cookies, auth strings, arbitrary paths, traces,
and owner-only evidence never cross the projection boundary. HTTP remains
loopback-only, GET/HEAD/SSE-only, and notification-only for SSE.

## Architecture / Approach

```text
Existing Nightwatch authorities
  -> bounded authority readers/facades
  -> existing Control Center adapters and whitelist DTOs
  -> loopback snapshot routes and advisory SSE
  -> isolated built UI
```

Each surface keeps its current domain authority: evidence/run records for
runs, source intelligence for source state, Phase 24/campaign intelligence
for campaign state, and the private dossier store for findings. The server
composes one coherent snapshot and never invokes a CLI, shell, network,
browser, Git, mutation, or refresh side effect.

Task ID: nightwatch-control-center-authority-integration-v2
Phase: CONTROL-CENTER-AUTHORITY-INTEGRATION-V2
Status: IN_PROGRESS
Authorization class: CONTROL_CENTER_LOCAL_READ_ONLY_AUTHORITY_INTEGRATION_AND_HARDENING
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Working rules

Keep the V1 task immutable. Inspect current implementation and tests before
changing semantics. Use existing domain validators and pure authorities. Any
uncertain, malformed, stale, partial, or changing state fails closed or is
projected as an explicit non-current category. Update STATE after every
milestone and before any substantial subproblem change.

## Authority Map

| Public surface | Canonical authority to verify | New reader boundary | Status |
|---|---|---|---|
| Runs / timeline / graph | `src/core/evidence/runRecorder.ts` writes `artifacts/<run-id>/manifest.json`, `summary.json`, `events.jsonl`, and optional `repositories.json`; schemas are in `src/core/evidence/types.ts` and V1 projections are in `src/controlCenter/server/runAdapter.ts` / `executionGraphAdapter.ts` | `src/controlCenter/authorities/runEvidenceReader.ts` | SELECTED |
| Source summary / surfaces / graph | `src/core/source/approvedScan.ts`, `siblingSource.ts`, `scan.ts`, `surfaces.ts`, `cache.ts`, and `invalidation.ts`; `siblingSource.ts` is the sole sibling-checkout filesystem boundary | `src/controlCenter/authorities/sourceAuthority.ts` | SELECTED |
| Campaign / coverage | Phase 24 source analysis/portfolio is the source-derived authority; Phase 19 `campaignIntelligence/{coverage,planner,cache}.ts` supplies sanitized campaign metadata; `bin/nightwatch-intelligence.mjs` remains CLI-only and is not a server authority | `src/controlCenter/authorities/campaignAuthority.ts` | SELECTED |
| Findings | `src/core/policy/privateArtifacts.ts`, `src/core/artifactValidation/dossierKindValidation.ts`, and the v1/v2 triage dossier validators | `src/controlCenter/authorities/findingsAuthority.ts` | SELECTED |
| Health / meta / readiness / safety | existing V1 default collector authorities | existing adapter path | EXISTING |

No reader may shell out to a CLI or accept a caller-controlled filesystem
root/path. Adapters remain the sole public projection boundary.

### Authority and consumer trace

- Run recorder output → bounded run reader → existing run/timeline/graph
  adapters → fixed server routes → Control Center API and run views. Raw event
  messages, event data, network bodies, and console bodies stop at the reader
  boundary.
- Approved sibling-source access and source-surface discovery → source
  authority/cache → source adapters → source routes and source views. The
  source authority returns safe structural metadata and exact currentness only.
- Source/Phase 24 analysis plus the existing campaign-intelligence contracts →
  one generation-bound campaign snapshot → campaign adapters → campaign
  routes and campaign views. A second selector or CLI invocation is not an
  authority.
- Owner-local private artifact store → dossier-kind validators → bounded
  findings reader → findings adapter → findings route and triage view. Invalid
  or inaccessible private state never becomes an empty successful result.

### Fixed roots, bounds, and failure categories

| Authority | Fixed boundary and bounds | Fail-closed categories |
|---|---|---|
| Runs | Repository-owned `artifacts/` root; safe run IDs; bounded run directories, known files, bytes, events, and one stable-read retry | missing/unavailable, symlink or traversal, oversized, unstable, malformed/unknown schema, duplicate sequence, privacy sentinel |
| Source | `DEFAULT_SIBLING_ROOT` plus `createApprovedRealSourceScanConfig()` and existing scan/cache limits | source unavailable, source stale, config/scan drift, cache mismatch, privacy rejection, internal reader error |
| Campaign | In-process source/Phase 24/campaign composition with bounded candidate selection and no external process | source stale/unavailable, composition or selector drift, empty, blocked, unavailable, internal error; never fabricate PASS |
| Findings | `privateArtifactRoot()` outside the repository/workspace; bounded owner-only JSON dossier enumeration | absent, permission/mode failure, symlink/path violation, oversized, corrupt/unsupported schema, privacy violation, partial corruption |

## Milestones

### M0 — Pull, bootstrap, preflight, and successor activation

Status: COMPLETE.

Evidence: `git pull --ff-only` fast-forwarded `858c2a6` → `ccbb577`; clean
`main` equals `origin/main`; required durable docs and V1 task records were
read; `agent:check`, `project:check`, `typecheck`, and the 25-test focused V1
Control Center suite passed. Fresh V2 SPEC/PLAN/STATE/REPORT and ACTIVE_TASK
routing were created from the live main.

### M1 — Authority inventory and reader architecture

Status: COMPLETE.

Trace each surface from producer through persistence/local authority, reader,
adapter, DTO, server route, client API, and UI view. Inspect all relevant
validators, schemas, file layouts, cache/currentness contracts, and test seams.
Record authoritative-versus-serialized modules, fixed roots, limits, failure
categories, generation identities, and deliberate non-goals before coding.

Evidence: the authority map above records the current producer, validator or
source boundary, selected reader seam, consumer path, fixed boundary, bounds,
and fail-closed categories. Existing V1 contracts/adapters/routes and the
evidence, source, Phase 24, campaign-intelligence, triage, and private-store
implementations were inspected before selecting the seams.

Validation: authority map review; baseline `npm run typecheck`,
`npm run project:check`, and focused V1 Control Center tests passed. The
hardening and new reader-boundary checks are deferred to their implementation
milestones.

### M2 — Bounded run/evidence reader and integration

Status: COMPLETE.

Implement fixed-root run discovery and validated summary/event/snapshot reads.
Reject symlinks, traversal, unsafe IDs, unknown schemas, oversized or
unstable records, duplicate/conflicting IDs, and raw evidence fields. Add
deterministic list/detail/timeline/graph integration tests and privacy
sentinels.

Evidence: `runEvidenceReader.ts` reads only the repository-owned artifacts
root, performs bounded stable descriptor reads with one retry, projects safe
typed inputs, and reports explicit state/reason categories. The default
collector shares one bounded run snapshot across the four run consumers. The
focused reader/adapter/server suite passes 23/23 and the repository hardening
gate remains green.

### M3 — Source and campaign authority integration

Status: PENDING.

Build one coherent in-process source/campaign snapshot over existing approved
source and Phase 24/campaign authorities. Preserve exact currentness,
per-repository availability, cache identity, stale/unavailable/empty states,
and deterministic generation binding. No CLI child process or network path.

### M4 — Owner-local findings reader

Status: PENDING.

Read only the fixed private findings authority through existing dossier/store
validators. Enforce permissions, schema/version, symlink/path/size/privacy
rules and deterministic partial-corruption semantics. Project metadata only.

### M5 — Snapshot lifecycle, cache/currentness, and advisory SSE

Status: PENDING.

Define bounded generation snapshots, cache keys, refresh/concurrency behavior,
last-known-good handling, shutdown, and notification-only SSE. Prove failed
refresh cannot bless stale data and identical current generations serialize
byte-identically.

### M6 — UI truthfulness and built non-empty browser qualification

Status: PENDING.

Use injected synthetic authorities with the normal server composition to
prove all seven views render non-empty data and preserve V1 empty/stale/
unavailable/blocked/error/accessibility states. Verify no external requests,
console/page errors, raw-field leakage, bundle-bound violations, or selection
loss on advisory refresh.

### M7 — Whole-repository hardening and workspace hygiene

Status: PENDING.

Audit the full repository across safety/authority, continuity/recovery,
determinism/provenance, concurrency/process/filesystem, input/failure
semantics, tests/gates/CI, and workspace/generated-output lifecycle. Reproduce
and repair Critical/High defects and bounded Medium defects only. Inventory
worktrees/branches/output and add or validate a dry-run-first hygiene
mechanism without deleting ambiguous or dirty state.

### M8 — Integrated validation, docs, continuity closure, and synchronized push

Status: PENDING.

Run the complete required validation ladder, privacy/diff review, canonical and
clean-checkout qualification, browser verification, update durable docs and
REPORT/STATE, close ACTIVE_TASK/PLAN truthfully, commit validated checkpoints,
push normally, and verify local `HEAD == origin/main` with a clean tree.

## Validation Strategy

Use pure reader/adapter tests first, then loopback server tests, nested UI
tests/build and synthetic browser verification, followed by repository gates,
full regression, privacy/diff review, and clean-checkout qualification. Keep
all validation local and synthetic; do not invoke real campaigns or auth
capture.

## Validation ladder

Focused checks come first, then affected cone, then the repository gates:

```text
npm run typecheck
npm run hardening:check
npx playwright test tests/unit/controlCenterContracts.test.ts tests/unit/controlCenterAdapters.test.ts tests/unit/controlCenterServer.test.ts --project=nightwatch --workers=1
npm run control-center:ui:typecheck
npm run control-center:ui:test
npm run control-center:ui:build
npm run agent:check
npm run agent:audit
npm run project:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run campaign:synthetic
npm run test:owner-provenance
npm run gate:local
npm run gate:clean
npm test -- --workers=1
git diff --check
```

Add exact commands and receipts as new reader/UI/hardening tests land. Keep
all runs synthetic/local; do not invoke `campaign:real`, `phase9b:real`,
`phase10b:real`, or any auth capture.

## Decision Log

- M0 — preserve V1 as immutable history and create a fresh continuity-v2
  successor because the pulled execution prompt is an active new campaign.
- M1 — identify the existing domain producer/validator and persistence
  boundary before adding any reader, so the Control Center cannot become a
  second authority.

## Discoveries

- The requested pull changed only the execution prompt; no implementation or
  test source moved during reconciliation.
- V1's default collector has real health/meta/readiness/safety paths but
  placeholder run/source/campaign/findings branches, which this task must
  replace through existing authorities.

## Deferred Work

Remote hosting, execution/mutation controls, raw evidence drill-down,
database/index persistence, multi-user authentication, graph-engine changes,
and any owner-blocked infrastructure/data work remain out of scope. Precision-
only or speculative hardening observations belong in REPORT rather than
unbounded redesign.

## Completion Criteria

M0–M8 are terminal; the normal launcher reads all approved local authorities;
all reader, privacy, currentness, cache, SSE, server, UI, hardening, and
whole-repository checks pass; durable docs agree with implementation truth;
the task records are terminal; and a non-forced push leaves local `HEAD`
equal to `origin/main` with a clean tree.

Remote hosting, execution/mutation controls, raw evidence drill-down,
database/index persistence, multi-user authentication, graph-engine changes,
and any owner-blocked infrastructure/data work remain out of scope. Precision-
only or speculative hardening observations belong in REPORT rather than
unbounded redesign.
