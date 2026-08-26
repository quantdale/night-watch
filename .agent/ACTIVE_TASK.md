# Active Task

Task ID: nightwatch-control-center-authority-integration-v2
Phase: CONTROL-CENTER-AUTHORITY-INTEGRATION-V2
Title: Control Center Authority Integration + Whole-Repository Hardening
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-authority-integration-v2
Starting SHA: ccbb57721d99020667881481411aa961d12229e5
Last validated implementation SHA: 76f5de9b09cdba930d89c7b74247c6579232a436
Last checkpoint: M7 — bounded hygiene reporting repair at 76f5de9.
Current milestone: M8 — Integrated validation, docs, continuity closure, and synchronized push.
Next action: Run the remaining full M8 local/clean/full/UI/browser validation ladder on synchronized checkpoint 3c96c38; record exact results, close continuity truthfully, and verify clean HEAD == origin/main.
Authorization class: CONTROL_CENTER_LOCAL_READ_ONLY_AUTHORITY_INTEGRATION_AND_HARDENING
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ccbb57721d99020667881481411aa961d12229e5
LAST_VALIDATED_IMPLEMENTATION_SHA: 76f5de9b09cdba930d89c7b74247c6579232a436
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 76f5de9b09cdba930d89c7b74247c6579232a436
LIVE_HEAD_AUTHORITY: GIT
PHASE_CONTROL_CENTER_AUTHORITY_INTEGRATION_V2_STATUS: IN_PROGRESS

## Routing and safety

This campaign is local/loopback/read-only and synthetic-only. No DEV/NEXT/
production contact, auth-state read, product observation, mutation, database/
datastore/cloud/infrastructure operation, Alphaus write, publication/message/
issue creation, canonical promotion, browser control, child-process execution
from HTTP, or AI-driven runtime execution is authorized. Existing Nightwatch
domain authorities remain authoritative; the Control Center may only compose
bounded in-process readers and adapters over them. Raw source, literal
payloads, credentials, cookies, authorization strings, customer values, raw
bodies, traces, arbitrary paths, and owner-only findings must not enter task
files, diagnostics, UI DTOs, findings, or Git.

## Resume recipe

Read this route, then this task's SPEC, PLAN, and STATE. Continue the exact
next action from STATE, update the waypoint after each milestone, and preserve
the loopback/read-only/whitelist/source-authority/owner-scope constraints.
