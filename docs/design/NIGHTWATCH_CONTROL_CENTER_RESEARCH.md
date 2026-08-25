# Nightwatch Control Center — Research and Architecture Recommendation

Status: PLANNING / RESEARCH ONLY  
Research branch: `plan/nightwatch-control-center`  
Baseline inspected: `main@755cb2e611355011c9d249142b2c2bf4f112327a` (2026-08-25)  
Implementation authority: NONE — this document does not authorize execution, DEV/NEXT contact, product mutation, infrastructure work, or changes to the current active campaign.

## 1. Executive conclusion

A first-class local Nightwatch control center is both feasible and now justified by the shape of the repository.

Nightwatch already has most of the difficult backend ingredients a dashboard needs:

- deterministic readiness models and a programmatic readiness service;
- typed run events and summaries;
- monotonic event sequencing suitable for a timeline/live stream;
- repository snapshots and proxy aggregates;
- campaign planning, coverage, gaps, contracts, findings, and source-intelligence operator models;
- mechanically safe source-surface descriptors with currentness, lifecycle, proof joins, capability state, reason codes, counters, and deterministic digests;
- private owner-local evidence/findings storage;
- strict fail-closed safety, privacy, egress, and owner-scope boundaries.

What is missing is not telemetry. What is missing is a local presentation/control-plane layer that projects those existing authoritative models into a coherent operator interface.

The recommended design is therefore **not** “build a second Nightwatch in a web app.” It is:

> Build a read-only, loopback-only Control Center that consumes explicit, versioned, sanitized DTOs produced by thin adapters over Nightwatch’s existing authoritative services. The UI must not parse CLI text, scrape arbitrary files, become a second source of truth, or gain execution authority in its first implementation.

The centerpiece should be an interactive graph view, but the graph must visualize existing Nightwatch authority and evidence rather than inventing a new workflow engine.

## 2. Repository baseline and findings

### 2.1 Current runtime and UI state

At the inspected baseline:

- the root project is Node >=20 + TypeScript + Playwright;
- `package.json` contains `vue@2.6.12`, but repository source searches found no `from 'vue'` imports and there is no dashboard/application UI directory;
- `src/api/` is a domain-specific Phase 5 area, not a general web API;
- no general `http.createServer` / web application server was found as an existing operator surface;
- the source tree is organized around `api`, `auth`, `browser`, `core`, `data`, `mcp`, `oracles`, `products`, `proxy`, and `state`, with no existing UI/control-center module.

Conclusion: the old Vue 2 dependency must not be treated as an architectural constraint or silently upgraded as part of this feature. A dashboard should be isolated so its frontend dependencies cannot destabilize the core runtime.

### 2.2 Existing readiness authority

`src/core/readiness/service.ts` already exposes a programmatic `LocalReadinessService` over the same frozen summary model used by the CLI. It explicitly performs no filesystem, network, child-process, environment, or persistence work after construction and returns deterministic bytes for identical input.

This is the reference pattern for dashboard adapters:

1. collect authoritative input using the existing bounded collector;
2. summarize through the existing domain model;
3. project into a dashboard DTO;
4. never re-implement the business rule in the HTTP handler or frontend.

### 2.3 Existing run/evidence authority

`src/core/evidence/types.ts` already defines:

- typed `RunEventType` values for lifecycle, navigation, requests/responses, policy, oracle, issue, hard failure, screenshots, stability, journey, and journey-step events;
- monotonic `seq`;
- deterministic/injected timestamps;
- severity;
- `RunSummary` with duration, pass/fail, type/severity counts, hard failures, screenshots, Nightwatch SHA, proxy aggregates, and notes;
- repository snapshot records with branch, HEAD SHA, upstream, ahead/behind, dirty state, timestamps, and bounded error state.

This is enough for a run list, run detail page, chronological timeline, safety summary, and execution DAG projection without introducing another telemetry store.

### 2.4 Existing monitor authority

`src/state/run.ts` maintains the in-memory run monitor and already differentiates:

- hard safety failures;
- ordinary oracle observations;
- oracle failures selected by `failOn`;
- safety failures;
- containment events;
- sanitized monitor diagnostics and first/primary failure.

The Control Center should preserve this semantic distinction. A product/oracle anomaly must never be rendered as equivalent to a containment failure.

### 2.5 Existing campaign/operator authority

`bin/nightwatch-intelligence.mjs` exposes offline/local commands including:

