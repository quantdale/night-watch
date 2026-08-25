# Nightwatch Control Center — Detailed Implementation Plan

Status: PLANNED / NOT AUTHORIZED FOR EXECUTION BY THIS DOCUMENT  
Planning branch: `plan/nightwatch-control-center`  
Research baseline: `main@755cb2e611355011c9d249142b2c2bf4f112327a`  
Companion research: `docs/design/NIGHTWATCH_CONTROL_CENTER_RESEARCH.md`

This plan is intentionally detailed enough for a fresh implementation agent to execute after the current Nightwatch campaign reaches a safe terminal/checkpoint state. It is **not** an instruction to abandon an in-progress campaign, and the planning branch is **not** the implementation base.

## Purpose

Add a production-quality, private, local **Nightwatch Control Center** that makes Nightwatch’s readiness, runs, execution lifecycle, campaign intelligence, source intelligence, findings, and safety state understandable through a central dashboard and interactive graph views.

The observable capability at completion is:

> An owner can start a local loopback-only Control Center, open it in a browser, inspect deterministic/sanitized Nightwatch state and historical/local evidence through versioned read-only APIs, navigate execution and source-intelligence graphs, and observe bounded live state changes without granting the browser any execution/mutation authority or weakening Nightwatch safety/privacy/currentness contracts.

## Starting State

### Planning baseline

The research branch was cut from `main@755cb2e611355011c9d249142b2c2bf4f112327a`.

At that point:

- `.agent/EXECUTION_PROMPT.md` declares an ACTIVE Phase 24 authority-lifecycle + whole-repository hardening campaign;
- `.agent/ACTIVE_TASK.md` still routes to the previous completed response-flow task, meaning the published executor prompt is ahead of continuity activation;
- the Control Center does not exist;
- no general HTTP operator server exists;
- no application UI directory exists;
- root `vue@2.6.12` is present but no repository source import was found;
- readiness, run evidence, source intelligence, campaign intelligence, and triage models already exist and must remain authoritative.

### Required implementation-time rebasing rule

**Do not implement directly on `plan/nightwatch-control-center`.**

At implementation start:

1. fetch current remote state;
2. read the current continuity route and active execution prompt;
3. if another task is `IN_PROGRESS`, do not replace it unless the owner has explicitly ordered an immediate campaign switch and the current task has first been brought to a stable checkpoint;
4. inspect all changes from the planning baseline to current `main`;
5. create a new implementation branch from fresh current `main`;
6. port/reconcile this plan against the current architecture;
7. create a fresh continuity-v2 task before substantive implementation.

Suggested implementation branch name after reconciliation:

`campaign/nightwatch-control-center`

Suggested task ID:

`nightwatch-control-center-readonly-v1`

Suggested authorization class:

`CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY`

## Scope

In scope:

- versioned Control Center DTO contracts;
- pure/sanitizing adapters over existing Nightwatch services/models;
- loopback-only read-only HTTP server;
- built static frontend serving;
- SSE notification channel;
- isolated React/TypeScript frontend package;
- React Flow execution and source graph views;
- Overview, Runs, Execution, Campaigns, Source Intelligence, Findings, Safety views;
- strict path/Host/Origin/method/payload security;
- bounded data pagination/filtering;
- accessibility and keyboard support;
- deterministic synthetic/local test fixtures;
- Playwright end-to-end coverage;
- integration with current local/clean quality gates without weakening them;
- documentation and continuity closure.

## Non-Goals

Explicitly out of scope for this campaign:

- buttons/endpoints that execute campaigns;
- arbitrary subprocess/shell execution;
- browser-control commands;
- authentication capture;
- DEV/NEXT/production contact;
- Alphaus sibling-repository writes;
- infrastructure/cloud/datastore work;
- network hosting beyond loopback;
- external publication, analytics, telemetry, CDN assets, or hosted fonts;
- multi-user authentication;
- database introduction;
- raw source viewer;
- generic filesystem/artifact browser;
- raw network body/console/trace exposure;
- changing Phase 24 portfolio authority;
- replacing existing CLI/domain models with UI-owned logic;
- migrating root Vue 2 merely to support the dashboard;
- Cytoscape.js unless React Flow scale measurements prove a real blocker.

