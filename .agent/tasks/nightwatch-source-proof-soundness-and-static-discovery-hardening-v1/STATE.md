# Task State

## Identity

Task ID: nightwatch-source-proof-soundness-and-static-discovery-hardening-v1
Phase: SOURCE-PROOF-SOUNDNESS-AND-STATIC-DISCOVERY-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: 54090566dad7ba3f65c9ffb2a398e4fcf1fad52b
Last validated implementation SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
Last substantive checkpoint SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-27 — M5 focused acceptance and performance hardening are green; the non-authoritative static-route prefilter restored the bounded source-census profile, and repository-wide acceptance remains.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 54090566dad7ba3f65c9ffb2a398e4fcf1fad52b
LAST_VALIDATED_IMPLEMENTATION_SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_SOURCE_PROOF_SOUNDNESS_AND_STATIC_DISCOVERY_HARDENING_V1_STATUS: IN_PROGRESS

## Objective

Establish lexically real, reachable, and mechanically complete source facts
for the approved local/synthetic discovery chain, repairing only reproduced
soundness failures while preserving valid proof identities, privacy, bounded
execution, and fail-closed owner policy.

## Current Milestone

Milestone ID: M5
Milestone status: IN_PROGRESS
What is being attempted: Complete adversarial, performance, full-gate, clean-
checkout, checkpoint, and exact-head CI acceptance after reconciling the
reproduced false proofs.

## Completed Milestones

- M0 — activation, baseline, and exhaustive audit complete: activation
  checkpoint `2bb778b` is pushed with local HEAD equal to `origin/main`;
  1,319/1,319 tracked files were NUL-safely read and hashed, all were regular,
  and every path was classified. Baseline continuity passed with the two
  known warnings, hardening/spec/inventory/diff passed, and clean-tree project
  truth passed after checkpoint.
- M1 — soundness probe reproduction complete: the focused pre-probe Phase
  25–28 cone passed 51/51. The new 23-test probe run had 15 passed and 8
  expected failures: the public PHP surface promoted an implicit fallthrough,
  TypeScript and Go comment/string route text became operations, one real PHP
  declaration plus fake comment/docblock/string text became
  `MULTIPLE_SYMBOLS`, and nested/loop/try/yield direct returns were admitted.
  Unconditional, conditional-plus-terminal-fallback, complete if/else, and
  dynamic fallback controls behaved as expected.
- M2 — PHP path-completeness hardening complete: the direct response family now
  requires a bounded complete unconditional or `if`/`elseif`/`else` / terminal
  fallback shape; implicit fallthrough, nested controls, loops, try/catch,
  yield, exit-like terminators, and malformed/ambiguous forms fail closed. The
  real-source response analyzer identity is `v4`; alias and branch proof
  ownership remain separate.
- M3 — lexical route/declaration hardening complete: bounded static tokenization
  excludes TS/JS/Go comments, block comments, quoted/template/raw strings,
  regex literals, and malformed lexical input from route authority; PHP exact
  declaration counting now uses the existing bounded tokenizer. Supported real
  route identities/order and duplicate-real ambiguity behavior remain intact.
- M4 — downstream parity and fresh census complete: the final discovery digest
  is `source-surface-discovery:sha256:906830010ed198639d3c7b91`; all 128
  operation identities and 118 proven handler joins are unchanged. Response and
  semantic proofs changed only by 40 `PROVEN -> UNSUPPORTED_REFERENCE`
  transitions, each carrying `PHP_RETURN_OBJECT_FIELDS:BRANCH_SET_INCOMPLETE`
  from the reproduced PHP reachability defect; no new proof appeared. Fresh
  eligibility is 3 eligible / 125 excluded with currentness failures 0, and
  readonly families remain non-authoritative with no safe new family.

## Work In Progress

The three required defects are covered by passing regression/adversarial tests.
M2/M3 implementation and M4 census/parity are complete in the working tree.
The static-route tokenizer now has a non-authoritative source-anchor prefilter;
the implementation checkpoint and final acceptance gates remain.

## Exact Next Action

