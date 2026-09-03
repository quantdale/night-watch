# Task State

## Identity

Task ID: nightwatch-universe-admission-hygiene-c05-v1
Phase: UNIVERSE_ADMISSION_HYGIENE_C05_V1
Status: IN_PROGRESS
Starting SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last validated implementation SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last substantive checkpoint SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-universe-admission-hy-418aba0f
Last checkpoint: baseline measured read-only at 210cd0c — 149 repositories discovered, 6 admitted, 143 unapproved; 1,745 operations (blueapi 1,181 / ouchan 341 / ripple-api 223); 10 of 18 persisted remote-tracking Git fields diverged from live; blueinternal openapiv2 measured at 51 operations and wave-api at 55 route keys
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_VALIDATED_IMPLEMENTATION_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Separate discovery from admission, make the owner-approved universe a single
authority, stop persisting mutable Git state as normative configuration, prove
at the read boundary that an unapproved repository is never read, and admit
exactly the two owner-named repositories.

## Current Milestone

M8 — integration and exact-head CI. M1 through M7 are complete and all three
local gates are PASS at `85dd8a6` with `siblingWrites: 0`.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured baseline.
- M2 — `src/core/source/universe.ts` is the single admission authority;
  `approvedScan.ts` projects from it and carries no allowlist of its own;
  `reconcileUniverseWithDependencyMap` throws on either direction of
  disagreement instead of silently intersecting.
- M3 — `RepoDefinition` no longer persists `branch`, `trackingSha`, `ahead`,
  `behind` or `dirty`; the pinned anchors `checkedOutSha` and `sourceMapSha`
  remain, because removing them would make every staleness check vacuously
  pass. `change:shadow` now observes live from local refs and additionally
  reports `pinnedSourceSha` and `movedOffPin`.
- M4 — the sibling-source boundary keeps a per-repository read ledger and
  enforces the owner-approved set itself; the intelligence CLI and the Control
  Center source authority both pass it, so the gate is live in the real paths.
- M5 — `alphauslabs/blueinternal` admitted for `openapiv2`: **51 operations**,
  through the existing `parseOpenApiRoutes`, no new parser.
- M6 — `mobingilabs/wave-api` admitted for `src`: **55 operations**, through
  the existing YAML route parser, no parser change.
- M7 — full population reported; the regression's 8 failures triaged and
  repaired: DEF-C05-4 (blueinternal's artifact was classified DIRECT_SOURCE
  rather than GENERATED_ARTIFACT) plus 7 brittle assertions in two classes.
  All three local gates PASS.

## Work In Progress

M8 — integration and exact-head CI observation.

## Exact Next Action

Integrate by verified fast-forward, then observe the exact-head GitHub Actions
run. Check that the CI synthetic receipt's skip count rises by no more than
C-02a's three real-source cases: the newly admitted blueinternal and wave-api
suites are deterministic against real checkouts, so any FURTHER skip in CI
would mean a newly admitted repository is silently unmeasured there. Then
reconcile project truth, close the REPORT ledger and release.

## Files Changed

- `.agent/tasks/nightwatch-universe-admission-hygiene-c05-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/**` — new
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-05

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS, `WORKSPACE_INTEGRITY_SATISFIED` |
| repository discovery census (read-only) | 149 git repositories at depth ≤ 3; 6 admitted; 143 unapproved |
| `nightwatch-intelligence source-gaps` at 210cd0c | 1,745 operations; blueapi 1,181 / ouchan 341 / ripple-api 223; limit 4,096; dropped 0; enumeration TRUNCATED; contentRead COMPLETE; state UNKNOWN; `remainingUnknown: true` |
| persisted vs live Git state, checkout-local fields | 18/18 accurate |
| persisted vs live Git state, remote-tracking fields | **10 of 18 diverged** — ouchan `behind: 25` vs live 310; ripple-ui 21 vs 74; blueapi 2 vs 15; ripple-api 0 vs 12; blue-sdk-go 1 vs 6 |
| `blueinternal/openapiv2/apidocs.swagger.json` | Swagger 2.0, 46 paths, **51 operations**, all with `operationId`, 84 definitions (historical estimate ~57 refuted) |
| `mobingilabs/wave-api` | PHP, 59 files, layout identical to ripple-api, **55 route keys** in the parser's existing form |
| **population after admission** | **1,851 operations** — blueapi 1,181 / blueinternal **51** / ouchan 341 / ripple-api 223 / wave-api **55**; exactly +106, `droppedOperations: 0` |
| **no eviction** | blueapi 1,181, ouchan 341, ripple-api 223 all unchanged; C-01's `sourceOperationCompleteness` no-eviction assertion passes |
| **completeness unchanged in kind** | enumeration still TRUNCATED, `remainingUnknown: true` — admitting source did not launder completeness into a clean number |
| static prediction vs parser output | predicted 51 and 55 from static measurement; parser produced exactly 51 and 55 |
| `change:shadow` after M3 | reports live `ouchan behind=310`, `ripple-ui 74`, `blueapi 15` (was 25 / 21 / 2); all eight `movedOffPin: false` |
| `tests/unit/c05UniverseAdmission.test.ts` | **28 passed / 0 failed** |
| C-01 + C-02a + C-06 + Control Center suites | 51 passed / 0 failed |
| negative probes Q1-Q11 | **11/11 DETECTED**, all restored, tree clean after each |
| canonical regression, first attempt at 18713e7 | **8 FAILED** — 1 genuine gap in this campaign's work, 7 brittle assertions; all repaired at 85dd8a6 |
| **canonical regression** at `85dd8a6` | **3,457 total / 3,444 passed / 13 skipped / 0 failed**, 0 failure blocks (baseline 3,428/3,415/13/0; delta +29 = 28 new C-05 cases + 1 added C-02a case; skips unchanged) |
| **`gate:local`** at `85dd8a6` | **PASS, all eleven required groups**, LOCAL, receipt `receipt:sha256:0cc29da4b4503cd981855940`; SEMANTIC_COMPATIBILITY 2,033/2,020/13/0; OWNER_PROVENANCE 91; SYNTHETIC_CAMPAIGN **767/767/0** with `deepContainmentLane: PROVEN` |
| **`gate:clean`** at `85dd8a6` | **PASS, all eleven required groups**, Node 20, `installResult: PASS`, **`siblingWrites: 0`**, `cleanBefore/cleanAfter: true`, `nodeModulesReused: false`; inner receipt `receipt:sha256:841e75dcd27b04660842fa24`, outer `clean-receipt:sha256:3832909fbab478cff4828f50` |

