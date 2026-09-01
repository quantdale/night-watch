# Task State

## Identity

Task ID: nightwatch-php-readonly-proof-c06-v1
Phase: PHP_READONLY_PROOF_C06_V1
Status: IN_PROGRESS
Starting SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
Branch: session/nightwatch-php-readonly-proof-c0-4d9beb32
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
LAST_VALIDATED_IMPLEMENTATION_SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PHP_READONLY_PROOF_C06_V1_STATUS: IN_PROGRESS

## Objective

Replace the eleven-row hand-catalog read-only authority for `ripple-api` PHP
routes with a mechanically derived, fail-closed two-witness proof rooted at the
route's fully resolved middleware pipeline plus handler, classified through a
versioned data-only effect-kind vocabulary, with the achieved count reported as
an observation rather than gated against a numeric floor.

## Current Milestone

M8 — validation and closure.

## Completed Milestones

- M1 — `src/core/source/effectVocabulary.ts`: eight effect kinds, per-kind
  owner-approved admission policy, identifier tables seeded from the measured
  `ripple-api` wrapper surfaces, dynamic-dispatch and control-construct lists,
  analyzer bounds, deterministic digest.
- M2 — `src/core/source/phpPipeline.ts`: route-provider attachment table,
  per-route routing flags, ordered resolved pipeline, fail-closed ambiguity.
- M3 — `src/core/source/phpEffectClosure.ts`: bounded walk over pipeline
  entrypoints plus handler; same-file recursion only; categorical refusals.
- M4 — `src/core/source/readOnlyProof.ts`: kind-diverse, effect-mandatory
  lattice with join, inventory and pipeline preconditions.
- M5 — discovery wiring; descriptor `v4 → v5`; counters read the proven
  operations; the catalog no longer classifies.
- M6 — `tests/unit/c06PhpReadOnlyProof.test.ts`, 38 cases: all eight required
  negative cases with zero false positives plus positive non-triviality.
- M7 — real read-only measurement over the approved universe.

## Work In Progress

Nothing is partially implemented. The remaining work is the closure sequence:
full gate at a committed checkpoint, then the documentation closure commit and
integration.

## Exact Next Action

Run `npm run gate:local` at this committed checkpoint; on a green receipt,
write the closure commit that flips the task to COMPLETE and records this
checkpoint as `LAST_VALIDATED_IMPLEMENTATION_SHA`, then integrate through
`node bin/nightwatch-session.mjs integrate`.

## Starting evidence

- Base SHA `93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57`; `HEAD == origin/main`;
  canonical checkout clean; `npm run session:status` verdict `PASS`.
- `.agent/ACTIVE_TASK.md` was `COMPLETE` for `nightwatch-openapi-admission-c02a-v1`,
  so no in-progress task was pre-empted.
- C-06 is the head of the corrected critical path
  (`INDEPENDENT-REVIEW` §10: `C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 →
  C-12 → C-13 → C-14`); its predecessors are COMPLETE and it requires no
  external authorization.

## Measurements

All figures measured read-only from current source. No figure is a target.

| figure | before | after |
|---|---|---|
| operations projected | 814 | 814 |
| operations truncated | 0 | 0 |
| `READ_ONLY_PROVEN` | 5 | 0 |
| mutation-capable | 548 | 549 |

Per repository, after:

- `mobingilabs/ripple-api` — 223 operations; proof states 222
  `MUTATION_CAPABLE`, 1 `UNKNOWN`; classifications 143
  `PROVEN_MUTATION_CAPABLE`, 79 `CONDITIONAL_MUTATION`, 1 `UNSUPPORTED`.
  First disqualifying kind: 79 `EXTERNAL_CALL`, 72 `DATA_WRITE`, 71
  `CACHE_WRITE`. Effect ledger occurrences: `PURE_READ` 7,506,
  `UNCLASSIFIED` 15,232, `DATA_WRITE` 272, `EXTERNAL_CALL` 230,
  `CACHE_WRITE` 150. 6,114 distinct unclassified callee identities.
