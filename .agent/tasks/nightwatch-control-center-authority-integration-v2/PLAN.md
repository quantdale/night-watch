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
Status: COMPLETE
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

Status: COMPLETE.

Build one coherent in-process source/campaign snapshot over existing approved
source and Phase 24/campaign authorities. Preserve exact currentness,
per-repository availability, cache identity, stale/unavailable/empty states,
and deterministic generation binding. No CLI child process or network path.

#### M3 bridge contract

The source bridge is `SourceAuthoritySnapshot`: the fixed approved scan and
`discoverSourceSurfaces` produce the inventory, safe surface descriptors, and
the inventory digest; `analyzeSourceSurfacesIntoPhase24` is invoked only over
that same discovery. The authority records repository-level `CURRENT`,
`SOURCE_STALE`, or `SOURCE_UNAVAILABLE` status, maps those statuses to
`AVAILABLE`, `STALE`, `UNAVAILABLE`, or `EMPTY`, and emits a categorical
reason/generation digest. Its internal discovery and Phase 24 objects never
cross the adapter boundary; source adapters project only allowlisted IDs,
digests, route metadata, proof states, and bounded graph nodes.

The campaign bridge consumes the source snapshot's Phase 24 portfolio and
selection. It converts candidates into the existing `CampaignPortfolio`,
coverage facts, and impact bindings, then uses the existing campaign coverage,
impact, and planner implementations for their sanitized report contracts.
Phase 24's selected candidate IDs are the sole selection authority: only those
IDs are admitted as applicable campaign members, the planner cap is exactly
that selected count, and any selector mismatch becomes
`CAMPAIGN_SELECTOR_DRIFT` rather than being exposed. No intelligence CLI,
second selector, source text, source paths, execution callback, or external
state is introduced. Empty, stale, unavailable, blocked, and composition
errors remain explicit campaign states.

Evidence: `sourceAuthority.ts` uses the fixed approved sibling-source root,
existing bounded discovery/cache/Phase 24 bridges, repository currentness, and
categorical generation/reason state. `campaignAuthority.ts` converts only the
Phase 24-selected set into the existing portfolio, impact, coverage, and plan
contracts; selector drift fails closed. The default collector binds source and
campaign to one short-lived in-process snapshot, while adapters remain the
only public projection boundary. Synthetic fixtures prove available and stale
states, deterministic campaign composition, cache sharing, and absence of
source paths/symbols/raw sentinels from public JSON.

Validation: `npm run typecheck` PASS; `npm run hardening:check` PASS; focused
Control Center suite PASS, 34 passed and 0 failed.

### M4 — Owner-local findings reader

Status: COMPLETE.

Read only the fixed private findings authority through existing dossier/store
validators. Enforce permissions, schema/version, symlink/path/size/privacy
rules and deterministic partial-corruption semantics. Project metadata only.

#### M4 bridge contract

The findings reader uses `privateArtifactRoot()` for the normal owner-local
root (`$HOME/.nightwatch/findings`, with the existing owner configuration
policy) and a separately named test-only injected root. It enumerates only a
bounded set of JSON files, performs owner/mode, regular-file, no-symlink,
size, and stable-read checks, and never returns a path or validator detail.
Raw dossiers and the existing `{ dossier }` persistence envelope are
classified by their dossier schema marker and validated through the single
`validateArtifact('dossier', ...)` facade, which composes the v1 and v2
validators. v1 incomplete stubs are not findings; v2 `UNRESOLVED` dossiers
are projected as incomplete metadata. Unrecognized non-dossier private
artifacts are ignored, while malformed/unsupported dossier candidates,
privacy violations, duplicates, and partial reads produce UNKNOWN rather
than a false EMPTY result. The reader crosses the privacy boundary only as
metadata (screened labels, identities, timestamps, categorical triage
fields, and bounded reproduction counts/results); the findings adapter
preserves AVAILABLE, EMPTY, UNAVAILABLE, and UNKNOWN.

