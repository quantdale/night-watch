# Active Task

Task ID: nightwatch-eig-prioritization-c16-v1
Phase: EXPECTED_INFORMATION_GAIN_C16_V1
Title: C-16 Expected Information Gain + Orphaned Ownership Closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-eig-prioritization-c16-v1
Starting SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Last validated implementation SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Last checkpoint: both orphans assigned to C-16 and implemented — G-16 as a one-derived-figure-source ledger with four live figures tagged in docs/CURRENT_STATE.md, and EIG as six bounded integer factor levels with an exact rational score and total tie-breaking; 37/37 suite, 8/8 negative probes, canonical regression 3,556/3,543/13/0
Current milestone: M8 — validation, integration, exact-head CI and closure
Next action: re-run gate:local and then gate:clean now that the task scaffolding is complete, then integrate by verified fast-forward and observe exact-head CI
Authorization class: NIGHTWATCH_EXPECTED_INFORMATION_GAIN_C16_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LAST_VALIDATED_IMPLEMENTATION_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXPECTED_INFORMATION_GAIN_C16_V1_STATUS: IN_PROGRESS

## Routing and safety

C-16 resolves two requirements that belonged to no campaign, then implements a
bounded, deterministic, explainable LOCAL prioritisation.

The two orphans are UNRELATED except in being orphaned, and the master ledger
row's phrasing — "G-16 and EIG owners" — invites reading them as one
prioritisation concern. Reading it that way would have produced an EIG module
and left the documentation-truth requirement unimplemented, so they are
recorded and implemented separately.

G-16's authoritative definition is "stale duplicate figures in durable docs",
fixed by ONE DERIVED FIGURE SOURCE, asserted as no document containing a census
figure absent from the current ledger. Its gap-matrix row records that manual
correction was considered and REJECTED because it recurs, so the fix must be
mechanical; and it states the harm as "future agents will use wrong numbers",
which is exactly the risk this overnight campaign has been creating by writing
measured figures into docs/CURRENT_STATE.md all night.

EIG is design 9.2's scoring model. The formula is kept in SHAPE and refused in
arithmetic, because encoding it literally fails two requirements at once: a
float score makes the ORDERING depend on rounding, and a multiplicative form
turns a single zero factor into a deletion. So every factor is a bounded
integer level, the score is an exact rational never divided, ordering
cross-multiplies integers, and each factor's UNKNOWN sits strictly between its
minimum and maximum — because a zero DELETES a target and a maximum PROMOTES
one, and "we do not know" is neither. Ties break on target id for a total
order.

A HIGH SCORE GRANTS NOTHING: not admission, not DEV execution, not production,
not replay, not credentials, not environment access. EIG orders what safety has
already admitted and cannot widen it, which is why it takes no admission input
and exposes no gate. The projection carries grantsAuthority false as data.

No runtime contact. No production, NEXT or DEV request. C-12 remains NOT
AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-eig-prioritization-c1-20849857`; the canonical checkout is
never used for implementation.
