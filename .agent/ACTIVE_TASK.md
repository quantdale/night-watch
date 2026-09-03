# Active Task

Task ID: nightwatch-system-map-v2-c15b-v1
Phase: SYSTEM_MAP_V2_C15B_V1
Title: C-15b System Map V2
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-system-map-v2-c15b-v1
Starting SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last validated implementation SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
Last checkpoint: M1 opened at the C-04 closure head 9ac83be with the 24-node UI ceiling and the 1,000-node contract maximum measured before any change
Current milestone: M1 — task record, OpenSpec change, measured baseline
Next action: Write the OpenSpec change, run `npm run agent:check` and `npm run handoff:check`, commit the M1 checkpoint, then begin M2 by versioning the source graph contract with a fact category and exact projection bounds
Authorization class: NIGHTWATCH_SYSTEM_MAP_V2_C15B_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_VALIDATED_IMPLEMENTATION_SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SYSTEM_MAP_V2_C15B_V1_STATUS: IN_PROGRESS

## Routing and safety

C-15b rebuilds the source-graph projection model and the graph view so
Nightwatch exposes whole-system topology and evidence status at the scale its
own contracts already permit. The Control Center backend architecture is kept;
what changes is the projection layer and the view.

The measured defect: `CONTROL_CENTER_LIMITS` permits 1,000 nodes and 2,000
edges, and `SourceGraphCanvas` draws at most 24 nodes and 48 edges on a fixed
three-column grid. The contract was never the constraint. Two quieter defects
matter more — the graph reports `truncated: boolean` with no counts, and its
nodes and edges have nowhere to carry a fact category, so C-03's SOURCE_FACT
bindings and C-04's INFERENCE edges would be indistinguishable once drawn.

Absolute invariants, all re-proven rather than inherited: the Control Center
stays GET/HEAD only; non-GET/HEAD returns 405; `executionAuthority: NONE` and
`mutationAuthority: NONE`; SSE accepts no commands; there is no execute
endpoint and no hidden POST; and the C-10 production findings store under
`$HOME/.nightwatch/prod-findings/` is never reachable through the Control
Center. C-15b is visibility, never execution.

Evidence is never upgraded in place and a join is never stronger than its
weakest input. `UNKNOWN` and `UNMEASURED` never become zero. The
observed-production-paths query legitimately returns empty because C-12 has not
run, and an empty result must never imply that it did.

No repository admission. No EIG prioritisation and no target-selection change;
G-16 and EIG ownership may be reconciled in planning only.

C-11 is unchanged. C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-system-map-v2-c15b-v1-19d4f1bd`; the canonical checkout is
never used for implementation.
