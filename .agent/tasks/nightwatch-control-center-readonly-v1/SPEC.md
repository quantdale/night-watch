# Nightwatch Control Center — Read-Only Local V1

## Task purpose

Implement the researched Nightwatch Control Center successor from the live
`main` baseline as a private, loopback-only, read-only dashboard. It must
project existing Nightwatch authority through explicit versioned DTOs and
bounded adapters, with no execution, mutation, raw-source, secret, arbitrary
filesystem, or external-network authority.

## Established starting state

- Task ID: `nightwatch-control-center-readonly-v1`
- Starting SHA: `8feea0092f361e80bfaf23f29a7d45df05c7fada`
- Implementation branch: `campaign/nightwatch-control-center`
- `origin/main` equals the starting SHA; the prior Phase 24 task is terminal.
- Planning-only successor ref: `origin/plan/nightwatch-control-center`,
  three documentation commits; it is not an implementation base.
- Existing Nightwatch domain models, evidence/run records, readiness,
  campaign/source intelligence, triage, and safety policy remain authoritative.
- No general operator HTTP server or application UI exists in the current
  implementation; the root Vue 2 dependency has no application imports.
- Local Node is `22.22.1`; clean qualification resolves Node major 20 through
  the repository clean-gate toolchain and must be re-verified before choosing
  the frontend build version.

## Required deliverables

- Versioned, whitelist-only Control Center DTO contracts and sanitizers.
- Pure adapters over existing readiness, evidence, campaign, source, and
  private-findings authorities.
- Hardened `node:http` loopback server with GET/HEAD-only JSON, static assets,
  bounded SSE notifications, strict Host/Origin/path/method handling, and
  graceful shutdown.
- Isolated React/TypeScript frontend under `ui/control-center` with bundled
  local assets, accessible Overview, Safety, Runs, Execution, Campaigns,
  Source Intelligence, and Findings views, plus bounded graph projections and
  non-graph fallbacks.
- Deterministic synthetic/unit/server/UI/E2E security and privacy tests.
- Root scripts and gate integration only after compatibility is proven.
- Truthful task/report/docs closure and a validated push to `origin/main`.

## Explicit non-goals

- No campaign execution, replay, mutation, auth capture, browser control,
  child-process execution from HTTP, arbitrary shell, or action endpoint.
- No DEV/NEXT/production contact, Alphaus repository modification, cloud,
  datastore, infrastructure, IAM, deployment, or external publication.
- No LAN/wildcard binding, tunnel/share mode, multi-user authentication,
  database, external telemetry/CDN/font dependency, or remote hosting.
- No raw source, request/response bodies, cookies, credentials, auth strings,
  customer values, traces, arbitrary console/network logs, or generic file or
  artifact browser.
- No second Phase 24 selector/planner or duplicated readiness/currentness
  authority.

## Safety constraints

- Bind only to `127.0.0.1` by default; reject non-loopback bind requests.
- Accept only explicitly routed GET/HEAD requests and notification-only SSE.
- Validate bounded safe IDs, cursors, depth, limits, Host, Origin, URL paths,
  request sizes, static roots, and symlink confinement; fail closed on all
  unknown or malformed input.
- Map internal state field-by-field into versioned DTOs. Never spread internal
  objects into public responses or serialize arbitrary exceptions.
- Resolve run/finding/source identifiers through approved local authorities,
  never caller-supplied paths. SSE only invalidates/refetches snapshots.
- Keep safety failures, oracle failures, stale/unavailable source states,
  unknown readiness, and owner-policy blocks semantically distinct.
- Keep frontend dependencies isolated from the root runtime and ensure the
  built UI has no external asset or telemetry requests.
- All fixtures and tests use synthetic values only; no raw source or secrets
  may enter tracked files, logs, reports, or browser output.

## Acceptance criteria

- The Control Center starts on loopback and serves a built local UI without
  external network access.
- Overview, Safety, Runs/timeline, Execution Graph, Campaigns, Source
  Intelligence graph, and Findings views are implemented with loading,
  empty, stale, unavailable, blocked, error, and accessibility states.
- Every public response is a validated `nightwatch.control-center.*.v1`
  whitelist DTO; no execution/mutation route exists.
- Host/Origin/method/path/static-root/size/SSE adversarial tests are green,
  including traversal, symlink, XSS, malformed artifact, reconnect, and
  unavailable-authority cases.
- Graphs are bounded, deterministic, semantically labeled, keyboard-aware,
  and have list/table fallbacks.
- Existing Nightwatch typecheck, hardening, semantic compatibility, quality
  gates, clean qualification, continuity, project truth, and full regression
  remain green or any external platform limitation is reported truthfully.
- The v2 task records are terminal, privacy-safe, and pushed from current
  `main`; final local `HEAD == origin/main` and the worktree is clean.