## Safety Constraints

The implementation must preserve all current Nightwatch safety contracts and add the following Control Center invariants.

### S1 — Loopback only

- default bind: `127.0.0.1`;
- reject `0.0.0.0`, LAN, wildcard, or arbitrary host binding;
- no automatic tunnel/share mode;
- no remote deployment configuration.

### S2 — Read-only HTTP authority

- GET/HEAD only for application routes;
- mutation methods return 405;
- no action endpoint exists;
- no handler may spawn a child process or invoke an execution CLI based on HTTP input.

### S3 — Whitelist DTOs

- every public response uses an explicit versioned DTO;
- no object spread from internal domain objects into API responses;
- no arbitrary error serialization;
- no raw exception stack returned to browser.

### S4 — Path confinement

- callers provide safe IDs, not paths;
- every ID is length/character bounded;
- traversal/absolute/encoded-separator/symlink-escape cases fail closed;
- static assets are served only from the built UI root.

### S5 — Privacy

Never expose through generic routes:

- credentials;
- cookies;
- authorization strings;
- customer values;
- raw request/response bodies;
- raw source text;
- arbitrary source files;
- arbitrary console/network logs;
- unreviewed traces;
- private filesystem paths when a safe identifier is sufficient.

### S6 — Source authority

The UI may visualize source-intelligence descriptors and proof metadata, but it must never bypass source boundary/currentness logic or infer deployment equivalence.

### S7 — Snapshot authority

SSE is advisory notification only. Authoritative state comes from current GET snapshots built from domain services/stores. The frontend must tolerate missed/reordered/reconnected SSE connections by re-fetching.

### S8 — Fail closed

Unknown route, schema, ID, enum, origin, host, method, filesystem object, or adapter error must produce a bounded failure response rather than fallback behavior.

## Architecture / Approach

## A. Dependency boundary

Keep frontend dependencies isolated:

```text
Nightwatch root package
  src/controlCenter/*
  bin/nightwatch-control-center.mjs

ui/control-center/
  package.json
  package-lock.json
  Vite + React + @xyflow/react
```

Do not convert the root to npm workspaces in V1 unless current package/gate architecture clearly makes a workspace lower risk than `npm --prefix` delegation.

Before selecting exact Vite version, verify the clean Node 20 runtime. Current Vite 8.1 requires Node 20.19+ or 22.12+.

## B. Core remains authority

Introduce adapters that depend inward on Nightwatch domain services:

```text
core/domain state -> controlCenter adapters -> DTOs -> HTTP -> UI
```

Never:

```text
UI -> parse CLI text
UI -> read artifacts filesystem directly
HTTP -> duplicate readiness/currentness logic
HTTP -> shell out to nightwatch-intelligence
```

## C. Contract versioning

Recommended schema family:

- `nightwatch.control-center.meta.v1`
- `nightwatch.control-center.readiness.v1`
- `nightwatch.control-center.safety.v1`
- `nightwatch.control-center.run-list.v1`
- `nightwatch.control-center.run-detail.v1`
- `nightwatch.control-center.timeline.v1`
- `nightwatch.control-center.execution-graph.v1`
- `nightwatch.control-center.campaign.v1`
- `nightwatch.control-center.source-summary.v1`
- `nightwatch.control-center.source-graph.v1`
- `nightwatch.control-center.findings.v1`
- `nightwatch.control-center.event.v1`

DTOs use categorical values and safe identifiers, not CSS/presentation values.

## D. Server lifecycle

`bin/nightwatch-control-center.mjs` should:

1. parse strict local-only flags;
2. reject environment/product execution flags such as `--env` for V1;
3. verify UI build directory or emit a clear bounded error;
4. construct domain collectors/adapters;
5. start HTTP server on `127.0.0.1` and either a fixed documented default port or an explicit safe port;
6. print the local URL and safe startup category only;
7. handle SIGINT/SIGTERM with graceful SSE/client/server close;
8. never auto-open external network or start Nightwatch product journeys.