- status;
- plan;
- coverage;
- campaign;
- contracts;
- gaps;
- differential;
- replay/minimization coverage;
- mutation score;
- findings;
- source scan/gaps/surfaces/review queue/explain surface.

The CLI currently builds its views from TypeScript domain modules. The dashboard must import/use the same domain modules through dedicated adapters; it must not spawn this CLI and parse stdout.

### 2.6 Existing source-graph data is richer than a simple flowchart

`src/core/source/surfaceTypes.ts` already provides structured graph-ready facts:

- operation identity, repository, source SHA, safe source path, language, method, route template, handler symbol/path, transport, route proof, and read-only classification;
- currentness: `CURRENT`, `SOURCE_STALE`, `SOURCE_UNAVAILABLE`;
- runtime binding states including exact, partial, source-only, runtime-only, ambiguous, stale, and version mismatch;
- component provenance and confidence;
- proof joins (`ROUTE_HANDLER`, request/response contract, operation schema, response flow) with `PROVEN`, `AMBIGUOUS`, missing, unsupported, or stale states;
- lifecycle stages from `DISCOVERED` through `FULL_LIFECYCLE`;
- projection/replay/differential capability states;
- bounded exclusion reason codes;
- analyzer diagnostics and rejection families;
- discovery counters and performance measurements;
- change reports and Phase 24 invalidation linkage.

This makes a Source Intelligence graph particularly valuable: the UI can show what is proven, ambiguous, stale, excluded, runtime-bound, replayable, or missing without reading raw source.

### 2.7 Safety and privacy are architecture, not decoration

The Control Center must inherit the current safety model:

- production remains unsupported;
- local/dev/next runs remain read-only;
- arbitrary external hosts are denied;
- private findings remain owner-local;
- raw source text and sensitive values must not leak into tracked or generic dashboard artifacts;
- Phase 6 infrastructure/data-layer scope remains frozen;
- the UI must not create a publication path.

A browser-accessible localhost service expands the attack surface even if it is “only local.” Therefore localhost binding, Host/Origin validation, path confinement, bounded payloads, strict static-asset policy, and no external telemetry/CDN dependencies are required from the first server milestone.

## 3. Product goals

The Control Center should answer, at a glance:

1. Is Nightwatch locally ready and safe right now?
2. What campaign/run is active, what stage is it in, and what is blocking it?
3. What happened in a particular run, in what order, and which failure was causal?
4. Which surfaces/contracts are covered, ambiguous, stale, excluded, or unproven?
5. How does a product surface connect to route, handler, contract, response-flow proof, oracle, replay/minimization, triage, and dossier state?
6. What findings exist, how are they clustered, and what sanitized evidence supports them?
7. What changed between source snapshots/campaigns and what authority was invalidated?

The first implementation should **not** answer “what button can I click to make Nightwatch mutate or execute something?” Read-only observability comes first.

## 4. Recommended information architecture

### 4.1 Overview

Show:

- readiness category;
- safety posture and owner-scope state;
- current Git/continuity state;
- latest known run/campaign status;
- counts of failures/findings/gaps;
- source-currentness summary;
- external-CI status as an explicit category, never inferred.

### 4.2 Execution Graph

Canonical high-level lifecycle:

`Environment -> Startup Canary -> Repository Snapshot -> Proxy/Containment -> Browser/Runner -> Journey Steps -> Oracles -> Evidence Finalization -> Triage/Findings`

Node state vocabulary should be explicit and data-driven:

- `PENDING`
- `RUNNING`
- `PASSED`
- `WARNING`
- `FAILED`
- `BLOCKED`
- `SKIPPED`
- `STALE`
- `NOT_APPLICABLE`

The graph is a projection. It is not executable workflow state.

### 4.3 Run Explorer

Show:

- immutable run identity and Nightwatch SHA;
- environment/product/scenario/browser;
- duration/pass state;
- severity/event counts;
- primary safety failure separately from oracle failures;
- ordered timeline from `RunEvent.seq`;
- proxy aggregate;
- repository snapshot summary;
- sanitized screenshots only if a later explicit exposure policy allows them.

MVP should not serve traces, arbitrary artifact files, raw console files, raw network bodies, or caller-supplied filesystem paths.

### 4.4 Campaign Intelligence

Project existing plan/coverage/contracts/gaps/yield/semantic models into:

