# Active Task

Task ID: phase-9b-r1-auth-refreshed-dev-semantic-acceptance
Phase: 9B-R1-CONTAINED-DEV-SEMANTIC-ACCEPTANCE
Title: Nightwatch Phase 9B-R1 — Auth-Refreshed Contained DEV Semantic Acceptance Retry
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-9b-r1-auth-refreshed-dev-semantic-acceptance
Starting SHA: 05def7abf92818c7de48fba658579397b236def7
Last validated implementation SHA: cdfdf314839fd782a962e4096b68b32641a93db2
Current milestone: M0 — bootstrap + harness integrity + R1 task records (IN_PROGRESS)
Last checkpoint: 2026-08-16 — CASE D (HEAD == origin/main == 05def7a, clean);
harness source byte-identical to the validated cdfdf31; original Phase 9B
task BLOCKED historical (D-56), not reopened; R1 strict-v2 records created;
next: ACTIVE_TASK routing (this file), R1 docs checkpoint + exact CI, then
freshness/auth gates and ONE launcher invocation.
Next action: Commit the R1 docs checkpoint (this file + R1 task records),
push fast-forward, wait exact green CI (incl. the Phase 9B harness matrix
step); then fresh remote source check + re-derivation + auth structural
precheck; then ONE `npm run phase9b:real` invocation.
Authorization class: PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

ONE fixed journey ripple-common-exchange-read x FIRST + ONE fresh-context
REPLAY against https://appdev.alphaus.cloud/ripple/ only, using the
already-validated Phase 9B harness (cdfdf31 semantics; NO source changes,
NO reimplementation): fresh read-only remote source truth + fresh
derivation of ripple.common-exchange.read.real-source-shape bound to the
exact approved snapshot (resolver exposed ONLY for the selected target),
structural/boolean auth validation of the human-refreshed DEV state (NO
auth:capture, NO credentials), exact-head CI gate, ONE
`npm run phase9b:real` invocation, safe semantic receipts with required
zero counts, post-run privacy audit + safety vector + sibling integrity,
safe docs closure (D-57), final exact CI, 96-item report, STOP. FORBIDDEN:
reuse of the original Phase 9B authorization; another automatic retry; a
second journey; fallback; random exploration; new endpoint authority; NEXT;
production; mutation; POST/PUT/PATCH/DELETE; DB/infra; deployment binding;
screenshots; authenticated traces; raw-body persistence; DOM/text capture;
AI; Alphaus writes; selfDev/promotion/catalog; variant-B adoption;
publication; any harness patching after the launcher invocation.

## Continuity

STARTING_SHA: 05def7abf92818c7de48fba658579397b236def7
LAST_VALIDATED_IMPLEMENTATION_SHA: cdfdf314839fd782a962e4096b68b32641a93db2
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cdfdf314839fd782a962e4096b68b32641a93db2
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9B_R1_STATUS: IN_PROGRESS
PHASE_9B_STATUS (historical, unchanged): BLOCKED
PHASE_9B_DEV_RESULT (historical, unchanged): NOT_PROVEN
PHASE_9A_1_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (narrative, unchanged): COMPLETE_LOCAL_SYNTHETIC
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## STOP

STOP conditions: any pre-launcher gate failure (freshness / derivation /
resolver RESOLVED / exact-head CI / auth structural + expiry / proxy /
canonical target / traces/screenshots) -> PHASE_9B_R1_BLOCKED_* BEFORE the
launcher; auth failure between FIRST and REPLAY ->
PHASE_9B_R1_BLOCKED_AUTH_EXPIRED_BEFORE_REPLAY; semantic nondeterminism ->
PHASE_9B_R1_BLOCKED_SEMANTIC_NONDETERMINISM; after the ONE launcher
invocation -> STOP (no patching; any R2 requires a fresh owner
authorization).