Run semantic/provenance and repository acceptance gates, then record the
validated implementation checkpoint, complete the report and continuity files,
push, and observe exact-head Actions once.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route execution to the fresh campaign | Activated in working tree |
| `.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/SPEC.md` | Freeze intent and safety boundaries | Created |
| `.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/PLAN.md` | Record living milestones and validation | Created |
| `.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/STATE.md` | Record continuity and exact resume point | Updated with baseline |
| `.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/REPORT.md` | Reserve final handoff record | Created |
| `tests/unit/phase25SurfaceDiscovery.test.ts` | Reproduce public route/declaration false positives and PHP surface fallthrough | Passing regression/adversarial coverage |
| `tests/unit/phase26ResponseCoverage.test.ts` | Reproduce PHP path-completeness false proofs and controls | Passing regression/adversarial coverage |
| `src/core/semanticCoverage/sourceAnalyzers.ts` | Add bounded PHP direct-return reachability completeness and version `v4` | M2 implementation |
| `src/core/source/lexical.ts` | Add bounded TS/JS/Go lexical tokenization for static discovery | M3 implementation |
| `src/core/source/surfaces.ts` | Use lexical route parsing and token-based exact declaration counts | M3 implementation |
| `tests/unit/phase26SyntheticCampaign.test.ts` | Bind the version assertion to the load-bearing analyzer constant | Versioned test compatibility |

## Validation Ledger

Command: `npm run agent:check`
Result: PASS with 2 warnings — zero strict errors; expected stale prior implementation anchor and 24 legacy v1 history warnings.
When: 2026-08-27
Relevant failure/output summary: Current task is strict-valid with zero errors; live HEAD and `origin/main` both `54090566dad7ba3f65c9ffb2a398e4fcf1fad52b`.

Command: `npm run agent:audit`
Result: PASS — 80 tasks, 56 strict v2, 24 legacy v1, zero strict errors, 34 legacy warnings.
When: 2026-08-27
Relevant failure/output summary: Current task strict-valid; legacy warnings are historical.

Command: `npm run project:check`
Result: FAIL (expected pre-checkpoint condition) — `PROJECT_STATE_CHECKOUT_DIRTY`.
When: 2026-08-27
Relevant failure/output summary: Activation documents were intentionally still uncommitted; rerun after the documentation checkpoint.

Command: `npm run hardening:check`
Result: PASS — offline structural invariants hold.
When: 2026-08-27
Relevant failure/output summary: None.

Command: `npm run quality-gate:spec`
Result: PASS — schema `nightwatch.quality-gate.v1`, 9 required groups, compatibility schema v1.
When: 2026-08-27
Relevant failure/output summary: None.

Command: `npm run gate:inventory`
Result: PASS — authoritative gate inventory rendered successfully.
When: 2026-08-27
Relevant failure/output summary: Legacy workflow inventory remains historical; fixed gate registry is authoritative.

Command: `git diff --check`
Result: PASS — no whitespace errors.
When: 2026-08-27
Relevant failure/output summary: No source implementation has been changed.

Command: `git ls-files -z` audit loop with `sha256sum` and regular-file check
Result: PASS — tracked=1,319, reviewed=1,319, nonregular=0, reviewed equals tracked; manifest digest `9594f1928e9de040743ca2acb1d346f1276f1e972a849b0dcfaad3b2bf7eb113`.
When: 2026-08-27
Relevant failure/output summary: 14,346,189 bytes and 286,929 lines were read; top-level classification was `.agent` 430, `src` 406, `tests` 232, `corpus` 112, `bin` 51, `docs` 30, `openspec` 10, `ui` 14, `config` 6, root 21, and one each for `.agents`, `.claude`, `.github`, `.kimi-code`, `.opencode`, `artifacts`, and `scenarios`.

Command: `node --version`, `npm --version`, `npx playwright test --list --project=nightwatch`
Result: PASS — Node `v22.22.1`, npm `10.9.4`, complete enumeration 2,550 tests in 209 files.
When: 2026-08-27
Relevant failure/output summary: No test-only or implementation skip was added.