Consider `--port=0` in tests to receive an ephemeral port. Production owner command may use a stable default, e.g. 7312, only after conflict/collision review.

## E. Frontend state model

Frontend state must be split into:

- server snapshot state;
- navigation/filter state;
- graph viewport state;
- transient connectivity/error state.

Do not treat React component state as Nightwatch authority.

## F. Graph derivation

Execution graph adapter should derive nodes/edges from known lifecycle and actual available event/summary state.

Source graph adapter should derive a bounded neighborhood from existing descriptors/joins; it must preserve proof state/currentness/lifecycle/capability as typed metadata.

## Proposed file map

```text
src/controlCenter/
  contracts/
    common.ts
    meta.ts
    readiness.ts
    safety.ts
    runs.ts
    executionGraph.ts
    campaign.ts
    sourceGraph.ts
    findings.ts
    events.ts
  adapters/
    readinessAdapter.ts
    safetyAdapter.ts
    runIndex.ts
    runAdapter.ts
    timelineAdapter.ts
    executionGraphAdapter.ts
    campaignAdapter.ts
    sourceSummaryAdapter.ts
    sourceGraphAdapter.ts
    findingsAdapter.ts
  server/
    security.ts
    staticAssets.ts
    json.ts
    router.ts
    sse.ts
    server.ts
  index.ts

bin/nightwatch-control-center.mjs

ui/control-center/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    main.tsx
    styles.css
    app/
      App.tsx
      routes.tsx
      shell/
    api/
      client.ts
      contracts.ts
      events.ts
    components/
      StatusBadge.tsx
      MetricCard.tsx
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
      DataTable.tsx
    graphs/
      ExecutionGraph.tsx
      SourceGraph.tsx
      nodes/
      edges/
      layout/
    views/
      Overview/
      Runs/
      Execution/
      Campaigns/
      SourceIntelligence/
      Findings/
      Safety/
```

Exact names may change after implementation-time audit; architectural roles should remain.

# Milestones

## M0 — Reconcile live repository and establish continuity

Status: NOT_STARTED

### Objective

Prove the campaign is starting from current truth and does not override another in-progress task.

### Actions