## Decisions Made During This Task

- Report 51 blueinternal operations rather than the historical ~57; the
  historical figure is preserved and refuted explicitly.
- Admit `mobingilabs/wave-api` through the existing YAML route parser with no
  parser change; its key form matches and the parser is indent-relative.
- Frame the persisted-Git-state defect as a divergence-detection failure, not a
  stale-value incident: the checkout-local fields are currently accurate, so
  "the data is stale" would be a false claim.

## Defects found

**DEF-C05-1 — `npm run change:shadow` was broken at HEAD, in both topologies.
PRE_EXISTING.** The script compiles the pure core with `tsc` and imported
`<out>/index.js`, but `baseline.ts`, `git.ts` and `selection.ts` had gained
imports from `../campaign`, `../process` and `../identity`, which moved tsc's
INFERRED root to `src/core` and the emitted entry to
`<out>/changeIntelligence/index.js`. Nothing detected it because no gate group
runs `change:shadow`. Repair: `--rootDir src` is pinned, so the emitted layout
is a function of the source path alone and an import from outside `src` fails
loudly instead of relocating the entry point.

**DEF-C05-2 — the repositories root was derived from the checkout location.
PRE_EXISTING, and forbidden by `AGENTS.md`.**
`resolve(nightwatchRoot, '../..')` resolves to `$HOME/.nightwatch` from a
session worktree, so every git call failed with `ENOENT` and the script could
not run there at all. A hardening rule already guarded exactly this class for
two other surfaces; `bin/change-intelligence.mjs` was never added to its list.
Repair: resolution goes through `DEFAULT_SIBLING_ROOT` with the standard
`NIGHTWATCH_REPOS_ROOT` override, and the rule now covers this surface.

**DEF-C05-4 — blueinternal's generated artifact was classified DIRECT_SOURCE.
CAMPAIGN_INTRODUCED, caught by this campaign's own regression.** Admitting
`blueinternal/openapiv2` without registering it in `GENERATED_ARTIFACT_ROOTS`
left its 51 operations qualified `DIRECT_SOURCE`, which would have presented
generated output as hand-written source AND bypassed the deny-only
production-admission gate that exists because a generated artifact can never
be the sole basis of a production read. Repair: registered, so the qualifier is
`GENERATED_ARTIFACT` and generation currency is explicitly `UNKNOWN` with
reason `GENERATION_CORROBORATOR_UNAVAILABLE` — no proto corroborator exists for
blueinternal, so currency is never silently CURRENT. This is the campaign's own
defect and is reported rather than quietly fixed.

**DEF-C05-3 — the shadow report published a provenance label it did not have.
PRE_EXISTING.** It emitted the persisted `trackingSha`/`ahead`/`behind` under
`freshness: LOCAL_TRACKING_REF_ONLY`, having read a literal rather than a ref.
The consequence was measurable, not latent: it reported `ouchan` as 25 behind
when it was 310 behind. Repair: those values are observed from local refs at
report time, so the label is now true.

## Process errors, recorded rather than buried

**Probing before committing destroyed uncommitted work, twice.** The C-05
negative probes use `git checkout --` to restore after each mutation. Run
against files whose C-05 changes were not yet committed, that "restore"
discarded the changes instead of reverting the probe. The first occurrence lost
the `types.ts`, `approvedScan.ts` and `bin/change-intelligence.mjs` edits; the
second lost a freshly added hardening rule, which then made a probe report NOT
DETECTED for the honest reason that the rule no longer existed. Both were
detected by verifying the restore rather than trusting it, and all lost work
was reconstructed and re-verified. The rule adopted, and followed for the rest
of the campaign: COMMIT, then probe. This is exactly the destructive-restore
hazard the repository's Git-safety rules name, and it is recorded because the
probe results would otherwise look like clean 11/11 evidence with no history.

## Discoveries

- `wave-api` resolves to `mobingilabs/wave-api`, not a top-level directory.
  Assuming the literal name would have failed.
- Three sibling-root-shaped directories sit beside the real org directories
  (`nightwatch-isolated-20-sibling-root`,
  `nightwatch-isolated-20-final-sibling-root`,
  `nightwatch-reliability-yield-and-state-protocol-v1`). They are outside the
  Nightwatch repository, so C-05 may only report them; R-13 §105 owns
  classifying fixture-vs-leak and no removal is authorized here.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

R-13 §105 owns the leftover sibling-root directories. A future reliability
campaign owns the 59 non-campaign infrastructure suites outside the gate
manifests.

## Resume Recipe

Read this STATE, then `SPEC.md` acceptance rows 1-10. Resume at the Current
Milestone. All implementation happens in the owned session worktree
`session/nightwatch-universe-admission-hy-418aba0f`.

## Completion Snapshot

Pending — the campaign is IN_PROGRESS.
