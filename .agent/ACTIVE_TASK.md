# Active Task

Task ID: nightwatch-php-readonly-proof-c06-v1
Phase: PHP_READONLY_PROOF_C06_V1
Title: Nightwatch PHP Read-Only Proof (C-06)
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-php-readonly-proof-c06-v1
Starting SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
Last validated implementation SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
Last checkpoint: all eleven required quality-gate groups passed locally and again under the clean Node 20 gate at 7ce2cf91a00f1916ea1e04790dc395a809ef8727, with a 2,809-test canonical regression and the 38-case C-06 corpus green
Current milestone: COMPLETE / STOP — M1 through M8 are closed
Next action: STOP — C-06 is complete; do not begin another campaign in this task, and do not run any implementation session in the canonical checkout
Authorization class: NIGHTWATCH_PHP_READONLY_PROOF_C06_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
LAST_VALIDATED_IMPLEMENTATION_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PHP_READONLY_PROOF_C06_V1_STATUS: COMPLETE

## Routing and safety

C-06 replaces the eleven-row hand-catalog read-only authority for `ripple-api`
PHP routes with a mechanically derived, fail-closed proof rooted at the route's
fully resolved middleware pipeline plus handler. The achieved
`READ_ONLY_PROVEN` count is reported as an observation; it is never a target,
and no mechanism that reduces it may be weakened to raise it.

C-06 delivers the PHP lane only. The Go/gRPC effect witness (C-03) and the
protobuf declaration witness (C-02b) are not implemented here; their absence is
reported as `UNKNOWN`, never as a pass. `W-SPEC` is barred from production
admission. `SOURCE_FACT (GENERATED_ARTIFACT)` OpenAPI evidence from C-02a
cannot independently grant a read-only effect proof.

C-06 grants no new product or runtime authority. No production, NEXT or DEV
contact, credential inspection, datastore, cloud/IAM/Kubernetes access,
sibling-repository write, or publication is authorized or used. Sibling Alphaus
repositories are read only, through the existing confined read-only access
object.

All work happens in the owned session worktree
`session/nightwatch-php-readonly-proof-c0-4d9beb32`; the canonical checkout is
never used for implementation.
