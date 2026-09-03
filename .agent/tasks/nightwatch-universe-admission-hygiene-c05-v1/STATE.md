# Task State

## Identity

Task ID: nightwatch-universe-admission-hygiene-c05-v1
Phase: UNIVERSE_ADMISSION_HYGIENE_C05_V1
Status: COMPLETE
Starting SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last validated implementation SHA: 4e0bfc19ea6794344c786b55034568e64fd7dfac
Last substantive checkpoint SHA: 4e0bfc19ea6794344c786b55034568e64fd7dfac
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-universe-admission-hy-418aba0f
Last checkpoint: exact-head GitHub run 33796281169 at 4e0bfc1 passed all eleven required groups on Node 20 with receipt receipt:sha256:f313d77bf52b8b06dbde2e5c; gate:local receipt:sha256:0cc29da4b4503cd981855940 and gate:clean PASS with inner receipt receipt:sha256:841e75dcd27b04660842fa24 and siblingWrites 0; canonical regression 3,457/3,444/13/0; population 1,745 to 1,851 with blueinternal 51 and wave-api 55 and no eviction; 11/11 negative probes detected and restored; DEF-C05-1 through DEF-C05-5 all found and repaired, three pre-existing and two campaign-introduced
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_VALIDATED_IMPLEMENTATION_SHA: 4e0bfc19ea6794344c786b55034568e64fd7dfac
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 4e0bfc19ea6794344c786b55034568e64fd7dfac
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Separate discovery from admission, make the owner-approved universe a single
authority, stop persisting mutable Git state as normative configuration, prove
at the read boundary that an unapproved repository is never read, and admit
exactly the two owner-named repositories.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed and all ten acceptance rows PASS.
Certified by exact-head CI run 33796281169 at `4e0bfc1`.

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
- M8 — integrated by verified fast-forward; exact-head CI FAILED once at
  `8cb055c` on DEF-C05-5, was root-caused rather than retried, and PASSED at
  `4e0bfc1`; project truth reconciled; session released.

## Work In Progress

NONE — the campaign is COMPLETE.

## Exact Next Action

STOP — C-05 is COMPLETE and certified. The next authorized campaign in this
overnight portfolio is C-08 deployment-fact binding.

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

**DEF-C05-5 — a C-05 test required real sibling content without a skip guard,
so exact-head CI failed. CAMPAIGN_INTRODUCED.** Exact-head run `33795270499`
at `8cb055c` reported `SYNTHETIC_CAMPAIGN` `TEST_FAILURE` with exactly one
failing location, `tests/unit/c05UniverseAdmission.test.ts:291` — the case that
reads `blueinternal/openapiv2/apidocs.swagger.json` to prove the admission gate
is not vacuously satisfied by refusing everything. CI has no sibling checkouts,
so the read returned null. It passed locally and failed in CI, which is exactly
the local-versus-gate divergence R-12 spent a campaign making visible, and I
reproduced it one campaign later.

Every OTHER case in that block asserts a REFUSAL, which the boundary decides
before touching the filesystem, so those hold in either topology; this was the
single case needing real content. Repair: the same self-skip C-02a's real-source
block uses. Verified by flipping the predicate to a nonexistent repository and
confirming the suite reports 27 passed / 1 SKIPPED rather than a failure — the
skip was proven, not assumed.

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

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-05 is COMPLETE and certified.

Substantive implementation anchor: 4e0bfc19ea6794344c786b55034568e64fd7dfac
Certified exact-head checkpoint: 4e0bfc19ea6794344c786b55034568e64fd7dfac
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,457 / 3,444 / 13 skipped / 0 failed; semantic
compatibility 2,033 / 2,020 / 13 / 0; synthetic campaign 767/767 locally and
767 / 732 / 35 skipped / 0 failed in CI; the new `c05UniverseAdmission` suite
28/28.
Artifacts: `src/core/source/universe.ts` as the single admission authority; a
per-repository read ledger and boundary admission gate in `siblingSource.ts`;
`checkC05UniverseAdmissionBoundary` replacing three per-campaign prohibitions;
five mutable Git fields removed from `RepoDefinition`; `change:shadow` repaired
and observing live.
Known issues: none introduced. The real-source yield figures (51, 55, 1,851)
are verified locally only, because CI has no sibling checkouts — the same scope
C-02a's 591 has always had. Enumeration remains TRUNCATED with
`remainingUnknown: true`, which is correct and unchanged.
Recommended next task: C-08 deployment-fact binding.