Command: `node bin/nightwatch-intelligence.mjs source-gaps --json`
Result: PASS — source snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`; discovery `source-surface-discovery:sha256:92ff5f61acfc63aa9b8ad7a5`; 128 operations, 127 route proofs, 83 response contracts, 175 semantic observations, 118/10 joins, 3 Phase 24 eligible and 125 excluded.
When: 2026-08-27
Relevant failure/output summary: Local approved-source read only; no network/auth/product contact. Performance receipt reported 4,713 ms and max source 242,093 bytes.

Command: `node bin/nightwatch-intelligence.mjs eligibility-census --json`
Result: PASS — eligibility digest `source-eligibility-census:sha256:1a71425620210ac5fa6af6c4`; summary retained 128 operations, 83 response/semantic contracts, 5 proven read-only, 47 mutation-capable, 3 eligible, 125 excluded, currentness failures 0.
When: 2026-08-27
Relevant failure/output summary: No promotion authority was created; `NEXT_PROMOTION_AUTHORITY` remains `NONE`.

Command: `node bin/nightwatch-intelligence.mjs readonly-census --json`
Result: PASS — readonly digest `source-readonly-candidate-census:sha256:88c370e8523e03e06e52a3d9`; 127 handlers / 81 GETs; 0 direct-pure-return candidates, 13 declaration-cone candidates, 5 baseline known-read registry candidates, 81 GET-only negative controls.
When: 2026-08-27
Relevant failure/output summary: No new family was admitted; current candidate measurements remain non-authoritative.

Command: `/usr/bin/time` source-gaps, eligibility-census, readonly-census
Result: PASS — baseline wall/RSS: source-gaps 5.60 s / 263,816 KB; eligibility 5.46 s / 267,080 KB; readonly 5.67 s / 265,228 KB.
When: 2026-08-27
Relevant failure/output summary: Measurements are bounded local process observations only.

Command: `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts tests/unit/phase25AnalyzerSoundness.test.ts tests/unit/phase26Adversarial.test.ts tests/unit/phase26ResponseCoverage.test.ts tests/unit/phase27ResponseFlow.test.ts tests/unit/phase28SourceIntelligence.test.ts --project=nightwatch --workers=1`
Result: PASS — 51 passed in 6.6 seconds before probe additions.
When: 2026-08-27
Relevant failure/output summary: Established known-good Phase 25–28 baseline.

Command: `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts tests/unit/phase26ResponseCoverage.test.ts --project=nightwatch --workers=1`
Result: EXPECTED FAIL — 15 passed, 8 reproduced soundness failures in 23 tests.
When: 2026-08-27
Relevant failure/output summary: PHP implicit fallthrough and unsupported nested/loop/try/yield paths were proven; TS/Go comment/string routes were discovered; PHP fake declaration text caused multiple-symbol ambiguity. This is the H1.5 gate evidence, not a green acceptance result.

Command: `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts tests/unit/phase26ResponseCoverage.test.ts --project=nightwatch --workers=1`
Result: PASS — 26/26 focused probe/regression tests after M2/M3 implementation.
When: 2026-08-27
Relevant failure/output summary: Direct PHP unconditional, terminal-fallback,
if/else, and if/elseif/else controls remain provable; incomplete/nested,
loop, try, yield, exit-like, and dynamic forms remain unproven. TS/JS/Go
comment, block-comment, quoted/template/raw-string, regex, and malformed
fixtures are filtered or fail closed; real route identity remains.

Command: `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts tests/unit/phase25AnalyzerSoundness.test.ts tests/unit/phase26Adversarial.test.ts tests/unit/phase26ResponseCoverage.test.ts tests/unit/phase27ResponseFlow.test.ts tests/unit/phase28SourceIntelligence.test.ts tests/unit/callScopedSourceRead.test.ts --project=nightwatch --workers=1`
Result: PASS — 74 tests passed in 6.1 seconds after the final lexical-anchor
prefilter; focused source, response-flow, currentness, privacy, and mutation
controls remain green.
When: 2026-08-27
Relevant failure/output summary: No test was deleted, skipped, or weakened.

Command: `npm run campaign:synthetic`
Result: PASS — 66 tests passed in 27.5 seconds after the final prefilter.
When: 2026-08-27
Relevant failure/output summary: The deterministic local campaign matrix
remains offline, synthetic, and owner-policy bounded.

Command: `/usr/bin/time` source-gaps, eligibility-census, readonly-census
Result: PASS — fair post-prefilter wall/RSS: source-gaps 4.76 s / 266,300 KB;
eligibility 4.82 s / 266,084 KB; readonly 5.14 s / 268,644 KB. Fair
pre-prefilter measurements from the disposable baseline worktree were 6.62 s /
264,956 KB; 6.03 s / 264,220 KB; and 8.02 s / 264,992 KB respectively.
When: 2026-08-27
Relevant failure/output summary: The prefilter only skips files with no raw
receiver/method/dot anchor; tokenization remains the sole route authority.
The observed RSS remains bounded by the existing 2,000,000-byte and 500,000-
token lexical limits, with no unbounded behavior introduced.

Command: `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts tests/unit/phase25AnalyzerSoundness.test.ts tests/unit/phase26Adversarial.test.ts tests/unit/phase26ResponseCoverage.test.ts tests/unit/phase27ResponseFlow.test.ts tests/unit/phase28SourceIntelligence.test.ts --project=nightwatch --workers=1`
Result: PASS — 66/66 focused Phase 25–28 tests.
When: 2026-08-27
Relevant failure/output summary: Existing analyzer, response-flow, source
taxonomy, currentness, privacy, and adversarial controls remain green with the
new soundness/lexical regressions.

Command: `npx tsc --noEmit --pretty false`
Result: PASS — strict TypeScript compilation completed without diagnostics.
When: 2026-08-27
Relevant failure/output summary: New lexical helper, token-based joins, and
bounded PHP completeness code typecheck under the repository's strict config.

Command: `npx playwright test tests/unit/realSourceExtraction.test.ts tests/unit/realSourceCurrentness.test.ts tests/unit/realSourceAdmission.test.ts tests/unit/sourceAnalysisParity.test.ts tests/unit/phase25SourceBoundary.test.ts tests/unit/phase25Invalidation.test.ts tests/unit/phase26Invalidation.test.ts tests/unit/phase26SourceMetrics.test.ts tests/unit/eligibilityCensus.test.ts tests/unit/readonlyCandidateCensus.test.ts --project=nightwatch --workers=1`
Result: PASS — 60 tests passed in 47.6 seconds.
When: 2026-08-27
Relevant failure/output summary: Extraction, currentness, admission, source
boundary/invalidation, source metrics, readonly, eligibility, and deterministic
parity controls remain green.

Command: `npm run campaign:synthetic`
Result: PASS — 66 tests passed in 26.8 seconds.
When: 2026-08-27
Relevant failure/output summary: The complete local synthetic campaign,
including Phase 24–28 source, replay, dossier, currentness, persistence,
authority, and adversarial controls, passed without external contact.

Command: `node bin/nightwatch-intelligence.mjs source-gaps --json`
Result: PASS — final source snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`, discovery digest `source-surface-discovery:sha256:906830010ed198639d3c7b91`; 128 operations, 127 route proofs, 0 ambiguous routes, 43 response contracts, 53 semantic observations, 118/10 joins, and 3/125 Phase-24 eligibility.
When: 2026-08-27
Relevant failure/output summary: Final bounded performance receipt was 3,249
ms; 94 PHP files tokenized, 766 declarations indexed, max source 242,093
bytes, max token population 32,027. Output is a safe local projection.

