# Active Task

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Phase: SYSTEM_MAP_V2_TRANSPORT_C15C_V1
Title: C-15c System Map V2 HTTP Transport + Complete Operator UI
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-system-map-v2-transport-c15c-v1
Starting SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
Last validated implementation SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
Last checkpoint: gate:clean and gate:local PASS at 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5 with clean-receipt clean-receipt:sha256:6c14424bbbeb876dbd3c6d95 and gate receipt receipt:sha256:4e6b059312e2281785e38400; siblingWrites 0; browser matrix 2/2 pass; all 15 acceptance rows PASS
Current milestone: COMPLETE / STOP — M1 through M7 are closed and all fifteen acceptance rows PASS
Next action: STOP — C-15c is COMPLETE and certified. The next authorized campaign is R-13 Overnight Endurance Certification.
Authorization class: NIGHTWATCH_SYSTEM_MAP_V2_TRANSPORT_C15C_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
LAST_VALIDATED_IMPLEMENTATION_SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
LAST_DOCUMENTATION_CHECKPOINT_SHA: 82e3a49da77e5e0d8b451697bad58f9af5aaa4e5
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SYSTEM_MAP_V2_TRANSPORT_C15C_V1_STATUS: COMPLETE

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