- `alphauslabs/blueapi` — 591 operations; 406 `MUTATION_CAPABLE`, 185
  `READ_ONLY_SINGLE_WITNESS`; no effect analyzer exists, so all 591 are
  `EFFECT_CLOSURE_ANALYZER_ABSENT` and every one is `DENIED`.

Source facts behind the F-01 counterexample: `Routing.yaml:488-491` sets
`x-header: true` by default and exactly one route (`get:/version` at
`:505-513`) overrides it; `RouteProvidor.php:73-76` attaches the
subscription middleware under that flag;
`MarketplaceSubscriptionMiddleware.php:26` has no method guard and
`:100-119` performs an outbound call.

## Files Changed

Added: `src/core/source/effectVocabulary.ts`, `phpPipeline.ts`,
`phpEffectClosure.ts`, `readOnlyProof.ts`;
`tests/unit/c06PhpReadOnlyProof.test.ts`;
`tests/helpers/readOnlyProofFixtures.ts`, `tests/helpers/phpPipelineFixture.ts`;
`openspec/changes/nightwatch-php-readonly-proof-c06-v1/{audit,proposal,design,tasks}.md`
and `specs/php-readonly-proof/spec.md`;
`.agent/tasks/nightwatch-php-readonly-proof-c06-v1/{SPEC,PLAN,STATE,REPORT}.md`.

Modified: `src/core/source/surfaces.ts`, `src/core/source/surfaceTypes.ts`;
`tests/unit/phase25SurfaceDiscovery.test.ts`,
`tests/unit/phase25SyntheticCampaign.test.ts`,
`tests/unit/phase26SyntheticCampaign.test.ts`,
`tests/unit/controlCenterAdapters.test.ts`,
`tests/unit/controlCenterAuthorityIntegration.test.ts`,
`tests/browser/controlCenterBrowser.browser.ts`;
`docs/DECISIONS.md`, `docs/CURRENT_STATE.md`, `.agent/ACTIVE_TASK.md`,
`.agent/EXECUTION_PROMPT.md`, and the master-plan `tasks.md` checklist.

No file was deleted; `## Declared Deletions` is NONE.

## Validation Ledger

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS (offline structural invariants hold).
- `npm run handoff:check` — PASS.
- `tests/unit/c06PhpReadOnlyProof.test.ts` — 38/38 passed.
- Adjacent source suites (phase25 discovery, phase25 synthetic campaign,
  phase26 synthetic campaign, phase27 response flow, Control Center adapters,
  Control Center authority integration, eligibility census, source inventory
  completeness) — passed.
- Full canonical regression — 2,809 tests; one legitimate fixture failure
  (`phase25SyntheticCampaign`) was repaired by giving the synthetic repository
  the route provider the new proof requires, then re-run green.
- `npm run gate:local` — to be recorded at the committed checkpoint.

## Decisions Made During This Task

- D-C06-1 — C-06 delivers the PHP lane only. `W-EFFECT_RPC` (Go/gRPC) and
  `W-DECLARED_VERB` (protobuf) belong to C-03 and C-02b; their absence is
  reported as `UNKNOWN`, never as a pass, and never silently satisfied by
  another witness.

## Discoveries

- The review's F-01 counterexample is real and mechanically reachable in the
  current source: `RouteProvidor.php` attaches
  `MarketplaceSubscriptionMiddleware` and `MicroHttpHeaderMiddleware` together
  under the per-route `x-header` flag, and that middleware's `__invoke` has no
  HTTP-method guard and performs an outbound `curl` to an external host.
- `readOnlyClassification()` is currently computed at parse time inside
  `routeOperation()`, before any file is read. A closure-based proof needs the
  join state and the file inventory, so classification must move to the
  post-join stage of `discoverSourceSurfaces`.

## Blockers

None.

## Safety Events

None. Company repositories have been read only, through the existing confined
read-only access path; no environment contact of any kind has occurred.

## Deferred / Follow-Up

None recorded yet.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-php-readonly-proof-c0-4d9beb32`
2. `node bin/nightwatch-session.mjs claim --task nightwatch-php-readonly-proof-c06-v1 --adopt`
3. Read this `STATE.md`, then `PLAN.md` "Milestones".
4. Continue from "Exact Next Action".

## Completion Snapshot

Not complete.