Command: `node bin/nightwatch-intelligence.mjs eligibility-census --json`
Result: PASS — digest `source-eligibility-census:sha256:2f97b732e0472df347f695a1`; 128 operations, 127 route proofs, 43 response/semantic contract surfaces, 5 proven read-only, 47 mutation-capable, 3 eligible, 125 excluded, and 0 currentness failures. `NEXT_PROMOTION_AUTHORITY` remains `NONE`.
When: 2026-08-27
Relevant failure/output summary: Phase-24 bridge and reason-family outputs
remain deterministic; no candidate availability became promotion authority.

Command: `node bin/nightwatch-intelligence.mjs readonly-census --json`
Result: PASS — digest `source-readonly-candidate-census:sha256:c54347c14d4d1e5f95f18660`; 127 handlers / 81 GETs; direct-pure-return population 0, bounded declaration-cone population 13 with 0 complete, known-read registry population 5 with 5 complete and 3 current eligible, and 81 GET-only negative controls. No new family was admitted: `NO_SAFE_NEW_FAMILY`.
When: 2026-08-27
Relevant failure/output summary: Candidate measurements remain non-authoritative
and no dynamic dispatch, runtime binding, GET-only, or fuzzy-symbol family was
generalized.

Command: Safe pre/post source differential comparison
Result: PASS — both snapshots contain 128 operations and 128 surfaces; operation identity changes 0; handler joins remain 118 PROVEN / 9 MISSING_SYMBOL / 1 OUTSIDE_SCOPE. Response and semantic transitions are 43 PROVEN->PROVEN, 40 PROVEN->UNSUPPORTED_REFERENCE, 35 UNSUPPORTED_REFERENCE->UNSUPPORTED_REFERENCE, 9 MISSING_SYMBOL->MISSING_SYMBOL, and 1 OUTSIDE_SCOPE->OUTSIDE_SCOPE.
When: 2026-08-27
Relevant failure/output summary: The 40 losses are intentional correctness
deltas caused by the reproduced branch-completeness defect. Analyzer v3 to v4
and dependent discovery/eligibility/readonly digests are expected version
invalidations. Unexplained drift: 0.

## Decisions Made During This Task

