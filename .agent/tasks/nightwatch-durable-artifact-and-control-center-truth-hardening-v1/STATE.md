# Task State

## Identity

Task ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Phase: DURABLE-ARTIFACT-AND-CONTROL-CENTER-TRUTH-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
Last validated implementation SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
Last substantive checkpoint SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
STARTING_SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
LAST_VALIDATED_IMPLEMENTATION_SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
PHASE_DURABLE_ARTIFACT_AND_CONTROL_CENTER_TRUTH_HARDENING_V1_STATUS: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main
Last checkpoint: 2026-08-27 — M1 pre-fix probes passed and the before ledger
was captured; no production behavior edit preceded capture.

## Objective

Restore strict durable dossier acceptance and conservative, single-authority
Control Center source-currentness while preserving all valid historical
artifacts and permanent safety boundaries.

## Current Milestone

M2 — strict dossier runtime validation.

## Completed Milestones

- M0 — takeover, activation, and exhaustive tracked-file audit. The fresh
  NUL-safe manifest reviewed every tracked regular path and the clean baseline
  quality gate passed.
- M1 — pre-fix red-team reproduction. Producer-built v1/v2 dossiers were
  independently mutated through both owning validators and the facade; raw,
  authority, projected, and normal collector currentness paths were exercised
  across all required freshness multisets and permutations.

## Work In Progress

Strict bounded dossier-validator implementation based on the captured false
accepts. The focused probe harness and its evidence ledger remain in the task;
no production behavior has been changed yet.

## Exact Next Action

Implement the shared bounded runtime checks for v1/v2 dossier fields and
nested authority-bearing structures, preserving the captured valid historical
controls and v2 UNRESOLVED case.

## Files Changed

Task records plus the focused synthetic probe test and machine-readable
`BEFORE_PROBES.json`. No production source, configuration, or external state
changed.

## Validation Ledger

- Pull: `git pull --ff-only origin main` advanced clean `main` to
  `42ea9723c10f60cc02c663748c493c6c34f73116`; no source files changed.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, Git `2.43.0`, Linux WSL2,
  system Chrome at `/opt/google/chrome/chrome`.
- Fresh tracked-file audit (2026-08-27): NUL-safe `git ls-files -z`; each path
  was lstat/read/hash reviewed; non-regular paths `0`; tracked/reviewed
  `1329/1329`; bytes `14492957`; newline lines `289822`; manifest digest
  `sha256:985856da8d5ab09f3ca752ee0857f3b5117854d297fe208fd56b5a32265cebc0`.
  The digest is over the ordered `path NUL fileSha256 NUL` manifest. The
  changed-since-planning review covered all `11/11` paths in
  `49034831377f243054261361b4d1a7d783c0fc4f`..`HEAD`; subsystem dispositions
  were recorded for every path (agent continuity `434`, source `407`, tests
  and gates `283`, current runtime/source authority `165`, parser/currentness
  `94`, campaign/triage/portfolio/Phase-24 authority `77`, corpus/fixtures
  `113`, UI/control center `50`, config/workflow/metadata `32`, durable
  docs/history `45`, safety/product boundary `35`, generated/lock metadata
  `1`).
- Baseline `npm run agent:check`: PASS with the two documented historical
  warnings (approved documentation checkpoint advance and 24 legacy v1 task
  records). `npm run agent:audit`: strict v2 task records have zero errors;
  legacy warnings are historical only.
- Baseline `npm run project:check`, `npm run hardening:check`,
  `npm run quality-gate:spec`, `npm run gate:inventory`, and `git diff --check`:
  PASS. `project:check` reported catalog count `1`, roundtrip `true`, Phase 8
  COMPLETE, and promotion authority `NONE`.
- Baseline `npm run gate:local`: PASS at
  `d732cc51b96e3cfbb2d836508ca395bc9838b7a3`; all 9 required groups passed;
  semantic compatibility `1888 passed / 13 skipped / 0 failed` out of `1901`,
  owner provenance `91 passed`, synthetic campaign `66 passed`.
- Focused pre-fix probe `npx playwright test
  tests/unit/durableArtifactTruthHardening.test.ts --project=nightwatch
  --workers=1`: `3 passed / 0 failed`. It captured v1 `40` mutations with
  `38` owning-validator and `37` facade false accepts; v2 `50` mutations with
  `43` false accepts through each path. It also captured `13` currentness
  rows/permutations; current+stale and current+unknown were reported as
  `CURRENT` by raw adapter, authority, projected adapter, and normal collector.
- The complete compact before ledger is
  `.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/BEFORE_PROBES.json`.

## Decisions Made During This Task

- Use the current pulled prompt/OpenSpec as the active campaign and create a
  fresh task; the completed source-proof task remains immutable history.
- Keep implementation LOCAL / SOURCE / SYNTHETIC only and do not read auth
  state or contact any Alphaus environment.

## Discoveries

- Live Git moved from the OpenSpec planning baseline `4903483` to
  `42ea9723c10f…` through documentation/OpenSpec planning changes only; the
  task activation checkpoint is pushed at `d732cc51b96e…` and local/remote
  heads agree.
- The active prompt is a new implementation handoff; no durable-artifact
  implementation files existed before M1.
- The exhaustive review found no unreviewed tracked path and no non-regular
  tracked path. The baseline is clean and suitable for before/after probes.
- `correlateSourceChanges` can independently emit relevance `UNKNOWN` and
  confidence `UNRESOLVED` while retaining a source freshness value. The
  Control Center field is therefore treated as freshness-only for this task;
  causal relevance/confidence remain separate and are not silently promoted.
- Confirmed P0 dossier false accepts are caused by TypeScript-only assumptions:
  v1's owning validator checks safety/privacy/scope but not most persisted
  fields; v2 checks root/selected nested prototypes and enums but not complete
  nested shape/types. The facade composes those shallow paths, so it inherits
  the accepted malformed values.
- Confirmed duplicated optimistic reducers are the private
  `sourceCurrentness` functions in `findingsAuthority.ts` and
  `findingsAdapter.ts`; each returns `CURRENT` when a member is current.

## Blockers

None.

## Safety Events

NONE — no DEV/NEXT/production, auth, data, infrastructure, network, sibling
write, publication, AI, or product operation occurred.

## Deferred / Follow-Up

No new follow-up. Existing owner-frozen infrastructure/data and unrelated
future campaigns remain outside scope.

## Resume Recipe

1. Implement bounded shared runtime validation for dossier v1/v2 and run the
   focused mutation suite.
2. Repair any focused regressions while keeping valid v1/v2 and UNRESOLVED
   producer outputs accepted.
3. Audit the facade identity/callsites before converging currentness.

## Completion Snapshot

Task is active; no completion claim is made.
