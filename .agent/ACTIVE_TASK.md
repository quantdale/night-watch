# Active Task

Task ID: nightwatch-control-center-readonly-v1
Phase: CONTROL-CENTER-READONLY-V1
Title: Nightwatch Control Center — Read-Only Local V1
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-readonly-v1
Starting SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
Last validated implementation SHA: 867a707d820b8ddc33beebed88fd82991e26827b
Last checkpoint: M7 — campaign view, eight UI tests, and rendered unavailable-campaign smoke passed at 867a707.
Current milestone: M8 — Bounded Source Intelligence graph.
Next action: Wire source surfaces and graph DTOs into a bounded progressive view with proof/currentness/lifecycle rollups, table fallback, and explicit unavailable or stale states.
Authorization class: CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
LAST_VALIDATED_IMPLEMENTATION_SHA: 867a707d820b8ddc33beebed88fd82991e26827b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 867a707d820b8ddc33beebed88fd82991e26827b
LIVE_HEAD_AUTHORITY: GIT

## Routing and safety

This campaign is local/loopback/read-only and synthetic-only. No DEV/NEXT/
production contact, auth-state read, product observation, mutation, database/
datastore/cloud/infrastructure operation, Alphaus write, publication/message/
issue creation, canonical promotion, browser control, child-process execution
from HTTP, or AI-driven runtime execution is authorized. Phase 24 and all
existing domain models remain authoritative. Raw source, literal payloads,
credentials, cookies, authorization strings, customer values, raw bodies,
traces, and arbitrary paths must not enter task files, diagnostics, UI DTOs,
findings, or Git.

## Resume recipe

Read this route, then the task SPEC, PLAN, and STATE. Continue the exact next
action from STATE, update the waypoint after each milestone, and preserve the
loopback/read-only/whitelist/source-authority/owner-scope constraints.
