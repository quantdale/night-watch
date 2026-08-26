# Active Task

Task ID: nightwatch-control-center-authority-integration-v2
Phase: CONTROL-CENTER-AUTHORITY-INTEGRATION-V2
Title: Control Center Authority Integration + Whole-Repository Hardening
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-authority-integration-v2
Starting SHA: ccbb57721d99020667881481411aa961d12229e5
Last validated implementation SHA: e5ac2fff0f8840c80bb48a57ca0df56cba39c90d
Last checkpoint: M0 — fresh task activation and baseline preflight at ccbb577.
Current milestone: M1 — authority inventory and reader architecture.
Next action: Map the authoritative run, source, campaign, and findings readers before implementation.
Authorization class: CONTROL_CENTER_LOCAL_READ_ONLY_AUTHORITY_INTEGRATION_AND_HARDENING
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ccbb57721d99020667881481411aa961d12229e5
LAST_VALIDATED_IMPLEMENTATION_SHA: e5ac2fff0f8840c80bb48a57ca0df56cba39c90d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e5ac2fff0f8840c80bb48a57ca0df56cba39c90d
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
