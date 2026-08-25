# Nightwatch Control Center — Read-Only Local V1 Plan

## Purpose

Add a private local Control Center that makes existing Nightwatch readiness,
runs, campaign intelligence, source proof/currentness, safety, and sanitized
findings inspectable through a coherent UI without creating execution or
mutation authority.

## Starting State

- Task ID: `nightwatch-control-center-readonly-v1`
- Starting Nightwatch SHA: `8feea0092f361e80bfaf23f29a7d45df05c7fada`
- Branch: `campaign/nightwatch-control-center`, created from synchronized
  current `main`; final durable checkpoints will be fast-forwarded to `main`.
- Relevant authorities: readiness service, evidence/run types and stores,
  campaign/source intelligence domain modules, private findings stores,
  existing safety and owner-scope policy.
- Planning branch is documentation-only and remains untouched.
- Established facts not to rediscover: prior Phase 24 hardening is terminal;
  no general HTTP/UI surface exists; root Vue 2 is not an application base;
  the quality gate is a fixed nine-group serial registry.

## Scope

Versioned DTO contracts, pure sanitizing adapters, loopback `node:http`
server, static asset confinement, notification-only SSE, isolated React/Vite
frontend, accessible dashboard views and bounded graph projections, synthetic
fixtures, root delegation scripts, focused and whole-repository validation,
documentation, and continuity closure.

## Non-Goals

Execution/mutation/auth/browser control, arbitrary shell, real product or
external environment contact, infrastructure/data operations, remote/LAN
hosting, database, multi-user auth, raw source/evidence/file browsing, external
assets/telemetry, root Vue migration, and a second portfolio authority.

## Safety Constraints

Loopback-only bind; GET/HEAD-only API; strict route/Host/Origin/method/ID/
size/path/static-root validation; whitelist DTOs; no raw source, bodies,
credentials, cookies, customer values, traces, or arbitrary logs; no child
process from HTTP; no external network; SSE metadata only; snapshot GETs are
authoritative; domain services remain the only authority; all failures are
bounded categorical responses.

## Architecture / Approach

```text
Nightwatch domain authorities
  -> src/controlCenter/adapters (pure bounded projections)
  -> src/controlCenter/contracts (versioned whitelist DTOs)
  -> src/controlCenter/server (node:http, local security, SSE)
  -> ui/control-center (isolated React/Vite, accessible views/graphs)
```

The server will use an injected collector/adapters object so unit and server
tests never need product state. Run/finding/source IDs are safe identifiers
resolved only by approved adapter stores. Public JSON is constructed
explicitly and validated before emission. Static assets are confined beneath
the built UI root. SSE sends bounded invalidation metadata and clients refetch
GET snapshots. The initial source graph is progressive and capped; execution
and source graph data also have list/table fallbacks.

## Milestones

### M0 — Reconcile live repository and establish continuity

- Objective: prove the successor is based on current main and activate a
  fresh task without replacing a live campaign.
- Files/areas: Git refs, current docs/state, task records.
- Implementation actions: inspect planning baseline/intervening changes,
  verify Node 20 clean toolchain, create branch/task, route ACTIVE_TASK, run
  baseline gates.
- Acceptance criteria: clean branch at current main; v2 task active; exact
  baseline evidence recorded.
- Validation commands: `npm run agent:check`, `npm run project:check`,
  `npm run typecheck`, `npm run hardening:check`, `npm run quality-gate:spec`,
  `npm run gate:inventory`.
- Status: COMPLETE

### M1 — Define contracts and sanitization boundary

- Objective: establish all versioned whitelist DTOs and safe input limits
  before server/UI logic.
- Files/areas: `src/controlCenter/contracts/**`, contract tests.
- Acceptance criteria: every planned route has a schema, bounded collection,
  safe ID, categorical error envelope, deterministic ordering, and explicit
  field mapping with hostile-field leakage tests.
- Validation commands: typecheck and focused contract tests.
- Status: COMPLETE

### M2 — Build authoritative read-only adapters

- Objective: project readiness, safety, runs, timeline, execution graph,
  campaign, source, and findings from existing authorities only.
- Files/areas: `src/controlCenter/adapters/**`, synthetic authority fixtures.
- Acceptance criteria: adapters are pure/testable, deterministic where input
  is deterministic, bounded, source-currentness preserving, and child-process
  free.
- Validation commands: focused adapter/graph tests and hardening check.
- Status: COMPLETE

### M3 — Implement hardened loopback HTTP server

- Objective: serve bounded read-only JSON, SSE, health, and static UI routes.
- Files/areas: `src/controlCenter/server/**`, `bin/nightwatch-control-center.mjs`.
- Acceptance criteria: loopback-only, strict route/method/Host/Origin/path/
  size/static-root controls, fixed errors, graceful SSE/shutdown, no action
  endpoint or external socket.
- Validation commands: server integration and adversarial security tests.
- Status: COMPLETE

### M4 — Add isolated frontend shell and design system

- Objective: create React/Vite static shell with no external assets and robust
  loading/empty/error/accessibility states.
- Files/areas: `ui/control-center/**`, root delegation scripts.
- Acceptance criteria: typecheck/test/build pass; bundle has no external
  requests; keyboard shell and safe error boundary work.
- Validation commands: nested package typecheck/test/build.
- Status: COMPLETE

### M5 — Overview and Safety Center

- Objective: deliver useful readiness, safety, continuity, and source summary
  views without green-by-absence logic.
- Files/areas: frontend views/components and overview DTO adapters.
- Acceptance criteria: explicit READY/BLOCKED/UNKNOWN/unavailable semantics,
  safety-vs-oracle distinction, owner-scope/read-only posture visible.