- coverage scorecards;
- gap taxonomy;
- candidate/portfolio status;
- replay/minimization capability;
- mutation-detection summary;
- source-currentness state;
- blocker/reason-code views.

### 4.5 Source Intelligence Graph

Graph entity classes:

- product/surface;
- operation/route;
- handler;
- request contract;
- response contract;
- semantic contract/expectation;
- response-flow proof;
- runtime target/binding;
- oracle/capability;
- replay/minimizer;
- dossier/finding where safely linkable.

Graph edges must carry proof state, not just topology. Example edge labels:

- `PROVEN`
- `AMBIGUOUS`
- `SOURCE_STALE`
- `MISSING_SYMBOL`
- `UNSUPPORTED_REFERENCE`

Graph nodes must carry lifecycle/currentness/capability state from existing descriptors.

### 4.6 Findings

Start with sanitized owner-local metadata and dossier summaries only:

- fingerprint/cluster identity;
- severity/confidence/category;
- affected product/surface;
- reproduction/minimization state;
- source relevance/currentness;
- dossier readiness;
- deterministic digest/provenance where safe.

No generic route may expose secrets, raw payloads, customer values, auth material, arbitrary evidence paths, or raw source.

### 4.7 Safety Center

Show distinct safety signals:

- selected environment;
- outbound-policy state;
- proxy liveness/containment status;
- denied/blocked aggregate categories;
- owner-policy blocked classes;
- redaction/read-only posture;
- auth mode as a safe category only;
- continuity/project-state health.

Never render a reassuring “safe” badge based only on lack of events; it must come from authoritative readiness/safety state.

## 5. Frontend technology research

### 5.1 React Flow — recommended for the first implementation

Official React Flow documentation (checked 2026-08-25) describes `@xyflow/react` as an MIT-licensed library for interactive node-based UIs with built-in dragging, zoom/pan, selection, custom nodes, minimap, controls, panels, and extensive examples. Current official site showed React Flow 12.11.3. The docs also provide keyboard/screen-reader support and configurable ARIA labeling.

Why it fits Nightwatch:

- custom nodes can render compact safety/currentness/proof badges;
- controlled graph state keeps domain authority outside the graph library;
- minimap/controls are valuable for source-intelligence topology;
- strong accessibility primitives reduce custom canvas accessibility work;
- graph interaction can be disabled where Nightwatch wants a read-only projection.

Risk:

- introduces React to a repository that currently has no React application.

Mitigation:

- isolate it under a dedicated frontend package;
- never import frontend code from Nightwatch core;
- keep the server/API contracts framework-neutral.

Official reference: https://reactflow.dev/  
Accessibility: https://reactflow.dev/learn/advanced-use/accessibility

### 5.2 Vue Flow — not recommended for this campaign

Vue Flow is a capable flowchart/graph library, but its official documentation explicitly targets Vue 3. Nightwatch’s root dependency is Vue 2.6.12 and no current repository source was found using Vue as an application foundation.

Adopting Vue Flow would therefore require either:

- a Vue 2 -> Vue 3 migration with no dashboard benefit, or
- an isolated Vue 3 package anyway.

That removes the main argument for “staying with Vue.” React Flow currently has stronger alignment with the requested interactive node/flow UI and a larger body of purpose-built examples.

Official reference: https://vueflow.dev/

### 5.3 Cytoscape.js — retain as a scale fallback, not MVP dependency

Cytoscape.js is a strong graph-analysis/visualization library and may outperform a rich DOM-oriented graph at very large topology sizes. Its own performance guidance warns that large element counts, especially edges and rich styling, degrade rendering and recommends explicit optimizations.

Recommendation:

- do not add it in MVP;
- bound React Flow graph snapshots and paginate/filter the source graph;
- establish measured graph-size budgets;
- if real Nightwatch source graphs materially exceed those budgets, benchmark Cytoscape.js for the Source Intelligence view only before introducing a second graph engine.

Official reference: https://js.cytoscape.org/

### 5.4 Vite — recommended frontend build tool, compatibility-gated

As of the research date, Vite 8.1 is current. Vite’s official guide supports React + TypeScript templates and states a Node requirement of 20.19+ or 22.12+.

Nightwatch currently declares Node >=20, and its clean qualification is Node-20-oriented. Therefore the implementation campaign must inspect the **actual clean-gate Node 20 minor** before selecting a Vite line:

