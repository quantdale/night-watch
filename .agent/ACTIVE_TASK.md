# Active Task

Task ID: nightwatch-control-center-readonly-v1
Phase: CONTROL-CENTER-READONLY-V1
Title: Nightwatch Control Center — Read-Only Local V1
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-readonly-v1
Starting SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
Last validated implementation SHA: e6451092bf358988f23808b90b138e9dd195b50f
Last checkpoint: M6 — run/timeline/graph views, seven UI tests, advisory SSE test, and rendered empty-state smoke passed at e645109.
Current milestone: M7 — Campaign Intelligence view.
Next action: Wire campaign summary and coverage DTOs into a view that preserves model-level counts, coverage gaps, owner scope, and unavailable/source-currentness states without inventing scores.
Authorization class: CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
LAST_VALIDATED_IMPLEMENTATION_SHA: e6451092bf358988f23808b90b138e9dd195b50f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e6451092bf358988f23808b90b138e9dd195b50f
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