- Validation commands: component/contract and browser smoke tests.
- Status: COMPLETE

### M6 — Runs, timeline, execution graph, and SSE refresh

- Objective: inspect bounded run summaries, ordered event timelines, and
  deterministic read-only execution graphs with reconnect-safe refresh.
- Files/areas: run/timeline/execution adapters, SSE client, graph views.
- Acceptance criteria: pass/oracle-only/safety-failure/blocked/incomplete/
  malformed fixtures render distinctly; timeline uses `seq`; SSE never acts
  as state authority.
- Validation commands: adapter/server/frontend/E2E matrix.
- Status: COMPLETE

### M7 — Campaign Intelligence

- Objective: project existing campaign/coverage/gap/contract/yield models.
- Files/areas: campaign adapter and view.
- Acceptance criteria: model-level equivalence with existing domain outputs;
  no new score or selector authority.
- Validation commands: campaign adapter and UI fixture tests.
- Status: COMPLETE

### M8 — Bounded Source Intelligence graph

- Objective: visualize source descriptors, proof/currentness/lifecycle, and
  capability state through bounded progressive graph neighborhoods.
- Files/areas: source summary/graph adapters and graph UI.
- Acceptance criteria: depth/node/edge ceilings, deterministic IDs/order,
  stale/unavailable/ambiguous proof visible, no raw source payload, fallback
  list/table.
- Validation commands: source graph tests and synthetic 250/1000-node bounds.
- Status: COMPLETE

### M9 — Sanitized Findings view

- Objective: display owner-local finding metadata and dossier readiness only.
- Files/areas: findings adapter/view and privacy fixtures.
- Acceptance criteria: explicit DTO allowlist; no arbitrary paths, raw
  evidence, secrets, source, bodies, traces, or customer values.
- Validation commands: findings redaction and browser DOM/console leakage tests.
- Status: IN_PROGRESS

### M10 — Security, privacy, accessibility, failure hardening

- Objective: adversarially qualify the new localhost attack surface.
- Files/areas: all server/UI boundaries and security corpus.
- Acceptance criteria: traversal/Host/Origin/method/symlink/XSS/oversized,
  malformed, unavailable, reconnect, shutdown, missing-build, port-collision,
  keyboard/ARIA/reduced-motion cases pass; no Critical/High remains.
- Validation commands: complete Control Center focused suite plus browser
  accessibility and safety checks.
- Status: NOT_STARTED

### M11 — Performance and determinism qualification

- Objective: measure server/adapter/UI graph bounds without weakening authority.
- Files/areas: benchmark fixtures, reports, graph layout/limits.
- Acceptance criteria: documented cold start/route/list/timeline/graph/bundle/
  memory/SSE measurements, deterministic repeat output, explicit limits, no
  unbounded polling or sensitive global cache.
- Validation commands: bounded performance/determinism tests and build.
- Status: NOT_STARTED

### M12 — Whole-repo integration, docs, continuity, and push

- Objective: integrate the Control Center without weakening existing gates and
  close the task truthfully.
- Files/areas: root scripts/gate inventory as justified, docs, `.agent`.
- Acceptance criteria: all prior gates, nested package checks, local/clean
  E2E, full regression, privacy review, clean checkout, terminal v2 records,
  non-forced push, and `HEAD == origin/main`.
- Validation commands: current full quality/clean/agent/project suites plus
  canonical full Playwright and Control Center E2E.
- Status: NOT_STARTED

## Validation Strategy

Use layers: pure DTO/adapters; loopback server integration; frontend
component/graph; local synthetic Playwright E2E; then existing Nightwatch
typecheck/hardening/compatibility/local/clean gates and full regression. Keep
all runs serial where fixtures or safety state could race. Record exact counts,
skips, failures, bundle/network findings, graph limits, and receipts in STATE
and REPORT. No validation may contact DEV/NEXT/production or sibling repos.

## Decision Log

- 2026-08-26 — Start from current synchronized `main` and a fresh local
  implementation branch, not the planning ref; evidence: origin is unchanged
  at `8feea00` and the prior task is terminal; consequence: the planning
  branch remains untouched and task continuity has a new identity.
- 2026-08-26 — Use an isolated nested React/Vite package and built-in
  `node:http`; reason: root Vue 2 has no application imports and the server
  surface should remain dependency-light; consequence: core runtime stays
  independent of frontend dependencies.
- 2026-08-26 — Preserve domain services/stores as authority and make SSE
  advisory; reason: current readiness/evidence/source/campaign models already
  encode currentness and safety; consequence: adapters project, never parse
  CLI output or create a dashboard database.

## Discoveries

- Current local Node is `22.22.1`; clean gate uses a dynamically resolved
  Node 20 package because no system Node 20 binary is installed.
- The current root has no general HTTP server, no application UI, and no
  React/Vite dependency; the nested package boundary is therefore real rather
  than a migration shortcut.

## Deferred Work

- Execution/mutation controls, richer artifact/trace/screenshot views,
  multi-user auth, remote/LAN hosting, database/index persistence, and graph
  engine migration remain separate future authorizations.
- Any external CI billing/platform limitation will be reported, never treated
  as local PASS.

## Completion Criteria

All M0–M12 are terminal; the local loopback UI/server exposes the seven
approved views through versioned whitelist DTOs; no execution/mutation/raw
source/secret/arbitrary-path authority exists; security/privacy/accessibility/
performance and synthetic E2E suites pass; existing root and clean gates are
not weakened; docs and v2 task records match the implementation; and the
validated implementation plus closure docs are pushed to synchronized clean
`origin/main` without force.