- if the clean runtime is >=20.19, Vite 8.1 is acceptable;
- if it is older, do not silently break Nightwatch’s clean gate. Either use a compatible Vite line or make a separately justified runtime/gate update with full qualification.

Official reference: https://vite.dev/guide/  
Vite 8.1 announcement: https://vite.dev/blog/announcing-vite8-1

## 6. Backend/server technology recommendation

Use Node’s built-in `node:http` server rather than Express/Fastify for the first read-only surface.

Reasons:

- Nightwatch already requires Node;
- the endpoint set is intentionally small;
- lower dependency and middleware attack surface;
- streaming is supported by the stable HTTP module;
- explicit code makes loopback binding, Host/Origin checks, route allowlists, content-length/timeouts, and fail-closed behavior auditable.

The server should bind **only** to `127.0.0.1` by default. IPv6 loopback support, if added, must be explicit and tested; `0.0.0.0` and non-loopback binds must be rejected.

No WebSocket dependency is needed initially. Use Server-Sent Events (SSE) for one-way sanitized live state/event notifications. The UI can re-fetch authoritative snapshots after notifications rather than treating the event stream as the durable source of truth.

## 7. Recommended process topology

```text
Nightwatch authoritative domain modules
        |
        +-- readiness / project / continuity services
        +-- evidence + run summaries
        +-- campaign intelligence
        +-- source intelligence
        +-- triage/findings safe views
        |
        v
Control Center adapters (pure/sanitizing/versioned)
        |
        v
Loopback HTTP server (read-only routes + SSE)
        |
        +-- JSON snapshots
        +-- bounded event notifications
        +-- built static UI assets
        |
        v
React + React Flow UI
```

A frontend component must never import files from private artifact roots directly. All data crosses versioned adapter contracts.

## 8. Proposed module/package layout

Recommended shape:

```text
src/controlCenter/
  contracts/
    common.ts
    readiness.ts
    runs.ts
    executionGraph.ts
    campaign.ts
    sourceGraph.ts
    findings.ts
    safety.ts
  adapters/
    readinessAdapter.ts
    runAdapter.ts
    executionGraphAdapter.ts
    campaignAdapter.ts
    sourceGraphAdapter.ts
    findingsAdapter.ts
    safetyAdapter.ts
  server/
    server.ts
    router.ts
    staticAssets.ts
    sse.ts
    security.ts
  index.ts

bin/nightwatch-control-center.mjs

ui/control-center/
  package.json
  package-lock.json
  vite.config.ts
  tsconfig.json
  index.html
  src/
    main.tsx
    app/
    api/
    components/
    graphs/
    views/
      Overview/
      Execution/
      Runs/
      Campaigns/
      SourceIntelligence/
      Findings/
      Safety/
```

A nested frontend package is preferred over converting the root repository into an npm workspace in the first campaign. It keeps React/Vite/graph dependencies out of the core package resolution path and makes rollback simple. Root scripts may delegate with `npm --prefix ui/control-center ...` after compatibility is proven.

## 9. API/DTO principles

### 9.1 Version every public dashboard contract

Example:

`schemaVersion: "nightwatch.control-center.readiness.v1"`

Every response must have a bounded schema and must be validated in tests.

### 9.2 Use explicit adapters, not object spreading

Do not return internal objects using `{ ...internal }`. Map whitelisted fields one by one. This prevents a future sensitive internal field from silently becoming web-visible.

### 9.3 Never accept arbitrary filesystem paths

Run/finding/surface identifiers must use bounded safe-ID validation. The server resolves identifiers through approved stores/indices, not caller-supplied paths.

### 9.4 Snapshot authority beats live event authority

SSE should say things such as:

- `readiness.changed`
- `run.updated`
- `run.completed`
- `campaign.snapshot.changed`

The event carries a safe ID/digest/sequence, not the full private object. The client then GETs the current authoritative snapshot.

### 9.5 No database in MVP

Do not add SQLite/Postgres merely for the dashboard. Existing deterministic JSON/JSONL/private stores remain authoritative. Add an index/cache only after profiling demonstrates a real need, and make any cache invalidatable/rebuildable from authority.

## 10. Proposed read-only HTTP surface

Initial route set:

