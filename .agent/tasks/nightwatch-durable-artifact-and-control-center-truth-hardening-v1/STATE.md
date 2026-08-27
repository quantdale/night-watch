# Task State

## Identity

Task ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Phase: DURABLE-ARTIFACT-AND-CONTROL-CENTER-TRUTH-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
Last validated implementation SHA: 6817af1d67b5467ca3873a62bb0a36d790940e4e
Last substantive checkpoint SHA: 6817af1d67b5467ca3873a62bb0a36d790940e4e
STARTING_SHA: 42ea9723c10f60cc02c663748c493c6c34f73116
LAST_VALIDATED_IMPLEMENTATION_SHA: 6817af1d67b5467ca3873a62bb0a36d790940e4e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6817af1d67b5467ca3873a62bb0a36d790940e4e
LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
PHASE_DURABLE_ARTIFACT_AND_CONTROL_CENTER_TRUTH_HARDENING_V1_STATUS: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main
Last checkpoint: 2026-08-27 — M2 strict runtime-validation checkpoint
`6817af1d67b5467ca3873a62bb0a36d790940e4e`; M3/M4 evidence is staged for checkpoint.

## Objective

Restore strict durable dossier acceptance and conservative, single-authority
Control Center source-currentness while preserving all valid historical
artifacts and permanent safety boundaries.

## Current Milestone

M3 — facade-wide mutation audit and currentness convergence.

## Completed Milestones

- M0 — takeover, activation, and exhaustive tracked-file audit. The fresh
  NUL-safe manifest reviewed every tracked regular path and the clean baseline
  quality gate passed.
- M1 — pre-fix red-team reproduction. Producer-built v1/v2 dossiers were
  independently mutated through both owning validators and the facade; raw,
  authority, projected, and normal collector currentness paths were exercised
  across all required freshness multisets and permutations.
- M2 — strict dossier runtime validation. A shared bounded runtime boundary
  now validates producer-shaped v1/v2 dossiers, delegates semantic evidence to
  its owning validators, rejects malformed nested records/prototypes/unknown
  fields, and preserves valid READY, INCOMPLETE, and UNRESOLVED controls.
- M3 — facade-wide bounded mutation audit and currentness convergence. Every
  registered static kind has a canonical synthetic fixture and bounded nested
  mutation disposition; a compatible project-health validator repair closed
  two adjacent derived-truth gaps; one shared conservative findings reducer
  now owns whole-dossier currentness.

## Work In Progress

Control Center integration and final acceptance. The strict dossier facade,
facade-wide audit, shared currentness reducer, malformed-store handling,
authority-snapshot pre-gate, generation change, server restrictions, and
snapshot refresh failure behavior are validated. UI/browser and full native
acceptance evidence remain.

## Exact Next Action

Run `npm run control-center:ui:typecheck`, `npm run control-center:ui:test`,
`npm run control-center:ui:build`, and the built-server browser qualification;
then execute the full native acceptance cone and record exact skips/receipts.

## Files Changed

Task records, the focused synthetic probe test and machine-readable
`BEFORE_PROBES.json`/`FACADE_AUDIT.json`, plus the shared strict dossier runtime
validator, v1/v2 dossier validator delegation, the shared findings currentness
reducer, compatible project-health derived-truth checks, collector snapshot
validation, and Control Center integration tests. No external state changed.

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
- M2 focused validation after the implementation and compatibility repairs:
  `npx playwright test tests/unit/durableArtifactTruthHardening.test.ts
  --project=nightwatch --workers=1`: `3 passed / 0 failed`; the v1 `40/40`
  and v2 `50/50` mutation rows are rejected by both owning and facade paths,
  while the v2 `UNRESOLVED` control is accepted.
- M2 compatibility suites:
  `npx playwright test tests/unit/phase15pArtifactValidation.test.ts
  --project=nightwatch --workers=1`: `23 passed / 0 failed`;
  `npx playwright test tests/unit/phase12SemanticTriage.test.ts
  tests/unit/phase15pTriageDossierPipeline.test.ts --project=nightwatch
  --workers=1`: `55 passed / 0 failed`;
  `npx playwright test tests/unit/controlCenterFindingsAuthority.test.ts
  tests/unit/controlCenterAdapters.test.ts --project=nightwatch --workers=1`:
  `12 passed / 0 failed`;
  `npx playwright test tests/unit/phase15pPrivacyAuthority.test.ts
  --project=nightwatch --workers=1`: `23 passed / 0 failed`.
  `npm run typecheck`: PASS; `npm run hardening:check`: PASS.
- The strict boundary did not change dossier wire versions or any source,
  semantic, replay, selector, or Phase-24 identity. The facade version was
  audited and remains `nightwatch.artifact-validation.private.v1`: no
  load-bearing fingerprint/cache/currentness consumer exists in `src/` or
  `tests/`, so a version bump would add identity drift without a consumer.
- M3 facade audit: all `14/14` registered kinds accepted their canonical
  producer-shaped fixtures; all `55/55` bounded nested mutations were rejected;
  all `55` original inputs remained byte-for-byte unchanged. The reserved
  `replay-result-envelope` registration path rejected its malformed synthetic
  payload with `ARTIFACT_REPLAY_ENVELOPE_INVALID`.
- The adjacent project-health audit found a current producer shape that emits
  additive `analyzer`, `verification`, and `externalCiClassification` sections
  plus per-target currentness facts not checked against aggregate counts/lists.
  The validator now admits those sections compatibly and checks the derived
  relationships; the canonical fixture and both mutations pass/reject as
  expected.
- Callsite audit found the facade at the owner-local findings read path and
  direct dossier validation at AI review, triage pipeline, campaign readback,
  shadow compatibility, and dossier-kind dispatch. The campaign casts are
  immediately preceded by `parseBugDossierV2`/`validateBugDossier`; no shallow
  unknown-to-trusted consumer or facade-version consumer was found.
- After convergence, the representative currentness matrix produced: all
  current-class non-empty members → `CURRENT`; any stale member without
  unknown → `SOURCE_STALE`; any `UNKNOWN`, malformed freshness, or empty list →
  `SOURCE_UNAVAILABLE`. This held across raw, authority, projected, and normal
  collector paths, all tested permutations, duplicate candidates, and the
  256-member bound.
- Control Center integration: malformed JSON and malformed JSON-value dossiers
  leave valid rows sanitized under explicit `UNKNOWN`; malformed authority
  metadata is rejected to an explicit `UNAVAILABLE` collector response;
  changing source currentness changes the findings generation. Existing server
  and snapshot tests retain GET/HEAD, loopback, Host/Origin, body, SSE-advisory,
  and failed-refresh fallback proofs.

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

1. Run the built Control Center UI/browser qualification using synthetic
   fixtures only.
2. Execute the repository-native full acceptance cone, including clean Node20
   and canonical serial regression, and repair any introduced regression.
3. Update durable docs/OpenSpec/REPORT/STATE, commit, push, verify exact
   local/remote heads, and close the task with next action STOP.

## Completion Snapshot

Task is active; no completion claim is made.