Evidence: `findingsAuthority.ts` resolves the normal owner-local private
artifact root, enforces owner-only mode and fixed JSON-file bounds, rejects
symlinks/traversal/oversize/unstable files, ignores unrelated private
artifacts, composes v1/v2 dossier validation through the artifact facade,
and maps inaccessible, incomplete, corrupt, privacy-blocked, duplicate, and
available states categorically. The reader emits only screened labels,
identities, timestamps, categorical triage values, and bounded reproduction
summary fields. The default collector shares that findings snapshot with the
existing findings adapter and preserves UNKNOWN instead of treating partial
state as EMPTY.

Validation: `npm run typecheck` PASS; `npm run hardening:check` PASS; focused
findings/adapter/authority-integration suite PASS, 13 passed and 0 failed;
full affected Control Center suite PASS, 37 passed and 0 failed; staged
privacy scan found no credential, bearer-key, or private-key patterns;
implementation checkpoint is `9d0018c`.

### M5 — Snapshot lifecycle, cache/currentness, and advisory SSE

Status: COMPLETE.

Define bounded generation snapshots, cache keys, refresh/concurrency behavior,
last-known-good handling, shutdown, and notification-only SSE. Prove failed
refresh cannot bless stale data and identical current generations serialize
byte-identically.

Evidence: `snapshotCoordinator.ts` owns the two fixed run-evidence and
authority cache keys, bounded entries/TTL, digest-only generation identities,
same-key in-flight coalescing, explicit failed-refresh fallbacks, and terminal
shutdown behavior. The normal collector now composes one authority generation
from source, campaign, and findings identities and exposes only the validated
domain snapshots. SSE sanitizes notification DTOs, drops unsafe/replayed
sequences, bounds subscribers, and closes terminally; GET remains authoritative.

Validation: `npm run typecheck` PASS; `npm run hardening:check` PASS; affected
Control Center suite PASS, 42 passed and 0 failed; `git diff --cached --check`
PASS; staged privacy scan found no credential, bearer-key, or private-key
patterns; implementation checkpoint is
`18c0d954996693592e404111cfdecaa411edfc71`.

#### M5 lifecycle contract

`ControlCenterSnapshotCoordinator` owns two fixed cache keys—`run-evidence`
and `authority`—with a maximum of two entries and a maximum configured TTL of
10 seconds. It stores only validated run/authority domain snapshots. Each
entry carries a digest-only cache identity over the fixed key, generation,
and freshness class; the authority generation composes source, campaign, and
findings generations, so campaign output cannot be served independently of
its source generation. Same-key refreshes share one in-flight promise.

Refreshes are bounded on the caller's synchronous/in-process authority
boundary. A successful refresh replaces the entry and records its generation;
a thrown refresh stores and serves only the supplied explicit fallback as
`FAILED`, retaining the last-known-good generation as diagnostic metadata
without serving the old value as CURRENT. Failed entries remain bounded by
the same TTL and retry after expiry. Shutdown is terminal, clears cached
entries, prevents new refreshes, and lets an already-running bounded read
finish without retaining it.

SSE remains notification-only: the event sanitizer reconstructs a fixed
allowlist DTO, strips all extra/raw fields, rejects unsafe identities/digests
and unknown types, and the hub drops replayed or out-of-order sequence
numbers. Client count is bounded (default 8, hard maximum 64), disconnects
remove subscribers, close ends every response, and a closed hub accepts no
new subscribers. GET snapshots remain the only state authority; there is no
watcher, background poller, network refresh, or event payload authority.

Validation target: coordinator coalescing, failed-refresh fallback and
last-known-good behavior, cache/shutdown bounds, event sanitization, SSE
replay/privacy rejection, and existing server/authority determinism tests.

### M6 — UI truthfulness and built non-empty browser qualification

Status: COMPLETE.

Use injected synthetic authorities with the normal server composition to
prove all seven views render non-empty data and preserve V1 empty/stale/
unavailable/blocked/error/accessibility states. Verify no external requests,
console/page errors, raw-field leakage, bundle-bound violations, or selection
loss on advisory refresh.