```text
GET /api/v1/meta
GET /api/v1/readiness
GET /api/v1/safety
GET /api/v1/runs?limit=<bounded>&cursor=<opaque>
GET /api/v1/runs/:runId
GET /api/v1/runs/:runId/timeline?afterSeq=<n>&limit=<bounded>
GET /api/v1/runs/:runId/execution-graph
GET /api/v1/campaign/summary
GET /api/v1/campaign/coverage
GET /api/v1/source/summary
GET /api/v1/source/surfaces?repo=<safe-id>&limit=<bounded>&cursor=<opaque>
GET /api/v1/source/graph?surface=<safe-id>&depth=<bounded>
GET /api/v1/findings?limit=<bounded>&cursor=<opaque>
GET /api/v1/events          (SSE)
GET /healthz
```

All unknown routes -> 404.  
All mutation methods -> 405.  
No CORS wildcard.  
No generic `/files`, `/artifacts`, `/source`, or `/debug` endpoint.

## 11. Threat model and hard requirements

### 11.1 Network exposure

Required tests:

- refuses `0.0.0.0`;
- refuses non-loopback address values;
- default bind is `127.0.0.1`;
- unexpected Host header rejected;
- unexpected Origin on browser API/SSE requests rejected;
- no external fonts, analytics, telemetry, CDN scripts, or remote assets in production UI build.

### 11.2 Filesystem/path safety

Required tests:

- `..`, encoded traversal, absolute paths, separators in IDs, NUL-like inputs, overly long IDs, symlink escapes, and unknown IDs fail closed;
- static asset serving is rooted to the built UI directory and cannot escape it;
- run/finding lookup uses IDs and approved stores, never direct caller paths.

### 11.3 Data leakage

Required tests:

- secrets/cookies/auth headers/runtime bodies/raw source cannot appear in DTO snapshots;
- diagnostics use categorical/sanitized fields;
- frontend error UI does not stringify arbitrary exceptions/responses;
- server errors return fixed categories and correlation-safe IDs, not stack traces;
- no raw source endpoint;
- no private findings enumeration outside the explicitly authorized local owner view.

### 11.4 Browser-side injection

Treat all names/messages as text. No `dangerouslySetInnerHTML` for evidence. Apply a restrictive CSP to built UI assets. Do not load Markdown/HTML from findings as executable DOM.

### 11.5 Denial-of-service / accidental overload

Every collection route must have hard server-side maximums. Graph adapters must enforce maximum depth/nodes/edges. Timeline pagination must use sequence/cursor bounds. SSE clients must have bounded queues/heartbeat/cleanup behavior.

## 12. Graph strategy and scale policy

### 12.1 Execution graph

Small and deterministic. React Flow is a clear fit.

### 12.2 Source graph

Potentially large. Do not render the entire repository universe by default.

Use progressive disclosure:

1. repository/product summary;
2. surface list;
3. selected surface neighborhood;
4. bounded depth expansion;
5. filter by currentness/proof/lifecycle/capability.

Suggested initial engineering budgets to validate empirically, not silently hardcode as truth:

- default source graph target: <=250 nodes / <=500 edges;
- hard server response ceiling: <=1000 nodes / <=2000 edges until benchmarked;
- default timeline page: <=250 events;
- SSE message: notification metadata only, not bulk payloads.

If these budgets are insufficient in real local data, profile before relaxing them.

## 13. Accessibility and UX requirements

Because graph UIs are easy to make mouse-only, accessibility is a first-class acceptance gate:

- keyboard-focusable graph nodes/edges;
- readable ARIA labels containing state + object identity;
- a non-graph tabular/list alternative for critical execution/source data;
- state conveyed by text/icon as well as color;
- focus remains stable when live updates arrive;
- prefers-reduced-motion honored;
- no auto-rearrangement while a user is inspecting a selected node unless explicitly requested;
- all failure and safety categories have text equivalents.

React Flow’s built-in keyboard/screen-reader support is useful, but it does not replace application-level semantic labeling.

## 14. Visual/state model

Avoid decorative “green means safe” logic. Proposed semantic tokens:

- readiness: READY / BLOCKED / UNKNOWN / NOT_APPLICABLE;
- safety: HEALTHY / WARNING / FAILED / UNKNOWN;
- proof: PROVEN / PARTIAL / AMBIGUOUS / MISSING / STALE / UNSUPPORTED;
- execution: PENDING / RUNNING / PASSED / WARNING / FAILED / BLOCKED / SKIPPED;
- source currentness: CURRENT / SOURCE_STALE / SOURCE_UNAVAILABLE;
- lifecycle: use exact existing Nightwatch lifecycle values.