1. Read `AGENTS.md`, `.agent/README.md`, `.agent/PLANS.md`, `.agent/PLANNER_HANDOFF.md`, `.agent/ACTIVE_TASK.md`, current `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, and this plan/research.
2. Fetch/prune safely under repository rules.
3. Compare current `main` with planning baseline `755cb2e...` and inspect all intervening commits affecting:
   - evidence;
   - readiness;
   - source intelligence;
   - triage/findings;
   - package/runtime/gates;
   - continuity;
   - server/network/filesystem safety.
4. If a task is `IN_PROGRESS`, either:
   - continue it to its recorded safe closure, then start this campaign; or
   - if owner explicitly ordered an immediate switch, checkpoint that task truthfully before switching. Never overwrite its state mid-edit.
5. Create implementation branch from fresh `main`.
6. Create `.agent/tasks/nightwatch-control-center-readonly-v1/{SPEC,PLAN,STATE,REPORT}.md` and route `ACTIVE_TASK.md` only when this campaign genuinely starts.
7. Run baseline checks.

### Minimum validation

```bash
npm run agent:check
npm run project:check
npm run typecheck
npm run hardening:check
```

Also run whatever additional current local gate is authoritative at start.

### Acceptance

- continuity truth is current;
- no unrelated in-progress task is silently displaced;
- implementation branch starts from live main;
- baseline gates are recorded;
- current Node clean-gate runtime minor is known.

---

## M1 — Define Control Center contracts and sanitization boundary

Status: NOT_STARTED

### Objective

Create framework-neutral, versioned, bounded DTO contracts before building server/UI.

### Areas

- `src/controlCenter/contracts/*`
- contract tests under `tests/unit/controlCenter*`

### Actions

1. Define common safe ID, cursor, enum, error envelope, timestamp/digest shapes.
2. Define V1 DTOs for meta/readiness/safety/run list/run detail/timeline/execution graph/campaign/source summary/source graph/findings/SSE notification.
3. Establish explicit maximums as named constants.
4. Add validators/type guards where runtime input crosses HTTP boundaries.
5. Add tests proving unknown fields from internal fixtures are not serialized unless explicitly mapped.
6. Create a fixed error taxonomy, for example:
   - `CONTROL_CENTER_BAD_REQUEST`
   - `CONTROL_CENTER_NOT_FOUND`
   - `CONTROL_CENTER_METHOD_NOT_ALLOWED`
   - `CONTROL_CENTER_ORIGIN_REJECTED`
   - `CONTROL_CENTER_PATH_REJECTED`
   - `CONTROL_CENTER_SOURCE_UNAVAILABLE`
   - `CONTROL_CENTER_INTERNAL_FAILURE`
7. Do not expose stack/error text in public envelopes.

### Acceptance

- every route planned has a schema version;
- every collection has server-side bounds;
- unsafe path-shaped IDs are rejected;
- DTO tests prove whitelisting rather than object spreading.

### Validation

```bash
npm run typecheck
npx playwright test tests/unit/controlCenterContracts.test.ts --project=nightwatch --workers=1
```

Use current project-specific test invocation if filenames/config evolve.

---

## M2 — Build authoritative read-only adapters

Status: NOT_STARTED

### Objective

Expose UI-ready snapshots without duplicating core logic.

### Areas

- `src/controlCenter/adapters/*`
- existing readiness/evidence/source/campaign/triage modules only where a reusable public service is genuinely missing

### Actions

1. Readiness adapter:
   - use current readiness collector/service;
   - map exact categories and blockers.
2. Safety adapter:
   - use authoritative current safety/readiness/project state;
   - never infer “safe” from empty logs.
3. Run index/detail/timeline adapter:
   - enumerate only approved artifact root;
   - validate run IDs;
   - parse bounded JSON/JSONL defensively;
   - use `RunEvent.seq` for timeline cursors;
   - reject malformed/oversized artifacts with fixed categories;
   - never return arbitrary raw files.
4. Execution graph adapter:
   - map lifecycle nodes and actual evidence state;
   - keep safety/oracle failures distinct;
   - ensure deterministic node/edge IDs and ordering.
5. Campaign adapter:
   - call/import domain modules rather than CLI.
6. Source summary/graph adapter:
   - use safe descriptors and proof joins;
   - never return raw source text;
   - enforce depth/node/edge limits.
7. Findings adapter:
   - use existing private artifact/triage readers;
   - map only sanitized summary metadata;
   - make absence/unavailability explicit.

### Acceptance

- adapters are testable without HTTP/React;
- identical source state yields deterministic DTO snapshots where the underlying model is deterministic;
- all sensitive sentinel tests remain absent from DTO output;
- no child process is used to obtain domain state.

---

## M3 — Implement hardened loopback HTTP server

Status: NOT_STARTED

### Objective

Serve bounded read-only JSON/SSE/static content locally without widening Nightwatch’s network authority.

### Areas

- `src/controlCenter/server/*`
- `bin/nightwatch-control-center.mjs`

### Actions

1. Use `node:http` unless implementation-time evidence strongly justifies another server dependency.
2. Strict route table; unknown path 404.
3. GET/HEAD only; all unsupported methods 405.
4. Bind only to `127.0.0.1` by default.
5. Validate Host.
6. Validate Origin for browser API/SSE requests; no wildcard CORS.
7. Send restrictive headers:
   - Content-Security-Policy appropriate for built assets;
   - `X-Content-Type-Options: nosniff`;
   - `Referrer-Policy: no-referrer`;
   - deny framing unless a tested local requirement exists.
8. Configure request/header/socket timeouts and size bounds.
9. Static asset resolver must be root-confined and symlink-safe.
10. API JSON helper sets deterministic content type/status and fixed error envelope.
11. Add `/healthz` that reports only Control Center server health, never product readiness.
12. Graceful shutdown and SSE cleanup.

### Mandatory adversarial tests

- non-loopback bind rejected;
- Host spoof rejected;
- Origin spoof rejected;
- traversal variants rejected;
- percent-encoded traversal rejected;
- unexpected method rejected;
- malformed URL rejected;
- excessive query/headers/ID length rejected;
- symlink escape rejected;
- unknown static extension safely typed/blocked;
- no directory listing.

### Acceptance

A local synthetic test can start the server on an ephemeral loopback port, fetch known routes/assets, and prove that no external socket is required.

---

## M4 — Add isolated frontend shell and design system

Status: NOT_STARTED

### Objective

Create a local static dashboard shell with strong empty/loading/error/accessibility behavior before complex graphs.

### Actions

1. Verify clean Node compatibility and select Vite line accordingly.
2. Create `ui/control-center` nested package.
3. Add React + TypeScript + `@xyflow/react`.
4. Keep external network dependencies out of runtime UI:
   - bundled/local fonts only or system font stack;
   - no CDN scripts;
   - no analytics.
5. Create responsive shell/nav.
6. Build reusable semantic components.
7. Add typed API client using V1 contracts mirrored/generated in a controlled way. Prefer a single source of truth for shared type definitions if build architecture permits without coupling frontend runtime to core internals.
8. Implement error boundary that renders fixed safe categories, not raw response bodies/stacks.
9. Implement connection state and SSE reconnection skeleton.

### Acceptance

- `npm --prefix ui/control-center run build` succeeds;
- produced assets make no external network requests in E2E;
- keyboard navigation works through shell;
- dark/light presentation must not be an acceptance dependency unless explicitly designed now.

---

## M5 — Overview and Safety Center

Status: NOT_STARTED

### Objective

Deliver useful operator value before graph complexity.

### Overview contents

- readiness category;
- current Git/continuity status;
- safety posture;
- latest run/campaign summary where available;
- source currentness/gap summary;
- findings counts where authorized;
- external CI category explicitly labeled as measured/unknown/blocked according to source model.

### Safety Center contents

- environment selection status/category;
- owner-scope frozen classes;
- proxy/containment status where supported by current evidence;
- blocked/denied aggregate counts;
- safety failure vs oracle failure distinction;
- auth mode as categorical safe metadata only;
- redaction/read-only posture;
- continuity/project-state health.

### Acceptance

- no “green by absence” logic;
- all badges derive from explicit DTO fields;
- unknown/unavailable states are visible, not coerced to success.

---

## M6 — Runs, timeline, and execution graph

Status: NOT_STARTED

### Objective

Make a Nightwatch run inspectable end-to-end.

### Run list/detail

- bounded pagination;
- latest-first ordering by authoritative metadata;
- environment/product/scenario/browser/SHA/duration/pass-fail;
- counts and primary failure categories.

### Timeline

- ordered by `RunEvent.seq`;
- filters for lifecycle/safety/oracle/network categories;
- pagination via `afterSeq`/bounded limit;
- no raw-body viewer.

### Execution graph

Initial graph nodes:

1. Environment Selection
2. Startup Canary
3. Repository Snapshot
4. Proxy / Containment
5. Browser / Runner
6. Journey
7. Oracle Evaluation
8. Evidence Finalization
9. Triage / Finding

Expand journey into steps when available.

Graph properties:

- deterministic node/edge IDs;
- status from DTO token vocabulary;
- node detail panel;
- minimap/fit controls;
- read-only: disable connect/delete/edit semantics;
- keyboard focus + ARIA labels;
- non-graph list/table fallback.

### Live updates

SSE notification -> invalidate/re-fetch relevant run snapshot. Never incrementally mutate authoritative run state solely from SSE payload.

### Acceptance

Synthetic/local fixture shows:

- normal pass;
- oracle failure without safety failure;
- safety hard failure;
- blocked/skipped state;
- incomplete/in-progress run;
- malformed artifact safely categorized.

---

## M7 — Campaign Intelligence view

Status: NOT_STARTED

### Objective

Expose existing campaign/coverage/gap/contract intelligence coherently.

### Actions

1. Build campaign summary DTO from domain modules.
2. Present:
   - plan identity/state;
   - candidate/portfolio counts;
   - coverage classes;
   - contracts;
   - gap taxonomy;
   - replay/minimization support;
   - mutation score/yield when current model provides them;
   - source currentness;
   - blockers/reason codes.
3. Add stable filters and sortable tables.
4. Never introduce a new score that could be mistaken for Nightwatch authority without an explicit domain definition.

### Acceptance

Dashboard output is semantically consistent with existing CLI/domain output on the same synthetic snapshot; test equivalence at the model level, not by matching CLI formatting.

---

## M8 — Source Intelligence graph

Status: NOT_STARTED

### Objective

Visualize source-derived proof topology while preserving safety/currentness semantics.

### Actions

1. Source summary page with repository/surface/counter/currentness/lifecycle/gap rollups.
2. Surface list with safe IDs and categorical proof state.
3. Bounded selected-surface graph containing relevant nodes/joins.
4. Progressive expansion with depth ceiling.
5. Filters:
   - repository;
   - currentness;
   - lifecycle;
   - proof state;
   - runtime binding;
   - replay/differential capability;
   - exclusion reason.
6. Distinguish edge proof state visually and textually.
7. Include deterministic digest/current source SHA where already safe in descriptors.
8. No raw source viewer.

### Performance qualification

Test at least:

- small graph;
- 250-node/500-edge target graph;
- 1000-node/2000-edge hard-ceiling synthetic graph;
- repeated navigation to detect heap/renderer growth;
- high-DPI viewport if practical.

If React Flow is unacceptable at measured bounds, document numbers and evaluate Cytoscape.js for this view only. Do not add both libraries speculatively.

### Acceptance

- bounded graph remains responsive at target size;
- filters do not alter authority, only visibility;
- source stale/unavailable/ambiguous states remain explicit;
- no source text leaks to browser payloads.

---

## M9 — Findings view

Status: NOT_STARTED

### Objective

Present private sanitized triage output without turning the Control Center into an evidence exfiltration/browser endpoint.

### Actions

1. Use approved private findings service/store.
2. List bounded sanitized summary metadata.
3. Detail panel includes only fields explicitly approved by DTO.
4. Show:
   - fingerprint/cluster identity;
   - severity/confidence/category;
   - product/surface;
   - reproduction/minimization status;
   - source relevance/currentness;
   - dossier readiness;
   - safe provenance/digest fields.
5. If screenshots/traces/raw evidence are not explicitly authorized by existing model, show their existence as a category/count only.
6. No “open arbitrary file path.”

### Acceptance

Sentinel secrets/raw-source fixtures fail leakage tests across HTTP responses, rendered DOM, logs, and browser console.

---

## M10 — Security, privacy, accessibility, and failure hardening

Status: NOT_STARTED

### Objective

Adversarially harden the full Control Center as a new local attack surface.

### Required security corpus

- path traversal variants;
- malformed/overlong IDs;
- encoded separators;
- Host/Origin abuse;
- unsupported methods;
- static asset escape/symlink;
- XSS strings in safe display fields;
- malicious Markdown/HTML-like evidence text rendered as text;
- huge JSON/JSONL lines;
- truncated/malformed artifact files;
- rapidly changing files while reading;
- stale cursor;
- SSE disconnect/reconnect storms;
- many SSE clients up to explicit bound;
- browser refresh during partial run;
- deleted run between list/detail fetch;
- findings root unavailable;
- source universe unavailable/stale;
- Control Center port collision;
- frontend build missing/corrupt;
- shutdown with active SSE clients.

### Accessibility

- keyboard-only full navigation;
- focus-visible states;
- graph nodes/edges have meaningful ARIA labels;
- non-color state cues;
- screen-reader-safe status updates;
- reduced motion;
- list/table alternative for critical graph content;
- automated accessibility checks where practical plus manual keyboard smoke.

### Acceptance

No Critical/High security/privacy defect remains reproducible. Medium issues with bounded low-risk fixes should be closed in campaign; lower issues recorded in REPORT/Deferred Work.

---

## M11 — Performance and determinism qualification

Status: NOT_STARTED

### Objective

Prove the dashboard does not materially degrade Nightwatch or become unstable on realistic local evidence volumes.

### Measure

- server cold start;
- readiness endpoint latency;
- run list latency over large synthetic run count;
- timeline page latency;
- source graph adapter latency;
- source graph render/navigation latency;
- frontend bundle size;
- memory behavior across repeated view changes;
- SSE idle overhead and reconnect behavior.

### Rules

- performance timings are advisory, not proof/currentness authority;
- do not cache sensitive state globally merely to hit a number;
- if adding cache, make authority, invalidation, and privacy explicit and testable;
- no background scan loop by default unless justified and bounded.

### Acceptance

Document measured budgets/results in task REPORT. Any default polling/refresh cadence is explicit and does not perform product/network contact.

---

## M12 — Whole-repo integration, documentation, and continuity closure

Status: NOT_STARTED

### Objective

Land the feature without weakening Nightwatch’s established gates or creating stale documentation/state.

### Actions

1. Add root scripts, subject to implementation-time naming review:

```text
control-center:install
control-center:build
control-center:typecheck
control-center:test
control-center:start
control-center:e2e
```

Prefer scripts that do not auto-install during normal execution.

2. Add Control Center checks to the appropriate local/clean gate inventory only after they are deterministic and runtime-compatible.
3. Update:
   - README local operator surface;
   - `docs/ARCHITECTURE.md`;
   - `docs/SAFETY_MODEL.md` for new localhost service boundary;
   - `docs/CURRENT_STATE.md` durable facts only;
   - `docs/DECISIONS.md` with architecture decisions;
   - `.agent` continuity/report.
4. Run authoritative full validation at current repository state.
5. Verify clean checkout/build.
6. If external CI remains blocked for unrelated platform/billing reasons, report that truthfully; do not claim CI success.
7. Push all committed implementation and documentation according to repository policy.

### Minimum final validation target

Use current commands at implementation time; at the planning baseline the expected family includes:

```bash
npm run typecheck
npm run hardening:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run gate:local
npm run gate:clean
npm run agent:check
npm run agent:audit
npm run project:check
npm --prefix ui/control-center run typecheck
npm --prefix ui/control-center run test
npm --prefix ui/control-center run build
```

Plus focused Control Center server/UI/E2E suites.

### Acceptance

- all milestones terminal;
- Control Center is read-only/local-only;
- safety/privacy adversarial suite green;
- no raw source/secret leakage;
- core existing gates at least as strict as before;
- docs match implementation;
- continuity v2 closes cleanly;
- branch pushed with truthful report and exact tested anchors.

# Validation Strategy

## Layer 1 — Pure domain/DTO

Fast tests for adapters, validation, serialization, graph derivation.

## Layer 2 — Server integration

Ephemeral loopback server against synthetic stores/fixtures.

## Layer 3 — Frontend component/graph

Build/test UI states without product execution.

## Layer 4 — Local Control Center E2E

Playwright opens only the loopback dashboard and exercises synthetic/local fixtures.

## Layer 5 — Whole Nightwatch regression

Current authoritative root gates + clean checkout.

No test layer authorizes DEV/NEXT/product contact.

# Test fixture matrix

Create deterministic fixtures covering:

| Fixture | Purpose |
| --- | --- |
| empty repository state | empty-state rendering |
| ready local | happy readiness |
| blocked readiness | blockers/unknown states |
| passing run | normal execution graph |
| oracle-only failure | separation from safety |
| hard safety failure | fail-closed visualization |
| partial/in-progress run | live/incomplete state |
| malformed artifact | bounded parsing failure |
| stale source | currentness semantics |
| unavailable source | explicit unavailable state |
| ambiguous proof joins | graph proof semantics |
| large graph | performance bounds |
| finding with sentinel secret | leakage defense |
| path traversal IDs | server confinement |
| hostile display text | XSS/text rendering |

# Decision Log

## D1 — Read-only first

Decision: V1 contains no execution/mutation endpoints.  
Reason: introducing UI and execution authority simultaneously creates an unnecessary trust-boundary jump.  
Consequence: operator controls require a later separately authorized campaign.

## D2 — Core/domain models remain authoritative

Decision: adapters import domain services; HTTP/UI do not parse CLI output.  
Reason: avoids duplicated business rules and authority divergence.  
Consequence: missing reusable service APIs should be added narrowly to core when necessary.

## D3 — Isolated React frontend

Decision: use React + React Flow in `ui/control-center`, not root Vue 2.  
Reason: current Vue 2 is not an application foundation; Vue Flow targets Vue 3; React Flow directly fits node-based UI requirements.  
Consequence: keep dependencies isolated and backend contracts framework-neutral.

## D4 — No database in V1

Decision: existing stores remain source of truth.  
Reason: a dashboard database would create synchronization/currentness problems before a measured need exists.  
Consequence: use bounded parsing/indexing; add rebuildable cache only if profiling proves necessary.

## D5 — SSE notifications, snapshot authority

Decision: one-way live notifications via SSE; GET snapshot remains truth.  
Reason: simpler than WebSocket and resilient to reconnect/missed events.  
Consequence: client re-fetches on notifications.

## D6 — Built-in HTTP server

Decision: default to `node:http` for V1.  
Reason: tiny explicit route surface and lower dependency attack surface.  
Consequence: server security behavior must be implemented/tested explicitly.

## D7 — Planning branch is not implementation base

Decision: implementation begins from fresh future `main`.  
Reason: a whole-repository hardening campaign is currently planned/active and may materially change relevant surfaces.  
Consequence: M0 reconciliation is mandatory.

# Discoveries to Re-verify at Implementation Time

- whether the Phase 24/whole-repo hardening campaign has landed;
- current `ACTIVE_TASK` status;
- actual Node 20 minor used by `gate:clean`;
- any newly added UI/server dependencies;
- any new safe domain service replacing CLI-only access;
- artifact format/version changes;
- source descriptor/Phase 24 invalidation changes;
- findings/private store changes;
- external CI status.

# Deferred Work

Potential later campaigns:

- owner-authorized local action controls;
- replay/quality-gate launch buttons through typed authority services;
- compare two runs/source snapshots visually;
- saved local view/filter preferences;
- large-graph engine benchmark/Cytoscape migration if measured necessary;
- richer screenshot/trace viewer behind separate explicit privacy design;
- packaged desktop wrapper if browser-local UX becomes insufficient.

# Completion Criteria

The campaign is DONE only when all of the following are true:

1. Control Center starts locally on loopback only.
2. No execution/mutation API exists.
3. Overview, Safety, Runs, Execution Graph, Campaigns, Source Intelligence, and Findings are implemented to the approved V1 scope.
4. All data crosses versioned whitelist DTOs.
5. No arbitrary path/raw source/secret/raw-body endpoint exists.
6. Server rejects hostile bind/Host/Origin/path/method inputs.
7. SSE is notification-only and reconnection-safe.
8. Graphs are bounded and accessible with non-graph fallback.
9. React/Vite dependencies remain isolated from core runtime as designed or a documented evidence-backed alternative was chosen.
10. Local/synthetic E2E is green without external network access.
11. Existing Nightwatch safety and quality gates are not weakened.
12. Clean checkout qualification succeeds to the extent the repository’s existing external platform constraints allow.
13. `AGENTS`/project docs/decisions/safety/current state are updated truthfully.
14. Continuity v2 task/report is terminal and internally consistent.
15. Implementation branch is committed and pushed with exact validated anchors and no untracked sensitive evidence.