Decision: Use a fresh task ID and preserve the completed predecessor unchanged.
Reason: The planner handoff explicitly defines a new soundness campaign.
Evidence/constraint: `.agent/EXECUTION_PROMPT.md`, OpenSpec change, and the
owner's continuation contract.

Decision: Treat all three planner findings as reproduced defects and repair
their owning proof families locally.
Reason: Public synthetic discovery produced the false proof/route/join
outcomes before implementation changes.
Evidence/constraint: 23-test reproduction run: 15 passed and 8 failures in
the newly added controls; no source implementation was changed during the
probe.

Decision: Keep direct-return reachability proof local to
`analyzePhpDirectReturns` and version the real-source analyzer identity from
`v3` to `v4`.
Reason: the reproduced false proof belongs to that family; global rejection
of unrelated alias/branch observations would violate proof conflict ownership.
Evidence/constraint: 26/26 focused controls and 66/66 Phase 25–28 tests pass.

Decision: Use one bounded lexical tokenizer for TS/JS/Go route parsing and
static declaration counting, while reusing the existing bounded PHP tokenizer
for PHP declarations.
Reason: both lexical false-positive defects require the same non-code-region
boundary and the design forbids a second runtime/parser stack.
Evidence/constraint: public discovery regression fixtures pass, including
comments, block comments, quoted/template/raw strings, regex text, and
malformed input.

Decision: Preserve pre-existing case-insensitive TS/JS receiver matching and
recognize a single PHP reference marker in exact declaration counting.
Reason: the differential review exposed that a token-based receiver set had
silently narrowed valid `Router.get`-style forms, while `function &symbol()` is
a lexically real declaration that should not become missing. Go method matching
remains exact-uppercase by language contract.
Evidence/constraint: 74/74 Phase 25–28 plus call-scoped source-read tests pass;
the final real-source operation identity comparison remains zero changes.

Decision: Treat a post-scan source digest mismatch as SOURCE_STALE across
handler/schema joins and descriptor currentness, while keeping runtime binding
version drift distinct from source-snapshot currentness and mapping it to the
Phase-24 candidate source-version check.
Reason: a call-scoped reader can observe a same-SHA file mutation after scan;
all proof joins must fail closed without conflating a current source snapshot
with a stale runtime catalog binding.
Evidence/constraint: the existing mutation fixture now asserts stale handler
join/currentness; the stale-runtime fixture asserts `DRIFTED` candidate source
version and Phase-24 exclusion.

Decision: Use the independent Hy3 Free read-only review as advisory evidence
and repair only reproduced in-scope regressions.
Reason: the review confirmed lexical/privacy soundness, identified the
case-sensitive receiver narrowing and currentness edge, and raised unobserved
API-shape variants; runtime/source authority and final acceptance remain under
the frontier agent.
Evidence/constraint: worker status success, no file writes, local-only
profile, no crash-level finding; OpenSpec scope does not expand to generic
receiver inference or new proof families.

## Discoveries

- The live baseline includes the new OpenSpec planning artifacts at `5409056`.
- Soundness probes and current tracked-file counts must be regenerated after
  task activation; prior campaign counts are historical only.
- Root causes are localized: direct PHP response analysis treats observed
  returns as exhaustive, static TS/JS/Go route parsing matches raw source text,
  and `declarationCount` matches raw PHP text instead of lexically real
  declarations.
- The M2/M3 fixes are bounded and non-executing. The direct family now rejects
  unsupported reachability before shape promotion; lexical discovery emits no
  routes from non-code regions and rejects malformed token streams.
- A first lexical candidate briefly exposed three mixed-case Go method routes
  during differential review; requiring exact uppercase Go HTTP method tokens
  removed that regression before the accepted final census. Final operation
  identity drift is zero.
- The fresh census did not satisfy the strict exact-family admission bar:
  direct pure handlers have no current population, bounded declaration cones
  are 13/0 complete, and the known-read registry is existing baseline
  authority. The explicit disposition is `NO_SAFE_NEW_FAMILY`.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Infrastructure, datastore, cloud, product-environment, authentication,
  publication, and DEV semantic acceptance work remain owner-frozen or
  separately authorized.
- Optional family admission remains subject to the strict current-source bar.
- Full acceptance, implementation checkpoint, final continuity closure, and
  exact-head Actions observation remain pending; no new proof family has been
  admitted.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect Git status and current SHA.
4. Run the smallest relevant validation.
5. Continue the Exact Next Action.

## Completion Snapshot

Not complete. No final evidence may be recorded until all OpenSpec milestones
and acceptance checks close.