The frontend can map semantic tokens to presentation; backend never returns CSS colors as authority.

## 15. Logging and observability of the dashboard itself

The dashboard must not contaminate Nightwatch product evidence.

- use a separate local control-center logger;
- default logs contain route category/status/latency and fixed error category only;
- do not log response bodies, request query values beyond validated safe enums/IDs, private evidence, or auth material;
- dashboard health must not be interpreted as product readiness.

## 16. Testing strategy recommendation

### Unit

- adapter projection and redaction/whitelisting;
- safe-ID/path validation;
- graph derivation;
- cursor/limit bounds;
- Host/Origin/method enforcement;
- SSE queue lifecycle;
- deterministic serialization where promised.

### Contract

Golden schema tests for every `nightwatch.control-center.*.v1` DTO.

### Integration

Start server on ephemeral loopback port with synthetic fixtures and assert:

- no external I/O;
- correct read-only routes;
- failure semantics;
- static asset confinement;
- SSE update -> snapshot refresh flow.

### UI

- component tests for status states;
- graph rendering for all semantic states;
- keyboard/ARIA tests;
- empty/blocked/stale/error/loading states;
- large bounded fixture.

### End-to-end

Use Playwright against the local Control Center with synthetic/local fixtures only. Do not reuse or weaken the product outbound policy to make the dashboard test convenient.

### Whole-repo gates

The implementation campaign must preserve root `typecheck`, hardening checks, semantic compatibility, local gate, clean gate, continuity checks, project-state checks, and any current campaign gates that exist at implementation time.

## 17. Explicit non-goals for the first implementation

- no mutation/control buttons;
- no arbitrary shell/child-process execution from HTTP handlers;
- no “run campaign” API;
- no auth capture from the dashboard;
- no DEV/NEXT/prod contact;
- no browser-control surface;
- no cloud hosting;
- no remote/LAN access;
- no multi-user auth system;
- no database migration;
- no external telemetry;
- no raw source viewer;
- no generic artifact browser;
- no replacement of existing CLI/domain authority;
- no second campaign-selection authority.

## 18. Future operator controls — separate authorization only

A later campaign may add owner-initiated actions, but only through validated Nightwatch application services that already enforce authorization/currentness/safety. The UI must never call arbitrary commands from request parameters.

Potential future actions after a separate threat-model review:

- prepare a local/synthetic campaign;
- replay an exact authorized finding;
- open a local owner-review workflow;
- run a local quality gate.

Each action would require a typed request DTO, explicit authority state, idempotency/concurrency policy, cancellation semantics, and audit trail. None is authorized by this research.

## 19. Decision summary

Recommended now:

- build a first-class **Nightwatch Control Center**;
- read-only first;
- loopback-only;
- React + React Flow frontend in an isolated nested package;
- Vite, only after Node-clean-gate compatibility is verified;
- built-in `node:http` server;
- SSE for notifications, authoritative GET snapshots for state;
- no DB in MVP;
- versioned whitelist DTO adapters over existing domain services;
- bounded graphs and progressive source-graph disclosure;
- no current-campaign disruption required to preserve this plan.

Do not implement from the planning branch. Reconcile these decisions against fresh `main`, current continuity state, and any changes landed by the Phase 24/whole-repository hardening campaign before implementation.

## 20. External references checked

- React Flow: https://reactflow.dev/
- React Flow quick start: https://reactflow.dev/learn
- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- Vue Flow: https://vueflow.dev/
- Cytoscape.js performance guidance: https://js.cytoscape.org/
- Vite guide: https://vite.dev/guide/
- Vite 8.1 announcement (2026-06-23): https://vite.dev/blog/announcing-vite8-1
- Node HTTP API: https://nodejs.org/api/http.html

## 21. Internal references to re-read before implementation

- `AGENTS.md`
- `.agent/README.md`
- `.agent/PLANS.md`
- `.agent/ACTIVE_TASK.md`
- `.agent/EXECUTION_PROMPT.md`
- `docs/ARCHITECTURE.md`
- `docs/SAFETY_MODEL.md`
- `docs/CURRENT_STATE.md`
- `docs/DECISIONS.md`
- `src/core/readiness/*`
- `src/core/evidence/*`
- `src/state/run.ts`
- `src/core/source/*`
- `src/core/portfolio/*`
- `src/core/campaignIntelligence/*`
- `src/core/triage/*`
- `bin/nightwatch-intelligence.mjs`
