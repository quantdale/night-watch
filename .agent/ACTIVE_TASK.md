# Active Task

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Phase: SYSTEM_MAP_V2_TRANSPORT_C15C_V1
Title: C-15c System Map V2 HTTP Transport + Complete Operator UI
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-system-map-v2-transport-c15c-v1
Starting SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
Last validated implementation SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
Last checkpoint: predecessor C-07 certified at exact-head GitHub run 33817429249
Current milestone: M1 closing — scaffolding written before any gate battery; M2, M3 and M4 implemented and verified in the working tree
Next action: commit the scaffolding, then M5 — the C-15c suite, registration in both manifests, and the hardening rule
Authorization class: NIGHTWATCH_SYSTEM_MAP_V2_TRANSPORT_C15C_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LAST_VALIDATED_IMPLEMENTATION_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LAST_DOCUMENTATION_CHECKPOINT_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SYSTEM_MAP_V2_TRANSPORT_C15C_V1_STATUS: IN_PROGRESS

## Routing and safety

C-15c carries the C-15b System Map V2 model over HTTP and gives the operator a
UI that can navigate it. It grants the map NO authority it did not already
have: every level and query answer carries `executionAuthority: NONE` and
`mutationAuthority: NONE`, and the transport is GET/HEAD only.

V2 segments parse before the v1 prefix check so no v1 path is reinterpreted.
Unknown level and query segments parse to `unknown` rather than to a nearest
match. The query allowlist is exactly `focus`.

The change is really about two rendering rules. `MUTATION_CAPABLE_ROUTES`
truncates with `total: null` and `dropped: null`, because the upstream
population total is unknown and a drop count needs a total; both render as
"unknown", never as `0`, because a `0` would tell the operator they had seen
everything. `OBSERVED_PRODUCTION_PATHS` returns zero nodes with
`measurement: UNMEASURED`; the UI names that as an absence of measurement
rather than presenting an empty list that reads as a clean result.

Zero production observation exists because none is authorized. C-10's
production-store exclusion is visible in the output as an absence the UI must
name. Production contacts 0, NEXT contacts 0, DEV requests 0, credentials 0,
sibling writes 0. C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-system-map-v2-transpo-6bb0f1cf`; the canonical checkout is
never used for implementation.