Evidence: `tests/browser/controlCenterBrowser.browser.ts` starts the normal
loopback server with injected synthetic run/source/campaign/findings
authorities, serves the production UI build, qualifies non-empty Overview,
Safety, Runs, Execution, Campaign, Source, and Findings views, preserves a
selected run across an advisory SSE refresh, and rejects raw sentinels and
external requests. The dedicated Playwright config keeps this built-server
qualification explicit; the inline local favicon prevents a browser-side
404 from weakening the console-error gate.

Validation: `npm run typecheck` PASS; `npm run hardening:check` PASS;
`npm run control-center:ui:typecheck` PASS; `npm run control-center:ui:test`
PASS, 11 passed and 0 failed; `npm run control-center:ui:build` PASS,
257471 bytes total with no external references or embedded content;
`npm run control-center:ui:browser` PASS, 1 passed and 0 failed; agent-browser
loopback visual check PASS; staged privacy scan found no credential,
bearer-key, or private-key patterns; implementation checkpoint is
`c9df8722fb470f1cea151f6d58f8c0d13969b5f2`.

### M7 — Whole-repository hardening and workspace hygiene

Status: COMPLETE.

Audit the full repository across safety/authority, continuity/recovery,
determinism/provenance, concurrency/process/filesystem, input/failure
semantics, tests/gates/CI, and workspace/generated-output lifecycle. Reproduce
and repair Critical/High defects and bounded Medium defects only. Inventory
worktrees/branches/output and add or validate a dry-run-first hygiene
mechanism without deleting ambiguous or dirty state.

Evidence: the Control Center impact-root review found no Critical/High defect;
the repository hardening/static gates, semantic compatibility, owner
provenance, synthetic campaign, hygiene regression, and workspace inventory
all passed. One low-risk reporting defect was reproduced and repaired:
`ignoredEntryCount` now observes bounded ignored output entries instead of
always reporting zero. The hygiene mechanism remains read-only by default,
dry-run-first for worktree cleanup, and preserves all dirty, missing,
prunable, unlinked, and ambiguous state. No generated-output deletion or
workspace mutation was performed.

Validation: `npm run typecheck`; `npm run hardening:check`; hygiene suite 6/6;
`npm run test:semantic-compat` 1870 passed/13 skipped/0 failed across 141
files; `npm run test:owner-provenance` 91/91; `npm run campaign:synthetic`
61/61; `npm run quality-gate:spec`; `npm run gate:inventory`; and
`npm run agent:check` all passed. Implementation checkpoint is
`76f5de9b09cdba930d89c7b74247c6579232a436`; continuity checkpoint is
`3c96c38c08a3928d46f0af74879fe3e478ed5f27`.

### M8 — Integrated validation, docs, continuity closure, and synchronized push

Status: COMPLETE.

Run the complete required validation ladder, privacy/diff review, canonical and
clean-checkout qualification, browser verification, update durable docs and
REPORT/STATE, close ACTIVE_TASK/PLAN truthfully, commit validated checkpoints,
push normally, and verify local `HEAD == origin/main` with a clean tree.

Evidence: the complete local, clean-checkout, nested UI, built-server browser,
and canonical serial Playwright validation ladder passed. The final serial
regression enumerated 2,518 tests with 2,502 passed, 16 skipped, and 0 failed.
The repository remained read-only/local/synthetic throughout; the final
privacy and diff review found no credential, bearer-key, private-key, raw
customer-value, or owner-finding material in the task/documentation changes.
Durable docs and continuity records were reconciled, and the final checkpoint
was pushed without force after equality was verified.

Validation: `npm run typecheck`, `npm run hardening:check`, the affected
48-test Control Center/hygiene suite, nested UI typecheck/test/build, built
browser qualification 1/1, agent-browser loopback visual check, agent audit,
project truth, quality-gate specification, gate inventory, semantic
compatibility, owner provenance, synthetic campaign, `npm run gate:local`,
`npm run gate:clean`, and the full Playwright regression all passed. Local and
clean receipts are recorded in STATE and REPORT.

Exact next action: STOP — task complete; any follow-up requires a new
authorized task.

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
