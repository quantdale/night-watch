# Nightwatch — CURRENT STATE

> Durable memory for the next agent/session. Last updated: **2026-08-25** at
> Phase 28 terminal closure. Phase 28's validated implementation
> checkpoint is `7e0b8c1ca584326dd8e7fa9bbf28ba8240fcf37c`; live HEAD and the
> final documentation head are discovered from Git. Phase 24's authoritative local and disposable
> Node20 clean-checkout gates pass, while its exact-head Actions run
> `32723603497` / job `97419996717` had `steps=[]`, so the terminal state is
> `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` and DEV observations remain zero. Phase
> 23's canonical/isolated parity baseline remains 2,360 / 4 skipped / 0 failed
> out of 2,364 with exact skip parity. This snapshot is
> LOCAL / SOURCE / SYNTHETIC only, building on the Phase 16CH
> portfolio runtime-binding hardening terminal closure
> (`PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` on earned implementation SHA
> 794b32d; `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED`; DEF-01
> and DEF-02 repaired with permanent regressions; 171-scenario corpus x3
> deterministic repeats with all thirteen quality floors zero; canonical AND
> topology-correct isolated complete regressions both 2232 passed / 0 failed /
> 4 skipped with exact parity; Phase 17 canonical and isolated complete
> regressions both 2259 passed / 0 failed / 4 skipped with exact parity;
> Actions run 32628613509 / job 97167784939 executed zero steps
> under the standing external billing/spending block), building on the
> Phase 16A portfolio implementation
> (`PHASE_16A_STATUS: COMPLETE
> (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)` at 1737e30), the Phase 15H whole-system integrated hardening terminal closure
> (`PHASE_15H_STATUS: BLOCKED_EXTERNAL_CI` on earned hardening SHA 06ea7ca;
> `PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_NOT_CI_VERIFIED`; canonical
> full 2063/0/4 == isolated full 2063/0/4; DEF-01..DEF-13 repaired, zero new
> defects; D-65), building on the
> Phase 15P parallel implementation completion (PHASE_15_PARALLEL_IMPLEMENTATION:
> IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING at 42c5a7e; sixteen
> assignments A01–A16 integrated over four validated waves; D-64) and the
> 105-file mass-bulk round (strategy shift abc9bf9 -> c2640cb, unvalidated by
> owner direction until hardened). Earlier milestones: Phase 13I residual runtime completion (PHASE_13I_STATUS:
> BLOCKED_EXTERNAL_CI on clean 186122f; PHASE_13_SEMANTIC_PROMOTION,
> PHASE_13_REPLAY_V2_BINDING, PHASE_13_SHADOW_CAMPAIGN
> VERIFIED_LOCAL_NOT_CI_VERIFIED; D-63) and
> Phase 10B COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED (PHASE_10_STATUS:
> COMPLETE; Phase 10B COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED; D-61).
> Phase 0–5 are
> complete; Phase 6 is frozen by owner; Phase 7, Hardening Campaign I/I.1,
> Phase 7B, Phase 7B.1.2, Phase 7B.2, and Phase 7B.2.1 are complete. The
> Phase 7B.3 harness is complete; its real local-model canary was not run
> because no compatible local runtime/model was available. Phase 8 is
> `COMPLETE` (final closure executed: `PHASE_8_STATUS` pinned to COMPLETE,
> the canonical-promotion research boundary is closed with the machinery
> retained, and the Phase 9 roadmap selected); Phase 8A, Phase 8A.1,
> Phase 8A.1.1, Phase 8B, Phase 8B.0.1,
> Phase 8B.1.0, Phase 8B.1.0.1, and Phase 8B.1.0.2 are `COMPLETE`,
> Phase 8B.1 is `COMPLETE VIA SUCCESSFUL RETRY R1`, Phase 8B.1-R1.1
> (project-memory & canonical-source truth hardening) is `COMPLETE`, and
> Phase 8B.1-R1.1.1 (canonical catalog authority wording closeout) is
> `COMPLETE`. Phase 8B proved one sandbox-confined,
> metamorphically-verified source adoption with zero canonical mutation;
> Phase 8B.0.1 closed the four promotion-readiness integrity gaps;
> Phase 8B.1 (Owner-Gated Canonical Promotion) — its original attempt
> remains the truthful `BLOCKED`/CLOSED historical record (one authorized
> real promotion was applied/verified then reverted because the full
> regression suite assumed a permanently-fresh single candidate, and its
> one-shot approval is permanently spent);
> Phase 8B.1.0 removed that structural blocker with a bounded deterministic
> proposal portfolio (EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE) and
> state-explicit test baselines; Phase 8B.1.0.1 proved the complete clean
> full regression and reconciled the continuity records; Phase 8B.1.0.2
> introduced the versioned continuity protocol
> (`nightwatch.agent-continuity.v2`) that mechanically rejects completed-task
> contradictions (stale milestones/WIP/next actions, duplicate structured
> fields, future-value placeholders), added `npm run agent:audit` and the CI
> "Completed-task continuity audit" step, and migrated the current 8B.1
> lineage to strict v2; Phase 8B.1-R1 then replaced the repository-wide
> empty-only catalog CI assumption with a cardinality-agnostic
> catalog-integrity invariant (readiness commit `a319849`, exact green CI)
> and completed the ONE authorized fresh canonical promotion: a fresh
> session/candidate A, fresh sandbox proof, an exact one-entry future-state
> rehearsal (full suite 0 failed, portfolio selects B), one fresh promotion
> intent, one fresh one-shot approval, one real APPLY (one file,
> `src/core/selfDev/adoptedCaseCatalog.generated.ts`), fresh-process verify
> PASS, full regression green, the canonical adoption commit `24fc437` with
> exact green CI including the catalog-integrity step at count 1,
> `CANONICAL_PROMOTION_COMMITTED_EXACT`, and a fresh post-commit session
> selecting variant B. Phase 8B.1-R1.1 then corrected the generated-catalog
> authority header (sandbox mirror-only + owner-gated canonical promotion —
> no generic self-modification), removed the stale generic project-level
> checkpoint anchors (authority de-duplication), introduced
> `nightwatch.project-state.v1` with read-only `npm run project:check` and
> a CI "Project-memory truth check" step, and preserved promotion-currentness
> strictness. The canonical adopted-case catalog contains
> exactly ONE entry (raw digest `bd35b934...` after the R1.1.1 authority
> wording regeneration); variant B
> (EXPAND_THEN_COLLAPSE) remains available-not-adopted with promotion
> authority NONE. No second approval, no second APPLY, no B adoption. The
> next-architecture design review (Phase 8-DESIGN, 2026-08-15) selected
> `PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8` — Phase 8's objective (one
> owner-authorized canonical promotion + continuation) is fulfilled; Phase 8
> closure is COMPLETE (executed by
> `phase-8-final-closure-phase-9-roadmap-selection`, authorization
> `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY` — see the closure record below
> and `docs/ARCHITECTURE.md` (Phase 8 next-architecture design review
> section); decisions D-52 + D-53). The selected next investment is
> **Phase 9 — Deterministic Semantic Oracle Depth** (`PHASE_9_DIRECTION:
> DETERMINISTIC_ORACLE_DEPTH`, design in `docs/design/PHASE_9_ROADMAP.md`).
> Phase 9 is now `COMPLETE_LOCAL_SYNTHETIC` (2026-08-16): the owner-
> authorized implementation task
> (`phase-9-deterministic-semantic-oracle-depth`,
> `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`) implemented sanitized in-memory
> semantic projections, source-backed declarative expectations, deterministic
> semantic expectation + cross-step invariant oracles, five seeded semantic
> bug classes with zero benign false positives, adversarial sentinel-leakage
> proof, and integration of semantic findings through the existing
> campaign/triage/dossier pipeline (additive sanitized dossier evidence),
> closed under continuity v2 (D-54; record below; `PHASE_9_DEV_ACCEPTANCE:
> RECOMMENDED_SEPARATE_AUTHORIZATION` for any contained DEV run — Phase 9B,
> not executed).

---

## What exists now

Phase 0/1, Phase 1.1 (browser safety hardening), and Phase 1.2 (outer egress
containment) are complete. Nightwatch lives in
`REPOSITORIES/nightwatch/` as its own private Git repository with the
canonical `origin` remote. It reads the Alphaus repos under
`REPOSITORIES/alphauslabs` and `REPOSITORIES/mobingilabs` strictly read-only.

## Current Git topology

| Field | Current value |
| --- | --- |
| `REMOTE_STATUS` | `PRIVATE_REMOTE_CONFIRMED` |
| `REMOTE` | `origin` |
| `REMOTE_REPOSITORY` | `quantdale/night-watch` |
| `REMOTE_BRANCH` | `main` |
| `CANONICAL_GIT_ROOT` | `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch` |
| `PARENT_WORKSPACE_GIT` | `RETIRED` — `/home/dalepalaca/go/src/alphaus-main` is not a Git repository |
| `PHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA` | `4602fac417746a30927fc19f8e4ca48ab9143cac` (historical Phase 8A.1 substantive anchor — no longer a live project-level authority) |
| `PHASE_8A_1_HISTORICAL_DOCUMENTATION_CHECKPOINT_SHA` | `488b4e41dc12840a1e0c029ae76b24f3ce8abee4` (historical Phase 8A.1 documentation descendant — no longer a live project-level authority) |
| `PHASE_7B_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA` | `40e59ecf6209dac7ef88ac2af0bcef781562a837` (historical Phase 7B.1 substantive anchor) |
| `PHASE_7B_1_2_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA` | `257cc294850344149fd4c5b657beeff07e511c91` (historical Phase 7B.1.2 substantive anchor) |
| `PHASE_7B_2_STATUS` | `COMPLETE` — private owner-review CLI is local, synthetic, and owner-interface-only |
| `PHASE_7B_2_1_STATUS` | `COMPLETE` — immutable private publication is atomic/no-replace and owner-decision write authority is CLI-unique |
| `PHASE_7B_3_STATUS` | `HARNESS_COMPLETE / LOCAL_MODEL_CANARY_NOT_RUN` — no compatible already-local runtime/model or explicit endpoint/model configuration was available; no installation/download was attempted |
| `PHASE_8_STATUS` | `COMPLETE` — Phase 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1.0 lineage complete; Phase 8B.1 complete via retry R1 (one canonical adoption); closure complete — the canonical-promotion research boundary is closed; future use of the retained machinery requires a separate concrete owner authorization |
| `PHASE_8A_STATUS` | `COMPLETE` — historical declarative synthetic evaluation foundation with no-adoption boundary |
| `PHASE_8A_1_STATUS` | `COMPLETE` — v2 content identity, semantic state validation, source/baseline provenance, ordered replay, and read-only trust assessment |
| `PHASE_8A_1_1_STATUS` | `COMPLETE` — canonical source-currentness-aware future-review eligibility gate distinguishing artifact validity from candidate eligibility |
| `PHASE_8B_STATUS` | `COMPLETE` — sandbox-confined, metamorphically-verified controlled source adoption proven; canonical adopted-case catalog lifecycle per Phase 8B.1-R1 (now one entry) |
| `PHASE_8B_0_1_STATUS` | `COMPLETE` — sandbox promotion-readiness closeout (base pre-validation, strategy binding, verified-result probe invariant, truthful write accounting); fresh sandbox-only acceptance re-verified |
| `PHASE_8_OWNER_AUTHORIZATION` | `PHASE 8B.1-R1 OWNER-GATED CANONICAL PROMOTION RETRY` — executed exactly one fresh prepare/approve/apply/verify/commit chain; no further promotion authority |
| `PHASE_8B_1_R1_1_AUTHORIZATION` | `PROJECT-MEMORY & CANONICAL-SOURCE TRUTH HARDENING` — source/docs/tooling integrity only; NO promotion authority, NO variant-B adoption |
| `PHASE_8B_1_STATUS` | `COMPLETE VIA SUCCESSFUL RETRY R1` — original attempt `BLOCKED`/CLOSED (historical record preserved; old approval spent); retry adopted one canonical case |
| `PHASE_12A_STATUS` | `BLOCKED_EXTERNAL_CI` — Workstreams A–F implemented and locally verified on clean `4730c4e` (D-62); GitHub Actions externally billing-blocked before job execution; the two ROADMAP NEXT_AFTER investments (HIGH_CONFIDENCE_SEMANTIC_TRIAGE, REAL_SEMANTIC_COVERAGE_EXPANSION) are now implemented-local. Phase 11B remains NOT_AUTHORIZED |
| `PHASE_13I_STATUS` | `BLOCKED_EXTERNAL_CI` — semantic routing (CampaignSemanticEvidence + dual clustering), replay-plan-V2 executor binding, ledger/drift, and `corpus/phase13` integrated shadow proof (42 fixtures, 3× determinism, all floors 0) implemented and locally verified on clean `186122f` (D-63); GitHub Actions externally billing-blocked before job execution; Phase 11B/13B remain NOT_AUTHORIZED — no DEV |
| `PHASE_13_SEMANTIC_PROMOTION` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — CampaignSemanticEvidence-gated dual routing, semanticContractIdentity cluster, explicit protocol fallback; v2 ledger readback routes through dossier-v2 |
| `PHASE_13_REPLAY_V2_BINDING` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — occurrence-bound TriageReplayPlanV2 with injected executor (exact fingerprint equality, throw→INVALID, API single, journey reduced PRECONDITION_DIVERGENCE) |
| `PHASE_13_SHADOW_CAMPAIGN` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — permanent `corpus/phase13` synthetic shadow campaign (nested sources, 42 fixtures, synthetic executors only, deterministic, privacy-safe) |
| `PHASE_12_REAL_REPLAY` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — replay-plan strict DTO + synthetic journey/exploration/API adapters around existing bounded minimizer; `invalidReducedReplay()` baseline permanently reproduced (baselineInvalidReplay=23/27) |
| `PHASE_12_HIGH_CONFIDENCE_TRIAGE` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — semantic triage-evidence DTO + categorical HIGH-confidence blocking + dossier v2 READY predicate; v1 compatible |
| `PHASE_12_REAL_SOURCE_COVERAGE` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — fresh ripple-api master `e026c855…` disposable snapshot; 6 approved targets; 4 rederived; 0 mechanical uplifts (precise blockers) |
| `PHASE_14A_STATUS` | `BLOCKED_EXTERNAL_CI` — versioned mechanical-contract analyzer (`nightwatch.mechanical-contract-analyzer.v1`) implemented; 6 approved targets re-evaluated at fresh ripple-api snapshot `e026c855…`; 0 real-source uplifts (precise blockers preserved); synthetic proof gains 12 positive / 16 rejection, all floors 0; full local/source acceptance green (typecheck, hardening, 1454 Playwright passed / 4 skipped, agent:check/audit 0 strict errors); GitHub Actions externally billing-blocked; Phase 11B/13B NOT_AUTHORIZED |
| `PHASE_15P_MASS_IMPLEMENTATION` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — the 105-file mass-bulk round (base `abc9bf9…` -> `c2640cb08…`, 17 commits) was hardened by Phase 15H: initial typecheck 26 errors / 13 files repaired via DEF-01..DEF-13 (incl. real orchestrator stale-bookkeeping carryover source bug DEF-06 and selfDev trust-root transitive-closure gap DEF-12); focused sweep 367/0; adversarial corpus executable with all quality floors zero; unit sweep 1955/0/4; canonical complete Playwright workers=1 2063 passed / 0 failed / 4 skipped == topology-correct isolated run 2063/0/4 (npm ci + NIGHTWATCH_PROXY_PORT + read-only sibling symlinks); A15 de-export surface verified caller-free (147 removed exports / 55 files, 0 surviving external references, zero Git-level file deletions in the whole mass round); catalog count/digest unchanged; promotion authority NONE. Earned hardening SHA 06ea7ca62b1d5c8770d42622d4655e942ec68336; Actions run 32554139535 executed ZERO steps under the external billing/spending block (D-65) |
| `PHASE_15H_STATUS` | `BLOCKED_EXTERNAL_CI` — whole-system integrated hardening campaign terminal on earned SHA `06ea7ca62b1d5c8770d42622d4655e942ec68336`: every local/source gate green (typecheck, hardening:check, campaign:synthetic 27/0, owner-provenance 91/0, agent:check/audit 0 strict errors, project:check PASS, floor batch 121/0, canonical+isolated full regressions exact-matched); CI remains externally billing-blocked before job execution (single inspection, no retry-loop); Phase 6 FROZEN_BY_OWNER; Phase 11B/13B NOT_AUTHORIZED (D-65) |
| `PHASE_16A_STATUS` | `COMPLETE (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)` — deterministic campaign portfolio layer (W1–W8) implemented and focused-green at earned implementation checkpoint `1737e30afb64a1aed722f61182d87a4f2f6e3bb4` (six phase16a suites 59/0; affected Phase 12–15 compatibility 115/0; campaign:synthetic 27/0; owner-provenance 91/0; byte-deterministic plan/simulate/handoff outputs); complete canonical/isolated regressions deliberately deferred to the next dedicated hardening task (D-66-era record in `.agent/tasks/phase-16a-campaign-yield-portfolio-optimization/`) |
| `PHASE_16H_STATUS` | `BLOCKED_EXTERNAL_CI` — campaign-yield/portfolio hardening terminal on earned SHA `1d6d8759bbba0145962fa0e65810d6f32fa41445`: DEF-01..DEF-06 reproduced then repaired with permanent regressions (simulator starvation-threshold coherence + model validation; replan unselected-movement fail-closed + affected-set purity; strict plan-manifest parser with double digest recomputation wired into comparePlanManifests and CLI; CLI sanitized error surfaces); adversarial corpus extended to 89 scenario fixtures plus ~80 negative/matrix cases, x3 deterministic repeats, all ten quality floors zero; Phase 12–16 compatibility 836/0; canonical AND topology-correct isolated complete regressions both 2161 passed / 0 failed / 4 skipped with exact parity incl. skip inventory; catalog count/digest unchanged, promotion authority NONE; Actions run 32596866942 executed ZERO steps under the external billing/spending block (single inspection, no retry-loop); `PHASE_16A_PORTFOLIO: VERIFIED_LOCAL_NOT_CI_VERIFIED`; DEV handoff never executed (`PHASE_16A_DEV_CAMPAIGN: NOT_AUTHORIZED`) |
| `PHASE_16B_STATUS` | `BLOCKED_RUNTIME_BINDING_MISSING` — contained DEV portfolio campaign acceptance terminated at the runtime-binding gate with ZERO DEV contact: both owner tokens recorded before any contact, candidate plan/handoff proven byte-deterministic and parser-valid but never frozen for execution because current source provides no safe path from the inert handoff into the existing bounded campaign runtime (no consumer of dev-handoff/plan-manifest outside src/core/portfolio/** + bin/portfolio.mjs + unit tests; bin/phase7-real.mjs accepts no plan input; the literal gate token is consumed by nothing; three of five default plan targets are synthetic-fixture-only). No bypass implemented, no source change, no manufactured checkpoint; post-run gates green (typecheck/hardening PASS; focused Phase 16A+16H suites 98/0; campaign:synthetic 27/0; owner-provenance 91/0); a future separately authorized task must design a SAFE consumption seam plus a real-approved-universe portfolio builder before any retry |
| `PHASE_16C_STATUS` | `COMPLETE (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)` — portfolio runtime binding + real approved universe implemented local/source/synthetic under `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY` (2026-08-23): canonical runtime-profile linkage module; deterministic real-universe builder over canonical registries (synthetic fixture identities excluded; exploration members explicitly runtime-restricted); strict admission of inert handoff+plan+universe+authorization with bounded categorical reasons (handoff stays executable:false; authorization non-mutating); versioned monotone-restrictive budget mapping v1 (elementwise min vs the approved bounded profile); schema-OPTIONAL manifest `portfolioBinding` in campaignId+fingerprint via conditional spread (legacy manifests byte-stable); prepare freezes ordinal-zero checkpoint with zero executor callbacks and resume re-verifies frozen fingerprints + fresh authorization before executor construction; single opt-in launcher input pair (`--portfolio-plan=`/`--portfolio-authorization=`) with legacy surfaces unchanged. New suites 33/0; Phase-16A+16H portfolio suites incl. campaign.test 125/0; affected Phase 12–15 compatibility 145/0; campaign:synthetic 27/0; owner-provenance 91/0; all ten quality floors zero; seam x3 + CLI runtime-plan x3 byte-deterministic. Canonical/isolated whole-repo regressions deferred to Phase-16CH hardening (`PHASE_16CH_HARDENING: REQUIRED_NEXT`); `PHASE_16D_DEV_RETRY: REQUIRES_SEPARATE_OWNER_AUTHORIZATION`; DEV WAS NOT EXECUTED |
| `PHASE_16CH_STATUS` | `BLOCKED_EXTERNAL_CI` — Phase 16CH terminal local/source/synthetic hardening on earned SHA `794b32df443ae8c9a520182ef97b7a2c9985ba82`: DEF-01 reserve feasibility and DEF-02 sanitized unknown-field diagnostics repaired with permanent regressions; 171-scenario adversarial corpus x3 byte-identical with all thirteen floors zero; affected compatibility 172/0; campaign:synthetic 27/0; owner-provenance 91/0; canonical complete Playwright 2232 passed / 0 failed / 4 skipped == topology-correct isolated run 2232/0/4 with exact skip parity; catalog count/digest unchanged; promotion authority NONE; Actions run 32624917568 / job 97158631282 completed failure before any step under the external billing/spending block; `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED`; Phase 16D remains `NOT_AUTHORIZED` |
| `PHASE_17_STATUS` | `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — terminal implementation checkpoint `482ed51814ce8e8f7d67de7edc9a98786240430c` connects source selection to bounded portfolio allocation, hardens baseline/privacy/replay evidence boundaries, and adds a 9-case synthetic source-change corpus; DEF-17-01..06 are repaired; focused 27/0, readiness/rehearsal repair matrix 52/0, affected 142/0, and canonical/isolated full regression 2259/0/4 are green with exact parity; Actions run 32628613509 / job 97167784939 executed zero steps under the external billing/spending block; Phase 16D remains `NOT_AUTHORIZED` |
| `PHASE_22_STATUS` | `BLOCKED_BEFORE_DEV` — additive real-eligibility, source-currentness, frozen-manifest, Preflight V2, privacy-firewall, replay/calibration, dossier, and dry-run bridge implemented at `64cffaf6554300f59907c947f135753b62376a64`; six candidates considered, three DEV-eligible collection targets frozen, exact local gates green, but Actions run `32681204267` / job `97298112036` failed with `steps=[]` and failed-log retrieval timed out; zero DEV contact |
| `PHASE_23_STATUS` | `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — one versioned `nightwatch.quality-gate.v1` (9 required groups) drives local, Node20 clean-checkout, and GitHub Actions execution through `npm run gate:ci`; Phase 9–23 compatibility is 1,806 total / 1,805 passed / 1 skipped / 0 failed; CI receipt `receipt:sha256:25e36d5165d745db5f5e6ac6`, clean receipt `clean-receipt:sha256:d7cbb1f53f164ac1cd58e31d`, canonical/isolated 2,364/2,360/4/0 parity, fresh source SHA `27bb007…`, fresh v2 manifest, and no-contact dry run are green; exact Actions run `32709452878` / job `97377543621` matched the implementation head but had `steps=[]`, so DEV observations are zero |
| `PHASE_24_STATUS` | `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — implementation `cec14ac8e1b189aed96a1b8488381083951411f6` adds source snapshot analysis, eight-candidate deterministic portfolio selection (6 eligible / 2 excluded), manifest v3, no-contact rehearsal, 12 semantic oracle classes, 5 cross-candidate relations, replay/minimization v3, sanitized dossier/owner routing, CI/readiness diagnostics, and proxy interruption coverage; authoritative local gate PASS with receipt `receipt:sha256:c6da9a1edf31f47ac1b14d19`, clean Node20 gate PASS with receipt `clean-receipt:sha256:719495ba80a55e351d8f24fb`, Phase 9–24 compatibility 1,824/1,823/1/0, synthetic 28/28, owner provenance 91/91, 133 unique authoritative files / 0 duplicate executions; exact Actions run `32723603497` / job `97419996717` matched the implementation head but had zero steps and classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; DEV observations are zero |
| `PHASE_25_STATUS` | `COMPLETE_LOCAL_SOURCE_EXPANSION` — source-expansion implementation `042300c7c59fd8218afabc761e31691139d0c657`; validated continuity implementation `f5356f3d94973b5ffc95c60623bf027a2864bfb5`; last known pushed documentation checkpoint `de4822ec8151a7de83c3f89ce325a003257077e6`; fixed no-follow source boundary, content-aware bounded inventory, existing-analyzer route/contract extraction, exact joins, additive graph lineage, direct Phase24 portfolio integration, invalidation/review/cache/operator tooling, and synthetic source-to-dossier rehearsal; approved real-source smoke inspected `mobingilabs/ripple-api` at `27bb007ad0c798800b6bd3b29760c966422966e7`, 96 files considered / 95 admitted / 1 privacy rejection / 1,750,958 bytes read, 128 operations / 127 route proofs / 25 response and semantic contracts / 118 proven joins / 10 rejected joins, and 3 existing-runtime-bound Phase24-eligible surfaces with no fabricated new target; final local gate at `bae4d39577730ce9a031ecedd5112317f8db423b` receipt `receipt:sha256:3341294c4e3ba07e02fd68cf`, final Node20 clean receipt `clean-receipt:sha256:2d3290a0bb2a62b9c8c469b3` with gate receipt `receipt:sha256:ffe8578b987391306d863d96`; fresh canonical and topology-correct isolated full Playwright both 2,407 enumerated / 2,403 passed / 4 skipped / 0 failed with exact skip identity; exact Actions run `32741057138` / job `97475353760` had zero steps and classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; DEV/auth/product/data/infra operations remain zero |
| `PHASE_26_STATUS` | `COMPLETE_LOCAL_SOURCE_EXPANSION` — direct-return response proof and safe analyzer diagnostics extended the existing Phase 25 surface profile without changing Phase 24 authority; validated implementation `bb3a41b735e5dece4170712075e44ccf4a02f716` and certification/documentation descendant `b6d61a4ee7534e81af5819e87baef45e78dd81af`; six approved repositories at current SHAs yielded 1,732 files considered / 1,092 read / 1,078 admitted / 654 rejected and 12,449,877 inspected bytes; 128 operations / 127 route proofs / 127 request contracts / 62 response contracts / 138 semantic contract observations / 118 proven joins / 10 rejected joins; lifecycle advanced to 66 `DISCOVERED`, 59 `MECHANICALLY_PROVEN`, and 3 `PROJECTABLE`; Phase 24 remained 3 eligible / 125 excluded; response gap reasons are 8 dynamic-key/incomplete-branch, 22 incomplete-branch/unsupported-syntax, 26 unsupported-syntax, 9 missing-symbol, and 1 outside-scope; local gate at certification descendant `b6d61a4ee7534e81af5819e87baef45e78dd81af` passed with receipt `receipt:sha256:5c6ae5ac430baf126e6b6299`, Node20 clean receipt `clean-receipt:sha256:3119a0ff4ebcfdf0903f0a`, compatibility 1,874/1,873/1/0 across 139 files, synthetic 30, owner provenance 91, and gate inventory 146 unique / 0 duplicates; canonical and topology-correct isolated full regressions both 2,435/2,431/4/0 with exact skip identity; exact Actions run `32783079546` / job `97609144140` matched the certification head but had zero steps and classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; all prohibited safety counts remain zero |
| `PHASE_27_STATUS` | `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — exact interprocedural response-flow v1 and bounded oversized-string lexical hardening are implemented at validated anchor `237e537e154bdb7c0eb7b4bd04021f9c5437db29`; fresh six-repository census reproduced 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected / 12,449,877 bytes and classified the remaining helper/resource/DTO patterns without fuzzy or runtime inference; current-source result is 128 operations / 127 routes / 127 request contracts / 83 response contracts / 175 semantic observations / 118 proven joins / 10 rejected joins, lifecycle 45 `DISCOVERED` / 80 `MECHANICALLY_PROVEN` / 3 `PROJECTABLE`, and Phase 24 remains 3 eligible / 125 excluded; flow layer attempted 13 / proved 0 / rejected 13 and current source supplied no exact helper/resource/DTO join; local and Node20 clean gates, compatibility 1,874/1,873/1/0, synthetic 39/39, owner provenance 91/91, and canonical/topology-correct isolated Playwright 2,440/4/0 parity are green; exact Actions run `32800403605` / job `97659975725` had `steps=[]` and classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; terminal continuity/docs closure and synchronized clean-main verification are complete |
| `PHASE_28_STATUS` | `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — validated implementation checkpoint `7e0b8c1ca584326dd8e7fa9bbf28ba8240fcf37c`; fresh six-repository census remains 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected / 12,449,877 bytes; taxonomy v3 records 45 proof-gap surfaces and 325 rejected diagnostics; no strict local producer-flow family was admitted; local and Node20 clean gates pass; canonical and topology-correct isolated Playwright both pass 2,438 / 16 skipped / 0 failed out of 2,454 with exact parity; exact-head Actions run `32819574544` / job `97714690619` had zero steps and is classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; all prohibited safety counts remain zero |
| `PHASE_12_YIELD_BACKTEST` | `VERIFIED_LOCAL_NOT_CI_VERIFIED` — fixed `corpus/phase12` 27 fixtures; phase12Minimized(16) > baselineMinimized(0); all floors 0; 3× determinism 0 mismatches |
| `LIVE_HEAD_AUTHORITY` | `GIT` — discover local `HEAD` and `origin/main` with read-only Git commands; do not persist a current-head field in the file that records it |

This private development remote contains Nightwatch source, tests, schemas,
synthetic fixtures, and sanitized continuity state only. Real runtime
credentials, storage state, authenticated evidence, customer values, and
private findings remain outside GitHub under the owner-only local storage
policy.

### Project-memory authority model (Phase 8B.1-R1.1)

Project-level live authority is intentionally de-duplicated. This document is
a SNAPSHOT of current project truth, never its own Git/checkpoint authority:

- LIVE repository HEAD ← Git (discovered at check time; no persisted
  current-head SHA anywhere).
- CURRENT implementation checkpoint ← `.agent/ACTIVE_TASK.md` + task
  `STATE.md` under `nightwatch.agent-continuity.v2` (strict cross-file task
  state machine).
- Task-specific history ← task `STATE.md` / `REPORT.md`.
- Project architectural snapshot ← this file (`docs/CURRENT_STATE.md`).
- Historical phase implementation anchors ← explicitly phase-qualified
  fields only (e.g. `PHASE_8A_1_HISTORICAL_*_SHA` above).
- Canonical adopted catalog ← validated live generated source produced by the
  deterministic renderer (`renderAdoptedCatalogSource`); ordinary development
  never hand-edits it.
- Catalog mutation authority ← Phase 8B sandbox adoption (disposable private
  source mirror only) OR Phase 8B.1 separately owner-gated canonical
  promotion (complete evidence/approval chain; development session commits).
  No generic runtime self-modification authority exists.
- CANDIDATE AVAILABILITY ≠ PROMOTION AUTHORITY: variant B is
  `AVAILABLE_NOT_ADOPTED` while promotion authority remains `NONE`.

The machine-checked truth block below holds only facts with a deterministic
source; it is validated read-only by `npm run project:check`
(`bin/project-state-check.mjs`).

### Project-state v1 (machine-checked truth block)

```
PROJECT_STATE_PROTOCOL_VERSION: nightwatch.project-state.v1
LIVE_HEAD_AUTHORITY: GIT
CURRENT_TASK_AUTHORITY: .agent/ACTIVE_TASK.md
VALIDATED_IMPLEMENTATION_AUTHORITY: .agent/ACTIVE_TASK.md
CANONICAL_CATALOG_TARGET: src/core/selfDev/adoptedCaseCatalog.generated.ts
CANONICAL_CATALOG_ENTRY_COUNT: 1
CANONICAL_CATALOG_SHA256: sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
CANONICAL_CATALOG_STRATEGY: DECLARATIVE_REGRESSION_CATALOG_PROMOTION
PHASE_8_STATUS: COMPLETE
PHASE_8B_1_STATUS: COMPLETE_VIA_SUCCESSFUL_RETRY_R1
NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY: NONE
PHASE_15_S1_CORE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED
```

### Phase 1.3 additions — durable agent continuity

Nightwatch now has a two-level durable memory protocol. Project memory remains
under `docs/` and answers “what is Nightwatch today?”; active execution memory
is routed through `.agent/ACTIVE_TASK.md` and stored under
`.agent/tasks/<task-id>/`. `AGENTS.md` is the concise permanent operating
contract. `SPEC.md` is frozen intent, `PLAN.md` is a living execution plan,
`STATE.md` is the current waypoint, and `REPORT.md` is the completed-task
handoff. The protocol explicitly supports fresh-session and context-compaction
recovery without conversational/model memory.

`bin/agent-state.mjs`, exposed as `npm run agent:check`, performs a local
consistency check for required files/headings, active status, task identity,
synthetic secret-like values, stable implementation/documentation SHA roles,
ancestry, and live Git drift. It reports `SYNCED`, `CHECKPOINT_ADVANCE`, or
`STALE_IMPLEMENTATION_BASELINE` without rewriting state. Deprecated `Current
SHA`/persisted current-head fields are compatibility data only; Git supplies
live HEAD. Phase 1.3 validation is local and synthetic only; no real Alphaus
environment, product session, database query, or mutation is part of this
phase.

### Phase 1.1 additions (this update)

| Area | What |
| --- | --- |
| Containment stack | L0 raw-CDP Fetch guard (`src/browser/network/fetchGuard.ts`) — pauses EVERY request incl. redirect follow-ups, fails denied/local-block URLs before network I/O; L1 `context.route('**/*')`; L2 `context.routeWebSocket('**/*')` (awaited — was unawaited, a real gap); L3 `serviceWorkers:'block'` + SW API stub + SharedWorker stub + `serviceworker` hard-failure alarm; L4 unrouted-request detection + download record/cancel |
| Policy | `ws:`/`wss:` are network schemes (`NETWORK_PROTOCOLS`) — WebSocket policy identical to HTTP; `isNetworkUrl()` helper |
| Storage state | Hardened secret handling: absolute path, external to repo+workspace, shape `{cookies, origins}`, ≤5MB, fail closed; explicit `storageStatePath` now validated too (was bypassed); `.gitignore` auth patterns |
| Traces | Authenticated runs ALWAYS disable Playwright traces (even `NIGHTWATCH_TRACE=on`); manifest records `trace.enabled=false` + reason via `addManifestEntry` |
| Outer containment | Mandatory loopback L5 forward proxy (`src/proxy/server.ts`) is started by Playwright global setup, health-checked, and passed explicitly to Chromium; HTTP and CONNECT/upgrade destinations are classified before DNS/TCP; no TLS MITM; sanitized `proxy.jsonl` plus `summary.json.proxy` aggregates |
| Policy consumers | `OutboundPolicy.decide()` is the only semantic policy source; named browser HTTP/WS consumers and `src/proxy/policyAdapter.ts` delegate to it; policy version is recorded in the manifest |
| Chromium egress configuration | Loopback proxy bypass removed with `--proxy-bypass-list=<-loopback>`; QUIC disabled; non-proxied WebRTC UDP disabled; background/speculative Chrome channels disabled where supported; observed Chrome Google control-plane preconnects are explicit telemetry and blocked locally |
| Fixtures | `safety` variant with `window.__nw` driver (SW/WS/SSE/popup/redirect/download/worker probes), RFC 6455 WS echo endpoint, SSE, redirect endpoints (prod target = `random.mobingi.com` — production-class AND DNS-unresolvable, zero real contact) |
| Tests | `tests/smoke/safety.smoke.ts` (23 network-surface cases), `tests/smoke/authenticated.smoke.ts` (2), `tests/unit/storageState.test.ts` (10), WS policy unit tests (8), manifest entry test |
| Docs | `docs/SAFETY_MODEL.md` (layers L0–L5, surface audit §10, residual gaps §11, auth sessions §12, second-layer design §13), `docs/DECISIONS.md` D-15–D-28, `docs/ROADMAP.md` Phase 1.2 + Phase 1.3 + Phase 2 L5 gate, `docs/recon/README.md` (handoff summaries), and `.agent/` continuity protocol |

## What works (verified)

| Capability | Evidence |
| --- | --- |
| Previous self-test suite | Phase 1.2 handoff at `ea2d327f54269c101123c2660a456e69dd319735` with `npx tsc --noEmit` PASS and `npx playwright test` **93 passed**; Phase 1.3 full validation is recorded below |
| Typecheck | `npx tsc --noEmit` → 0 errors |
| Service workers | `serviceWorkers:'block'` + stub: `register()` rejects, console marker recorded, SW script never fetched (`server.requests()` clean), no `serviceworker` event |
| WebSockets | allowed localhost WS connects + echoes (server counts upgrade); `wss://api.alphaus.cloud:8443` closed pre-connect + hard failure; unknown WS hard-fails; telemetry WS closed, run stays green |
| Popups | `window.open` popups inherit context policy (allowed loads fixture; prod/unknown → hard failure) |
| Redirects | allowed→allowed follows; allowed→`random.mobingi.com` (production-class) follow-up **failed by the Fetch guard before network** (`net::ERR_BLOCKED_BY_CLIENT`), evidence shows initial allowed + target denied; telemetry redirect blocked, no hard failure |
| Workers | dedicated-worker fetches routed + denied correctly; SharedWorker construction blocked (fetches would bypass routing) |
| EventSource/SSE | passes through route gate; client abort (`ERR_ABORTED`) classified benign (was a spurious issue) |
| Downloads | cross-origin download to denied host denied + cancelled; same-origin benign-by-construction |
| Telemetry / browser background | HTTP + WS telemetry and the three exact reviewed browser-background hosts are blocked-not-failed; related hosts remain fail-closed unknowns |
| Redaction | Authorization/Cookie/JWT fake secrets appear nowhere in artifacts; headers/URLs show `[REDACTED]` |
| Authenticated runs | fake storage-state secrets never enter artifacts; `trace.zip` absent; manifest documents trace reason; missing/misplaced/malformed storage state fails closed at context creation |
| Auth capture oracle handling | Protocol anomalies are recorded as sanitized `ORACLE_ANOMALY` evidence; safety/containment failures remain separate hard failures, and auth capture continues to post-login verification |
| No prod/DB/mutation | policy unit tests + canary; all Phase 1.2 browser tests use loopback fixtures and denied local alias `127.0.0.2`; production/unknown CONNECT tests stop at the proxy and never resolve or dial the destination |

## Phase 1.1 harness bugs found & fixed (by the test suite)

1. **Unawaited `routeWebSocket`/`route` registration** — left a window without WS interception and dropped-promise rejections on context close → both registrations now awaited before navigation.
2. **CDP `Network.setBlockedURLs` (old L0) removed** — empirically preempted route-level evidence for subresources while NOT blocking navigation follow-ups; replaced by the raw-CDP Fetch guard which pauses everything (incl. follow-ups) and makes the same policy decision.
3. **Explicit `storageStatePath` bypassed validation** — now goes through `validateStorageStateFile` like the env-var path.
4. **Spurious `malformed-json` on unreadable bodies** — body oracles run only when capture succeeded.
5. **SSE/abort misclassification** — `text/event-stream` excluded from NDJSON oracle; `net::ERR_ABORTED`/`ERR_BLOCKED_BY_CLIENT`/`inspector` classified as benign client/policy aborts (were spurious `request-failed` issues).
6. **Protocol anomalies were misclassified as safety failures** — `malformed-json` was included in ordinary `failOn` handling and the direct auth runner treated the shared failed bit as `SAFETY_MONITOR_FAILED`; safety failures and oracle failures are now tracked separately, while normal passive runs retain oracle-failure status.

## Historical Phase 1.1 safety event

During intermediate Phase 1.1 safety testing, before the final raw-CDP Fetch
guard was installed, one unintended production contact occurred at the
`api.alphaus.cloud` host. No intended production interaction, production
mutation, or database query occurred. The final Phase 1.1 implementation
blocked the demonstrated browser path; Phase 1.2 adds the independent outer
gate specifically so a browser/harness escape must defeat both layers.

Retained local Nightwatch artifacts were inspected before Phase 1.2. They do
not contain a matching production event, so the evidence-supported fields are:

| Field | Value |
| --- | --- |
| Attempted URL | **UNKNOWN** (host recorded as `api.alphaus.cloud`; exact path unavailable) |
| Method | **UNKNOWN** |
| Credentials attached | **UNKNOWN** |
| Response received | **UNKNOWN** |

No new request was made to production to investigate this historical event.

## Known residual gaps (Phase 1.2)

- A redirect follow-up racing an in-flight Fetch-guard install on a brand-new popup could complete before detection — detected (L4) but not prevented; closed by the second containment layer (see `docs/SAFETY_MODEL.md` §11/§13).
- HTTP/HTTPS/WS/WSS browser traffic is under L5. QUIC is disabled and WebRTC
  non-proxied UDP is disabled by the verified Chromium launch flag. Chromium
  control-plane preconnects to `accounts.google.com`/`www.google.com` were
  observed locally and are classified as explicit telemetry, then blocked by
  the proxy before upstream connection.
- DNS prefetch/resolver activity is not itself visible as a proxy event:
  **UNRESOLVED**. The proxy performs no DNS for denied/unknown targets and
  only resolves after an allow decision; a future restricted container is
  still required for complete process/network-namespace isolation.
- `serviceWorker.register()` may resolve under `serviceWorkers:'block'` (no worker is created — verified; the stub makes it reject for app-level evidence).
- Before Phase 2A, real dev/next sessions had not run; that historical
  statement is superseded by the completed Phase 2A record below. Authenticated
  traces remain disabled and real state remains external-only.

## Last successful checks (2026-08-09)

- `npx tsc --noEmit` — PASS
- `npx playwright test --project=nightwatch` — **93 passed, 0 failed**
- Focused Phase 1.2 proxy tests — 9 passed (3 unit/parser + 6 browser/sink tests)
- `NIGHTWATCH_RUN_ID=acceptance-11 npm run scenario -- --env=local` — 1 passed; artifacts in `artifacts/acceptance-11/` (passed=true, 0 hard failures, manifest carries `trace` decision)
- Sample Alphaus repos (ouchan, ripple-ui, ripple-api, invoice-ui, blueapi, blue-sdk-ts, blue-sdk-go) byte-identical before/after — PASS
- No production contact: all denied targets DNS-unresolvable or aborted pre-network; no DB tool used in session
- Phase 1.3 validator unit suite — `npx playwright test tests/unit/agent-state.test.ts` → **8 passed, 0 failed**
- Phase 1.3 full suite — `npx playwright test` → **101 passed, 0 failed**
- Phase 1.3 continuity check — `npm run agent:check` → PASS; no stale-SHA warning before the implementation commit

## Phase 2A — controlled authenticated DEV observation (complete)

The bounded Phase 2A task completed on 2026-08-12 using the canonical
`https://appdev.alphaus.cloud/ripple/` entry and a fresh human-authenticated
external Playwright state. The capture proved page-JavaScript auth visibility
with boolean-only diagnostics; no credential, cookie, token, DOM, body,
identity, screenshot, or trace material entered Nightwatch.

- Fresh capture: `nightwatch-20260811T183030Z-c652`; provenance matched `dev`.
- First run: `nightwatch-20260811T190009Z-efce-first`; final route
  `/ripple/dashboard`, QLayout shell present, `READY`, route stability `834 ms`.
- Fresh-context replay: `nightwatch-20260811T190009Z-efce-replay`; same final
  route and shell, `READY`, route stability `766 ms`.
- Auth replay: `CONFIRMED` in both runs; the prior expired capture remains a
  historical `AUTH_REPLAY_INEFFECTIVE` diagnosis, not a current-state claim.
- Both runs used the mandatory proxy/browser containment and passive-only
  observation. Production attempts, proxy violations, unresolved/unknown
  destinations, unknown approvals, mutations, and DB queries were all zero.
- The comparator recorded bounded non-fatal timing/request-count variance and
  one already-reviewed locally blocked browser-background attempt in the first
  run. Both runs had zero failed critical resources, zero runtime exceptions,
  and passed the same authenticated shell/readiness contract; no third replay
  was run.
- Privacy review passed for both sanitized artifact sets; authenticated traces
  and screenshots were absent. Full TypeScript, Playwright, agent continuity,
  and whitespace validation passed at task closure.

## Phase 4 — seeded/model-based exploration (complete)

The frozen Phase 4 task `phase-4-seeded-model-based-exploration` completed its
six-context DEV corpus on 2026-08-12. The fixed E1/J1, E2/J2, and E3/J3 seed
ledger ran serially in fresh contexts with the source-backed safe-action
catalog, deterministic model, mandatory proxy, production deny, mutation and
UNKNOWN tripwires, and metadata-first authenticated evidence. Production
attempts, proxy violations, unknown destinations/approvals, product mutations,
action-caused UNKNOWNs, and DB queries were all zero.

The designated DEV account was configured once through `npm run auth:configure`
using hidden input. The credential provider is an auth-only external
owner-only-file mechanism under the operator's local Nightwatch namespace;
credential contents remain outside Git, task state, argv, logs, evidence, and
MCP. Valid external auth state is reused first; one bounded guarded refresh
successfully established the current external state and replaced it atomically.

Chrome DevTools MCP discovery is durable as `mcp__chrome_devtools` with 29
tools, but real authenticated attachment remains disabled because the
loopback endpoint was unavailable and a dedicated contained browser ownership
path was not proven. Playwright remains the sole executor and MCP is optional.
The Phase 4 closure report and full run ledger are in
`.agent/tasks/phase-4-seeded-model-based-exploration/REPORT.md`.

Phase 2B, Phase 2C, Phase 3, Phase 4, and Phase 5 are completed predecessor
phases. Phase 6 local architecture and validation are preserved, but its
native task is intentionally `FROZEN_BY_OWNER`:
`.agent/tasks/phase-6-readonly-data-evidence-cross-layer-oracles/`.

## Phase 6 owner freeze / active roadmap boundary

`PHASE_6_STATUS: FROZEN_BY_OWNER`.

Reason: `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

The previous `M7 BLOCKED` state was an infrastructure/data mapping blocker.
The owner decision supersedes it: `OWNER_DECISION_SUPERSEDES_BLOCKER`,
`PHASE_6_FROZEN`, `NO_EXTERNAL_ACTION_REQUIRED`. This is not complete, failed,
handoff-blocked, or abandoned. Phase 6 implementation/history remains intact,
but real D1/D2/D3 datastore execution is permanently owner-policy blocked;
the six-query historical budget remains 0 used / 6 remaining.

Nightwatch must not request deployment metadata or investigate GCP/GKE,
Kubernetes, AWS infrastructure, DynamoDB, BigQuery, Spanner, production SQL,
or datastore metadata. The active task is
`.agent/tasks/private-evidence-minimization-and-triage/` and requires no
external team dependency.

Real findings remain owner-only local artifacts under the private storage
policy. No Slack, GitHub/Jira/Linear, email, shared Drive/Notion/docs, upload,
or customer-facing response is automatic. Chrome DevTools MCP remains
optional and subordinate to Playwright containment.

## Phase 6 — read-only data evidence (local architecture; blocked before live data)

Phase 6 has versioned typed query plans, DynamoDB/BigQuery/Spanner validators
and thin adapters, metadata-only normalization, cross-layer comparison,
source-to-store lineage, Phase 3 staleness integration, Phase 5 API linkage,
and synthetic adversarial coverage. The focused Phase 5 + Phase 6 suite passed
23/23 and the full Playwright suite passed 342/342; TypeScript, agent-check,
and diff-check passed. The 2026-08-13 continuation also repaired the narrow
agent-state allowlist for the sanitized Phase 6 runtime-binding checkpoint and
covered it with a regression test; stable-anchor semantics remain `SYNCED`,
`CHECKPOINT_ADVANCE`, and `STALE_IMPLEMENTATION_BASELINE`, with live HEAD from
Git.

The former real data gate remains preserved as historical evidence:
`PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED`. No datastore auth probe,
query, scan, or write ran in the owner-freeze decision, and no live datastore
verification is claimed. Historical Phase 6 artifacts retain their prior
implementation and investigation record; the active roadmap must not refresh
deployment metadata, repeat infrastructure archaeology, request a handoff, or
reopen the gate. The owner decision makes that path permanently out of scope.

## Private evidence minimization + autonomous triage (completed prerequisite)

The completed prerequisite task was `.agent/tasks/private-evidence-minimization-and-triage/`.
Its local implementation checkpoint is
`ea434b57fc132c6544c4527cbaa494cb8412db92`. It adds the executable
`FROZEN_BY_OWNER` scope gate, owner-only atomic artifact storage, bounded
original-sequence minimization, stable sanitized clustering/deduplication,
browser/API differential, source relevance, conservative application-layer
fault boundaries, deterministic private dossiers/recipes, AI-ready data-only
packages, and overnight/morning summaries. L4 is recorded as
`OUT_OF_SCOPE_BY_OWNER`; no datastore branch exists in the active stack.

Validation at this checkpoint: TypeScript PASS; focused policy/Phase 6/triage
tests 25/25 PASS; full Playwright 358/358 PASS; no real DEV minimization was
needed because no natural anomaly was admitted. Bounded AI assistance remains
deferred and any future model remains prohibited from acting as an oracle.

## Phase 7 — Private autonomous nightly campaigns (complete; historical auth block preserved; DEV auth ready)

The native task is `.agent/tasks/phase-7-private-autonomous-nightly-campaigns/`.
The campaign schema is `nightwatch.campaign.private.v1` and the orchestrator
is `nightwatch.orchestrator.private.v1`. It coordinates the existing Phase
3 selector, Phase 4 safe exploration envelopes, Phase 5 restricted API
scenarios, Phase 2C replay/oracle evidence, and private triage/minimization.
Campaign modes are explicit: `CHANGE_DIRECTED`, `BASELINE_HEALTH`,
`COVERAGE_EXPANSION`, `REPRODUCTION_ONLY`, and `LOCAL_SYNTHETIC`.

Manifest identity is a stable digest over mode, committed-only source
snapshots/window, selected lineage, seed set, version fingerprints, budget,
privacy policy, and (when present) the reproduction target. A frozen manifest
is checkpointed atomically before execution and after each major work unit.
The runtime checks Nightwatch source/catalog/model versions before resuming and
between work items; drift stops the campaign as `CAMPAIGN_VERSION_DRIFT`.

The initial real profile is deliberately bounded: J1/J2/J3 trusted canaries,
one linked envelope/seed each, one linked read-only API scenario each, a
15-minute ceiling, bounded replay/minimization budgets, and at most three
promoted clusters. Ordering is deterministic: journeys, APIs, exploration,
then admitted-cluster reproduction/minimization. Failure storms stop duplicate
spending and are summarized as a shared DEV degradation.

Synthetic acceptance passed deterministic selection, baseline/fallback,
lineage, budget/time ceilings, interruption recovery, duplicate clustering,
failure-storm suppression, reproduction, bounded minimization, dossiers,
morning briefs, privacy, and owner-policy tripwires. The one historical real
campaign created owner-only local artifacts with campaign ID
`campaign:sha256:ed4520e8fa7c3a9d2b1481f5`, selected `CHANGE_DIRECTED` J1/J2/J3
under the Phase 3 conservative fallback, and stopped at `AUTH_BLOCKED` before
any journey, exploration, API, or product observation. Its manifest/checkpoint
is immutable and is not silently resumed after the Nightwatch version changed.

The existing guarded designated-DEV auth system subsequently completed one
bounded refresh with no MFA step. Current sanitized status is
`AUTH_STATUS=VALID`, `AUTH_ENV=DEV`, `PAGE_VALID=true`, `MFA_USED=false`, with
capture ID `nightwatch-20260813T151556Z-3210`. Structural, provenance,
freshness, page-readability, authenticated-shell, metadata-only privacy, and
atomic-replacement checks passed. The final current manifest was frozen in
owner-only local state at checkpoint ordinal 0 before product execution.

The current launcher requires an explicit two-step real workflow:
`--prepare-only` validates the guarded auth/safety gate and writes a fresh
owner-only manifest plus ordinal-zero checkpoint without invoking an executor;
the sanitized `PHASE_7_NEW_REAL_CAMPAIGN_READY` state is then pushed before
`--resume-campaign=<id>` may execute the frozen campaign exactly once.
The final campaign was `campaign:sha256:aaf0cb8019c08c00132e71fb` with
manifest fingerprint `manifest:sha256:f30e691c334222281608ab01` and
implementation source SHA `b95b06dab3fe60208d412ea9811c0c36c399ed9b`.
An earlier provisional manifest was never executed and is retained only as
owner-only local superseded state.

The one permitted real run completed all 9 work items in deterministic order,
recorded 7 sanitized observations across 4 clusters and 1 candidate, admitted
0 findings/dossiers, and finalized safely as `PARTIAL_BUDGET_EXHAUSTED` with
`BUDGET_EXHAUSTED`. The owner-only morning brief is `READY` with headline
`NO ADMITTED PRODUCT ANOMALIES`.

Real campaign safety vector: production attempts 0, proxy violations 0,
unknown destinations 0, unknown approvals 0, product mutations 0,
action-caused `UNKNOWN` 0, database queries 0, infrastructure queries 0, and
external publication attempts 0. Privacy is `PASS`; no credentials, cookies,
tokens, customer values, raw bodies, DOM, screenshots, or authenticated traces
were persisted. Phase 6 remains permanently
`FROZEN_BY_OWNER`, with L4 `OUT_OF_SCOPE_BY_OWNER`.

The source repository now has a verified private canonical remote:
`origin` → `quantdale/night-watch`, branch `main`. This changes only the
development checkpoint/review path; runtime findings remain local and are
never pushed or published.

## Phase 7B — Bounded private AI review assistance (complete)

The native task is `.agent/tasks/phase-7b-bounded-ai-review-assistance/`.
Phase 7B adds an optional, owner-invoked review-assistance layer over the
existing deterministic `nightwatch.ai-ready-evidence.private.v1` projection.
The model receives only strict sanitized structural DTOs and returns opaque
data that must pass exact-key runtime validation before it can become a
private companion artifact.

The bug-draft product is `nightwatch.ai-bug-draft.private.v1` and admits only
L2/L3 candidates. It preserves deterministic candidate identity, evidence
level, source relevance, browser/API differential, fault boundary, safety,
privacy, and unresolved deployment status; AI prose is visibly labeled
`AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED`. The oracle product is
`nightwatch.ai-oracle-suggestion.private.v1`; it contains only conceptual
deterministic-check suggestions and `executable=false`. Owner approval of an
oracle suggestion means `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW` only and
does not modify a registry, campaign manifest, action catalog, source file, or
request path. Human review records use
`nightwatch.ai-human-review.private.v1` and are digest-bound.

The required provider is deterministic synthetic local. The optional provider
is explicit HTTP loopback only (`localhost`, `127.0.0.1`, or `::1`) with fixed
path, bounded bytes/time, no credentials, redirects, proxy, tools, shell,
browser/API/database/infrastructure access, or remote fallback. No cloud AI
SDK, credential, model download, or real model canary is required. Runtime AI
artifacts use the existing owner-only atomic private store outside Git; raw
prompts, raw responses, real findings, and transcripts are not persisted.

The Phase 7 campaign remains deterministic and does not invoke AI. Phase 6
remains `FROZEN_BY_OWNER` with L4 `OUT_OF_SCOPE_BY_OWNER`; Phase 8 autonomous
self-development was not started. Full validation passed with 469/469
Playwright tests, including the Phase 7B.1.1 synthetic and loopback matrix, plus
TypeScript, hardening, synthetic campaign, owner-scope, and Phase 6 checks.

## Phase 7B.1 — AI review authority hardening (complete)

Phase 7B.1 is the narrow hardening descendant of historical Phase 7B. It does
not broaden AI capability and does not rewrite the Phase 7B task report. The
validated implementation checkpoint is
`40e59ecf6209dac7ef88ac2af0bcef781562a837`.

- `AiReviewSession` is the only supported provider-execution authority. Raw
  low-level review functions and provider methods are no longer exported;
  source hardening checks the single private provider boundary and forbids
  campaign/runtime execution imports or automatic session factories.
- `candidateReviewAttempts` and `oracleSuggestionAttempts` are bounded owner
  request attempts, including invalid/disabled/non-local attempts.
  `providerCalls` is the actual synchronously reserved provider-boundary
  exposure, shared across both products and never refunded after entry.
- Generated artifacts use v2 unreviewed-only schemas:
  `nightwatch.ai-bug-draft.private.v2` and
  `nightwatch.ai-oracle-suggestion.private.v2`. Owner decisions are separate
  exact-key `nightwatch.ai-human-review.private.v2` records with deterministic
  review identity, owner/publication constraints, artifact schema binding, and
  full-artifact digest binding.
- Effective review state is projected from artifact, validated review record,
  matching digest, and current deterministic input. A status field alone
  cannot prove approval. Bug approval remains a draft; oracle approval remains
  manual implementation review only. Rejection, owner supersede, input-driven
  staleness, conflicts, corruption, and legacy v1 status are distinct and
  fail closed or remain explicitly unverified.
- Phase 7 campaign behavior, deterministic evidence, action/oracle catalogs,
  safety/privacy vectors, owner scope, Phase 6 freeze, and publication/source
  boundaries are unchanged. Phase 8 remains unstarted.

The historical 7B/7B.1 AI/loopback matrix was 54/54; the Phase 7B.1.1
AI/loopback matrix passes 60/60; the synthetic campaign passes 27/27; the
full Playwright suite passes 469/469; TypeScript,
hardening, agent-state, privacy review, and diff checks pass. No real model,
cloud provider, product traffic, database/infrastructure operation, or real
AI artifact was used.

## Phase 7B.1.1 — Runtime deadline and continuity semantics closeout (complete)

This narrow local/static/synthetic hardening descendant closed the aggregate
provider-work deadline gap with monotonic construction-time budgeting,
remaining-time caps, active `AbortSignal` cancellation through the private
provider boundary, loopback transport destruction, and synthetic PENDING
cleanup. It also replaced self-referential task SHA semantics with stable
validated implementation/substantive/documentation anchors while live local
and remote HEAD come from Git.

The stable implementation checkpoint is
`198f26ca79803c1bedac9aa08a71ecbd542ee804`; final documentation descendants
remain documentation and their containing SHA is discovered from Git rather
than embedded in the files that record it. Runtime and continuity validation
passed, with no real model, product traffic, campaign, authentication,
database, infrastructure, publication, or owner-review CLI activity. Phase
7B.1 remains a complete historical predecessor and Phase 8 remains
`NOT_STARTED`.

## Phase 7B.1.2 — Final integrity closeout (complete)

This narrow final hardening descendant closed the two remaining semantic
integrity gaps and added an independent private CI recovery gate. The stable
provider-accounting and continuity-role implementation/substantive checkpoint
is `257cc294850344149fd4c5b657beeff07e511c91`; the first approved
documentation checkpoint is `746a578a2440c2087442819e92eeed77234836ef`.
The final documentation-containing SHA remains discoverable only from Git.

- `providerCalls` now increments only in the synchronous final provider
  boundary immediately before registered-handler entry. Final monotonic
  runtime and shared-cap admission occur before that increment; a deadline
  expiring before entry leaves both the counter and provider invocation count
  at zero. Handler-entry throws, timeout, malformed/schema-invalid output,
  and storage failures consume the already-entered call without refunds.
- `bin/agent-state.mjs` validates `STARTING_SHA` lineage, distinguishes
  carried-forward implementation anchors from new claims, and inspects the
  claimed commit's own `git diff-tree` paths. Equal validated/substantive
  documentation-only claims, ambiguous merges, and unrelated lineages fail
  closed with role/lineage diagnostics; legitimate source-plus-docs and
  carried-forward histories remain valid.
- `.github/workflows/hardening.yml` independently runs the serialized
  synthetic `tests/unit/agent-state.test.ts` matrix with full Git history and
  `contents: read` permissions.

Validation passed with AI/loopback `64/64`, continuity `32/32`, synthetic
campaign `27/27`, full Playwright `481/481`, typecheck, hardening, privacy,
agent-state, diff, and isolated clean-checkout checks. The exact final
`Nightwatch hardening` workflow run and its continuity step passed at the
final live SHA. No real model, product traffic, data/infrastructure query,
publication, credential, customer value, or authenticated evidence was used.
Phase 7B.1.1 remains historical `COMPLETE`; Phase 8 remains `NOT_STARTED`.

## Phase 7B.2 — Private owner-review CLI (complete)

Phase 7B.2 adds a thin private terminal interface over the hardened immutable
Phase 7B review artifacts. It is a human review interface, not an AI execution
interface. The validated implementation checkpoint is
`b26e6c30c1ae08e668ed718eea53d6f799bead59`; the documentation checkpoint is a
separate descendant recorded by the task continuity state.

The only command is `npm run ai:owner-review`, with exact-ID `show`, concise
`status`, and interactive `decide` commands for one `bug` or `oracle` artifact.
There is no bulk scan, directory enumeration, raw JSON/export mode, output
file, editor, pager, clipboard, provider/model option, network path, Git path,
or publication path. The CLI imports a provider-free owner-review service and
cannot instantiate `AiReviewSession`, a provider, a browser/API runner, or a
campaign.

`decide` requires a TTY, presents a fixed A/R/S/Q menu, prints a fixed system
decision boundary after terminal-safe `[AI]`-prefixed prose, and requires the
exact second token `APPROVE`, `REJECT`, or `SUPERSEDE`. It reads and validates
the exact persisted artifact identity, creates one v2 review only through
`createHumanReviewRecord()` and hardened private storage, re-reads the exact
review, validates its ID/digest/decision/owner/publication fields, and applies
the existing projection. AI artifacts remain unchanged; only a companion
owner-review record is written.

Bug approval projects `OWNER_APPROVED_DRAFT`; oracle approval projects
`APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW` only. Rejection projects
`OWNER_REJECTED`, supersession projects `SUPERSEDED`, and all keep the
deterministic evidence, campaign, catalog, executable=false, and publication
boundaries unchanged. Existing reviews are terminal, malformed state fails
closed, and v1 artifacts are readable historical/unverified provenance only.
The display explicitly says `SNAPSHOT_ONLY_NOT_REEVALUATED`; owner review is
not product verification or root-cause verification.

The synthetic owner-review matrix covers 16 tests for ID attacks, absent versus
corrupt state, legacy behavior, ANSI/OSC/OSC52/control/bidi/fake-prompt text,
double confirmation, non-TTY, read-back, write failure, duplicate decisions,
artifact immutability, catalog isolation, and clean-checkout CLI fixture
handling. Local closure also passed 497/497 Playwright tests, 27/27 synthetic
campaign tests, typecheck, hardening, agent-state, privacy, and full-history
isolated checkout validation. No real model, provider, product traffic,
database/infrastructure operation, publication, credential, customer value,
or real AI artifact was used. Phase 7B.1.2 remains `COMPLETE`; Phase 8 remains
`NOT_STARTED`.

## Phase 7B.2.1 — Atomic owner provenance closeout (complete)

This narrow local/static/synthetic descendant repaired two integrity gaps found
after Phase 7B.2: immutable persistence previously used a read-then-replacing
`renameSync` race, and the public AI-review index exposed write-capable owner
decision functions outside the CLI's TTY/two-confirmation boundary. Phase 7B.2
remains historical `COMPLETE`; Phase 8 remains `NOT_STARTED`.

The validated implementation/substantive checkpoint is
`3916594f6e947f7f4665b23751c1d3ec03f5928b`. Live HEAD and `origin/main` remain
Git-discovered rather than serialized into this document.

- `PrivateArtifactStore.writeImmutableJson()` now creates a complete READY
  envelope in a same-directory, owner-only `wx`/0600 temporary, fsyncs it,
  publishes with POSIX `fs.linkSync(temp, destination)` create-if-absent
  semantics, removes only its temporary name, and fsyncs the containing
  directory. `EEXIST` is an immutable conflict; unsupported no-replace
  primitives fail closed. Replacement-capable `writeJson` and `writeIncomplete`
  remain available only for their existing non-immutable workflows.
- Bug drafts, oracle suggestions, and human-review records all use the true
  immutable primitive and are visible only as complete READY envelopes. Exact
  duplicates are idempotent; same-ID different bytes, corrupt state, and
  unsafe symlink state cannot be overwritten or self-healed. Strict identity,
  schema, digest, reviewer, and publication read-back checks remain in force.
- `src/core/aiReview/ownerDecision.ts` is internal and absent from the public
  AI-review index. The raw unconfirmed helper is private; its sole exported
  internal entry requires the selected decision, exact confirmation token, and
  displayed artifact digest. Only `bin/ai-owner-review.mjs` loads it after the
  TTY gate and fixed A/R/S/Q plus exact `APPROVE`/`REJECT`/`SUPERSEDE`
  confirmation. Supported commands remain `show`, `status`, and `decide`;
  help is exposed by `--help`/`-h`.
- Synthetic child-process tests prove first-writer-wins for private files,
  bug/oracle artifacts, and competing owner decisions. The final focused
  matrix passed 91/91, full Playwright passed 513/513, the synthetic campaign
  passed 27/27, typecheck/hardening/agent-state passed, and the isolated
  clean checkout passed `npm ci --ignore-scripts` plus the deterministic
  acceptance checks. No model, product traffic, database/infrastructure
  operation, publication, credential, customer value, or real AI artifact was
  used.

## Phase 7B.3 — Single bounded local-model canary (harness complete; real canary not run)

This narrow local/static/synthetic milestone adds a future owner-invoked
one-shot canary over the existing loopback provider. It accepts only one
repository-defined synthetic L2 `BUG_CANDIDATE` input, one strict model
identifier, and one canonical loopback `/v1/chat/completions` endpoint. The
controller constructs a fresh `AiReviewSession` without an artifact store,
allows no oracle suggestion or retry, validates the in-memory v2 draft, and
returns sanitized metadata before discarding it. The CLI has no prompt,
input-file, findings, model-installation, browser, product, Git, publication,
or owner-review path.

The fixed fixture is
`nightwatch.local-model-canary-input.private.v1` with digest
`sha256:34db4fb404008607b0ab4980155b17d7e36540107fec5163888803ae997263c6`.
Its values are synthetic only, with L2 evidence, PASS privacy, and zero safety
vectors. Deterministic local validation passed the focused canary suite
`10/10`, combined AI/loopback/canary `78/78`, owner-provenance `91/91`,
agent-state `32/32`, synthetic campaign `27/27`, and full Playwright `523/523`.
The full-history clean checkout passed `npm ci --ignore-scripts` and the
deterministic acceptance gates. Exact GitHub Actions run `31807365893` passed
at implementation checkpoint
`5e7bad758efa7e5d87610c8b7878f6690bb0b821`, including the dedicated Phase 7B.3
synthetic canary step.

`LOCAL_MODEL_CANARY: NOT_RUN — LOCAL_RUNTIME_NOT_AVAILABLE`. Narrow discovery
found no supported local runtime executable, no independently identifiable
compatible preexisting model process, and no explicit repository endpoint/model
configuration. Installation/download was not attempted; no endpoint was
probed; provider calls, loopback model requests, external AI calls, product
contacts, artifact writes, owner-review writes, and raw model output are all
zero. Phase 8 remains `NOT_STARTED` and this harness result does not authorize
it.

## Phase 8A — evaluated self-development sandbox foundation (complete)

The owner authorization for this session starts Phase 8A only. The subsystem
under `src/core/selfDev/` keeps proposer, evaluator, and any future adopter
distinct; Phase 8A has no adopter. It accepts only exact-key,
strictly-declarative `SYNTHETIC_REGRESSION_CASE` candidates from the sole
`SYNTHETIC_DETERMINISTIC` proposer. Candidate IDs are canonical semantic
SHA-256 values; createdAt, paths, and random values are excluded. Fixed local
synthetic fixture/action/assertion registries provide all execution truth.

The deterministic result schema is
`nightwatch.selfdev-evaluation.private.v1`. Its result classes include
`REJECTED_SCHEMA`, `REJECTED_SCOPE`, `REJECTED_UNKNOWN_ACTION`,
`REJECTED_UNKNOWN_ASSERTION`, `REJECTED_DUPLICATE`, `REJECTED_SAFETY`,
`REJECTED_PRIVACY`, `EVALUATION_FAILED`, and
`EVALUATED_PASS_NOT_ADOPTED`. Every result carries
`NOT_AUTHORIZED_PHASE_8A`, `PROHIBITED`, and an all-zero runtime safety vector
for DEV/NEXT/production/product/data/infrastructure/AI/publication/Git/source/
Alphaus activity. It cannot alter evidence or campaign authority.

Budgets are 3 candidates per session, 8 actions, 8 assertions, 30 seconds per
candidate, and 120 seconds per session. The bounded CLI is
`npm run selfdev:synthetic`; its private sanitized result uses the separate
owner-only `self-development` namespace and never enters findings, morning
briefs, or AI owner-review drafts. The valid synthetic edge evaluated as
`EVALUATED_PASS_NOT_ADOPTED`; its timestamp-only repeat was
`REJECTED_DUPLICATE`; the unsafe safety-vector candidate was
`REJECTED_SAFETY`. No source, Git, product, database, infrastructure, model,
publication, or Alphaus write occurred.

The implementation anchor is
`d2a2978ede7c29d04e95f1625a736ce7c26004f9`. Local full Playwright passed
`546/546`; the isolated full-history clone passed `npm ci --ignore-scripts`,
typecheck, hardening, Phase 8A `23/23`, AI/canary/provenance `106/106`,
agent-state `32/32`, synthetic campaign `27/27`, `agent:check`, and diff
check. Exact documentation checkpoint CI run `31814440021` passed at head
`1869031f810e629647bb7df40d840db83f12d865`, including the named Phase 8A
matrix step. Phase 8 remains `IN_PROGRESS`; Phase 8B is `NOT_STARTED`.

## Phase 8A.1 — trusted evaluation provenance + replay integrity closeout (complete)

Phase 8A.1 preserves the v1 foundation and adds a prospective, read-only
trust boundary. Persisted records use
`nightwatch.selfdev-evaluation.private.v2` and
`nightwatch.selfdev-session.private.v2`; provenance and derived assessment
use `nightwatch.selfdev-provenance.private.v1` and
`nightwatch.selfdev-trust-assessment.private.v1`. Legacy v1 records remain
readable where supported but are `LEGACY_UNVERIFIED_NOT_ELIGIBLE`, are never
replayed as trusted evidence, and are never migrated or rewritten.

The v2 session ID is recomputed from canonical length-prefixed semantic
session fields with `artifactId` omitted. A strict result-state invariant
binds every result class and reason/status tuple to the deterministic
evaluator, while candidate ID, candidate digest, candidate kind, evaluation
ID, and one session baseline are cross-checked. A bounded replay descriptor
regenerates the exact synthetic proposal sequence; one fresh stateful
evaluator replays it in array order with an injected constant monotonic clock,
and canonical evaluation bytes must match exactly.

Source provenance is dual-bound. A fixed code-defined path manifest produces a
length-prefixed SHA-256 `sourceBundleDigest`; a separate evaluator contract
manifest produces `contractDigest`. The only new runtime authority is a
narrow no-shell local Git metadata reader using fixed read-only commands for
HEAD, cleanliness, fixed-path untracked state, and ancestry. It has zero Git
mutation authority. Persisted v2 sessions require a nonzero real HEAD and
clean authoritative source. Documentation-only descendants may be
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`; source/contract drift, dirty source,
and unrelated baselines fail closed.

`npm run selfdev:synthetic` now persists only v2 with local provenance and
performs replay/read-back verification. `npm run selfdev:verify --
--artifact-id <exact-id>` is read-only, exact-ID addressed, sanitized, and
has no latest/list/path/adoption/patch mode. The acceptance artifact is
`session:sha256:1266c08b365fbabc56f6bbdf631c8b979df17288c1898d40cd27dc0952bf5aed`,
bound to `4602fac417746a30927fc19f8e4ca48ab9143cac`, with source digest
`sha256:80b0db2df5d8ac7b87eded03c0b8be7ee2d58103fa83251b0b31d784d5ca3493`
and contract digest
`sha256:05ad2ecf035381b58c47f3126bc844864137c57e5645df89a338cb7995a367a4`.
It verified `VERIFIED_EXACT_BASE` with replay `PASS`, one pass, one duplicate,
one rejected candidate, and zero source/Git/external side-effect counters.

Validation passed locally with 562/562 full Playwright tests, 39 focused
Phase 8A/8A.1 tests, 91/91 owner/provenance tests, 27/27 synthetic campaign
tests, typecheck, hardening, agent-state, and whitespace/privacy checks. A
fresh full-history clone at the implementation checkpoint passed the same
deterministic gate. CI runs `31821592114` and `31822125738` passed for the
implementation checkpoints; the latter executed the dedicated Phase 8A.1
matrix. Phase 8 remains `IN_PROGRESS`; Phase 8B remains `NOT_STARTED`.

## Phase 8A.1.1 — future-review eligibility gate closeout (complete)

Phase 8A.1.1 closes a narrow but security-relevant gap confirmed in Phase
8A.1: artifact provenance/replay validity and future-review candidate
eligibility are distinct, and the pre-fix `isFutureReviewPrerequisitePass`
conflated them. A replay-valid, source-attested `VERIFIED_EXACT_BASE` artifact
built from an ordinary zero-pass proposer fixture (`UNSAFE_ACTION`) is
genuinely trust-valid with `passCandidateCount = 0`, yet the pre-fix helper
returned `true` for it — confirmed as a true-positive reproduction against a
synthetic temporary Git checkout before any fix landed.

`isFutureReviewPrerequisitePass` now requires, in addition to `trustStatus`
∈ {`VERIFIED_EXACT_BASE`, `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`}:
`replayStatus === 'PASS'`; a runtime-validated genuine positive integer
`passCandidateCount` (`Number.isInteger(value) && value > 0`, rejecting
`NaN`/`Infinity`/negative/non-integer values, not merely by TypeScript's
compile-time type); matching `sourceBundleMatch`/`contractDigestMatch`; and
intact `adoptionStatus`/`publication`/zero-counter invariants. A new
`assessFutureReviewEligibility(value, current)` in `src/core/selfDev/trust.ts`
is the one canonical, source-currentness-aware future-review candidate gate:
`current` is a required parameter (a caller cannot obtain an eligibility
verdict while skipping current-source trust), it always derives its own
assessment, and — only on prerequisite pass — regenerates candidates via the
existing replay-only `verifiedPassCandidates` and cross-checks the
regenerated count against the assessment's `passCandidateCount`, failing
closed (`eligible: false, candidates: []`) on any disagreement rather than
reconciling it. `verifiedPassCandidates` keeps its existing signature (no
runtime callers; existing tests depend on it) with its replay-only scope now
documented explicitly as non-authoritative on its own.

No new persisted schema or contract-version constant was introduced:
`trust.ts` is already a member of `SELFDEV_AUTHORITATIVE_PATHS`, so this
change alone advances `sourceBundleDigest` without a separate version field;
`contractDigest` is unchanged because the evaluator/schema/budget/registry
contract itself did not change. `VERIFIED_EXACT_BASE`/
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` trust semantics are unchanged — a
zero-pass artifact remains genuinely provenance/trust valid; it is simply
future-review ineligible.

The validated implementation checkpoint is
`d33a8c1cc062b435a7b2bc4f69567286dd56ebb4`. Local validation passed 577/577
full Playwright tests (15 new focused eligibility tests plus the unchanged
39 Phase 8A/8A.1 selfDev tests), typecheck, hardening (including a new
authority-boundary assertion), `agent:check`, and 27/27 synthetic campaign
tests. A fresh isolated full-history clone passed `npm ci --ignore-scripts`
plus the same focused/typecheck/hardening/campaign/diff gates. Exact CI run
`31847511710` passed at this checkpoint, including the dedicated "Phase
8A.1.1 future-review eligibility gate matrix" step (15/15). The new v2
acceptance artifact is
`session:sha256:0cdcbb79062e93582db244feb6321c85398c323243f6cba53fbc071ecc1deff4`,
bound to `d33a8c1cc062b435a7b2bc4f69567286dd56ebb4`, with source digest
`sha256:38258a2d2d04e44bfbd9ccbeeee837249ae22281bcf67aed56d84cf3eb514f04`
(new, confirming the source-bundle-advances-automatically decision) and
contract digest
`sha256:05ad2ecf035381b58c47f3126bc844864137c57e5645df89a338cb7995a367a4`
(unchanged). It verified `VERIFIED_EXACT_BASE` with replay `PASS`, one pass,
one duplicate, one rejected candidate, and — via the new canonical gate —
`eligible: true` with exactly one regenerated candidate. The historical Phase
8A.1 acceptance artifact was not touched or migrated. Phase 8 remains
`IN_PROGRESS`; Phase 8B is now `COMPLETE` (below).

## Phase 8B — Controlled source adoption sandbox (complete)

Phase 8B proves Nightwatch can translate one exact, current-source-eligible
declarative regression candidate into one deterministic tracked-source
adoption, apply it only inside a disposable owner-private source mirror,
execute the modified sandbox evaluator, and metamorphically prove the effect
— while the canonical checkout remains byte-for-byte untouched. Canonical
source promotion remains a future, separately authorized task (Phase
8B.1 — Owner-Gated Canonical Promotion, `NOT_STARTED`).

A strict, versioned, data-only adopted-case catalog
(`nightwatch.selfdev-adopted-case.v1`) is split across a trusted schema
module (`src/core/selfDev/adoptedCases.ts`) and a pure-data generated file
(`src/core/selfDev/adoptedCaseCatalog.generated.ts`, the sole sandbox
mutation target) that starts and remains empty in canonical source.
Adopted-case identity is base-independent; coverage is always re-derived
from the fixed action registry, never trusted from a supplied field. The
evaluator seeds its baseline duplicate/coverage state from the catalog at
construction time with zero behavior change while empty (confirmed: all 54
pre-existing Phase 8A/8A.1/8A.1.1 tests pass unmodified); the catalog's live
contents are embedded directly in the evaluator contract manifest, so
adopting an entry changes `contractDigest` automatically.

A pure, deterministic planner in the new `src/core/selfDevSandbox/`
boundary consumes only `assessFutureReviewEligibility` output, requires a
matching `EVALUATED_PASS_NOT_ADOPTED` evaluation with positive re-derived
coverage overlap, rejects an already-adopted or full catalog, and requires
the on-disk catalog to match its own canonical renderer output before
producing a content-addressed, immutable, TOCTOU-revalidated plan bound to
the fixed target path. The sandbox executor mirrors only the fixed
authoritative source set into a disposable owner-private 0700 root,
verifies pre/post digests and an exactly-one-file diff, then loads and
executes the *modified* sandbox evaluator through a bounded serial
cache-isolated local TypeScript loader confined to the sandbox root. Four
metamorphic probes prove the adoption's effect: same semantics under a
different base SHA become duplicate; a same-coverage assertion variant
remains non-new; a genuinely new coverage edge still passes; an unsafe
candidate remains rejected. The disposable mirror is always cleaned up.

The narrow CLI `npm run selfdev:adopt-sandbox -- inspect|plan|run` is
exact-ID only; `run` requires the fixed confirmation token `SANDBOX_ONLY`.
There is no apply/commit/push/promote/merge/install command anywhere. A new
owner-policy operation `SELF_DEVELOPMENT_SANDBOX_ADOPTION` authorizes
sandbox-only writes; `SELF_DEVELOPMENT_CANONICAL_ADOPTION` remains unknown
and fails closed. Hardening gained `checkPhase8BSandboxBoundary`, including
call-graph containment.

The validated implementation checkpoint is
`f04bb928890b8d730665b24cfd303386608b2a5a`. Local and isolated-clean-
checkout validation both passed the full suite (611 total: 611 passed
locally; 608 passed + 3 environment-conditional skips in the isolated
clone), 90/90 focused Phase 8A/8A.1/8A.1.1/8B tests, typecheck, hardening,
27/27 synthetic campaign, and `git diff --check`. Exact CI run `31853612222`
passed at the documentation-inclusive descendant
`36495b4df2c013d671a4983cd7991e1aecd9a25e` (which changes no authoritative
source beyond the validated checkpoint), executing the dedicated "Phase 8B
controlled source adoption sandbox matrix" step. The real acceptance run
below was performed against that same descendant. The fresh v2 acceptance
artifact is
`session:sha256:27dbbd7f94e360af7e9fc564e9cdabf45d3d9ae5c67e84eccc676f78f047ac46`,
`VERIFIED_EXACT_BASE` with replay `PASS`, `eligible: true`, one candidate.
The one real local acceptance plan/run —
`adoption-plan:sha256:70e2c7f1d4f934e8ae0828ed8ad583b7a71f321d5ed0ecce84c1a90d3662f192`
and
`adoption-sandbox-result:sha256:de4a2de17c8fee9c4a496143165f78f48ff411091c3b92d3a5760c86a9f884d7`
— verified `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` with all four
metamorphic probes `PASS` and confirmed the canonical adopted-case catalog,
its digest, and `git status` were byte-for-byte unchanged before and after.

No AI/model, product traffic, database/infrastructure operation,
publication, credential, customer value, or canonical/Alphaus source write
was used. Phase 8 remains `IN_PROGRESS`; canonical candidate promotion
remains `NOT_STARTED`/`NOT_AUTHORIZED`.

## Phase 8B.0.1 — Sandbox promotion-readiness closeout (complete)

Phase 8B.0.1 closed the four promotion-readiness integrity defects found
after Phase 8B's sandbox-only acceptance, with pre-fix `TRUE_POSITIVE`
reproductions for each and a fresh sandbox-only acceptance re-running the
full chain on the current implementation.

- **Sandbox base pre-validation (Defect A).** `sandboxMirror.ts` previously
  ran `mkdirSync(recursive)` + `chmodSync(base)` before its lstat rejection:
  a preexisting base symlink caused the external target's mode to be mutated
  (reproduced: 755 → 700) before `SELFDEV_SANDBOX_BASE_UNSAFE`, and a
  symlinked `.nightwatch` parent let the whole mirror be created inside the
  symlink target with no error. The new internal `ensurePrivateSandboxBase()`
  validates the pathname chain component-wise (lstat-first; symlink →
  `SELFDEV_SANDBOX_BASE_SYMLINK`; non-directory →
  `SELFDEV_SANDBOX_BASE_NOT_DIRECTORY`; missing ancestors →
  `SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING`) BEFORE any mutation. The base
  fails closed on open mode (`_PERMISSIONS_UNSAFE`) or wrong owner
  (`_OWNER`) with no repair; the private parent reuses the established
  private-artifact convention (validated non-symlink owner-matched directory
  tightened to 0700, never loosened). Missing directories are created only
  beneath a validated parent, non-recursively, 0700, immediately
  revalidated. Instances are realpath-contained beneath the validated base
  and disjoint from the canonical repository, the parent workspace, and the
  findings root; cleanup requires strict realpath child containment + lstat
  before recursive removal (any doubt → FAIL, nothing deleted); copy
  failures clean up the partial mirror. `$HOME` and arbitrary ancestors are
  never chmodded or created. The base stays code-defined
  (`$HOME/.nightwatch/selfdev-sandboxes`); tests use a module-level override
  not exported from the boundary index; no `--sandbox-root` option exists.
- **Adoption strategy binding (Defect B).** Plan and result validation
  previously accepted any nonempty `strategyClass`; a forged plan/result with
  `FUTURE_UNKNOWN_STRATEGY` and a recomputed content-addressed ID validated
  (reproduced). Now `plan.strategyClass` and `result.strategyClass` must
  equal `SELFDEV_ADOPTION_STRATEGY_CLASS`
  (`DECLARATIVE_REGRESSION_CATALOG_PROMOTION`) exactly, checked before any
  identity recomputation; an explicit plan↔adoptedCase cross-binding
  (`PLAN_STRATEGY_MISMATCH`) is enforced; the TypeScript type is the literal
  `SelfDevAdoptionStrategyClass`. The strategy version
  (`nightwatch.selfdev-adoption-strategy.v1`) remains bound through the
  contract manifest into `contractDigest` (no cosmetic field added).
- **Complete verified-result metamorphic invariants (Defect C).** A claimed
  `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` result previously accepted
  `nonOverreachResult = NOT_RUN` (reproduced). A verified result now requires
  all five probes exactly `PASS` (preAdoption, postEquivalent,
  postVariantCoverage, nonOverreach, unsafeRegression); NOT_RUN and FAIL are
  rejected per field even with a recomputed resultId. The executor cannot
  produce a verified result when no bounded non-overreach probe exists
  (`NON_OVERREACH_PROBE_UNAVAILABLE`) or when a probe ran and failed
  (`NON_OVERREACH_REGRESSION`, both end-to-end tested).
- **Truthful failure-path sandbox write accounting (Defect D).** The failure
  builder previously hardcoded `sandboxSourceWrites = 0`; a failure after the
  single sandbox target write (reproduced via post-write module-load
  failure) reported 0 writes. The executor now tracks the actual executed
  effect (0 before the single allowed write, 1 immediately after its
  success) and every result — success or failure — carries the true value;
  validation bounds it to integer 0..1; success requires exactly 1;
  `canonicalSourceWrites`/`runtimeGitWrites`/`externalCalls` remain ALWAYS 0.
- **Additional finding (fixed).** `sandboxLoader.ts` set its serial lock
  before a possible early throw, permanently wedging every later sandbox
  load; the lock is now released on every exit path.

Focused coverage: new `tests/unit/selfDevSandboxConfinement.test.ts`
(base-validation matrix A–J), strategy-binding tests in
`selfDevAdoptionPlan.test.ts`, and strategy/invariant/accounting/executor
tests in `selfDevAdoptionSandbox.test.ts`; hardening gained
`checkPhase8B01CloseoutIntegrity`; the workflow gained a dedicated
"Phase 8B.0.1 sandbox promotion-readiness closeout matrix" step.

The validated implementation checkpoint is
`c4537ab5e3e96859c7c472ac47c3143a15b20c26` (continuity commit
`0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9` records the anchors). Local
validation: typecheck, hardening, focused matrix (110 passed/1 skip plus the
two dirty-worktree CLI tests, which pass 7/7 at a clean tree), full
Playwright 633 passed / 1 environment-conditional skip (634 total; 611 Phase
8B baseline + 23 new), owner provenance 91, AI regressions 98, agent-state
32, campaign:synthetic 27, `git diff --check` clean; isolated full-history
clean checkout green (focused 112 passed/1 skip, owner provenance 91,
agent-state 32, campaign 27). Exact CI run `31857751099` at
`0f64ea6aa46e50e4a8e2ef87cbf6f63cc1a59dd9` — completed/success with the
dedicated 8B.0.1 step and the agent-state check verified individually. The
fresh sandbox-only acceptance on the current implementation:
`session:sha256:d8846f36ae6784a1832b3b741eef619d2666f3f7325ebafabae85da36ea128e2`
(`VERIFIED_EXACT_BASE`, replay PASS, eligible true, one candidate) →
`adoption-plan:sha256:037e840b7efcadec4b09af18a7ceb7f49f95a29cf27d7ea8f88361bebd8597a4`
→ `adoption-sandbox-result:sha256:ee941a9f52cb98a21545db4983ef061cd0ea6e22b3ab3d1c3db80f3c69ac8183`
with `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`, all five metamorphic probes
`PASS`, `sandboxSourceWrites: 1`, zero canonical/Git/external counters,
`cleanupStatus: PASS`, and the canonical catalog byte-identical (digest
`sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
still `export const SELFDEV_ADOPTED_CASES = [];`) before and after with a
clean `git status`. The new `sourceBundleDigest` is
`sha256:89593fb15bee945f8f80fe57e283a9ac00342a5945bcd500ef64a360dfb062f7`;
`contractDigest` is unchanged at
`sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74`
(the closeout is source-provenance hardening, not an evaluator-contract
change).

Phase 8B.0.1 = `COMPLETE`. Phase 8B's historical sandbox acceptance is
preserved. Phase 8B.1 — Owner-Gated Canonical Promotion remains
`NOT_STARTED`/`NOT_AUTHORIZED`, now `READY_FOR_SEPARATE_DESIGN_REVIEW`.

## Phase 8B.1.0 — Catalog-aware synthetic proposal & test-baseline compatibility (complete)

Phase 8B.1.0 repaired the structural compatibility blocker that stopped the
first real Phase 8B.1 canonical promotion from being committed (see the
blocked Phase 8B.1 record above and
`.agent/tasks/phase-8b-1-owner-gated-canonical-promotion/`): the deterministic
synthetic proposer had exactly ONE semantically-distinct "valid" candidate,
so the first real adoption made that candidate a permanent duplicate and
broke ~50 historical assertions across 8 test files that implicitly assumed
the live adopted catalog is always empty and a fresh PASS always exists.

**Production (portfolio).** `src/core/selfDev/portfolio.ts` defines the
bounded deterministic proposal portfolio
(`nightwatch.selfdev-synthetic-portfolio.v1`): EXPAND_SUMMARY (the historical
expansion semantics, unchanged) and EXPAND_THEN_COLLAPSE, in a frozen fixed
order, with coverage and fingerprints DERIVED from the trusted action
registry. `selectNextSyntheticProposalVariant({adoptedEquivalentFingerprints,
adoptedCoverageClasses})` is pure and deterministic (no base SHA/seed/time/
randomness): a variant is novel only when its fingerprint is not adopted AND
its coverage adds at least one class beyond baseline+adopted. The controller
resolves the default/`VALID_MATRIX` alias to a CONCRETE replay fixture
(`VALID_MATRIX_EXPAND` / `VALID_MATRIX_EXPAND_COLLAPSE`) before persisting the
descriptor; historical `VALID_MATRIX` descriptors still replay exactly.
Portfolio exhaustion is a valid terminal state: with A+B adopted the default
session completes normally with `passCandidateCount 0`,
`futureReviewEligible false`, and a bounded diagnostic matrix (no exception,
no fake novelty, no `--variant`/bypass options). The contract manifest was
deliberately bumped to `nightwatch.selfdev-contract.private.v2` binding the
portfolio, its order, and the selection-algorithm version — `contractDigest`
changed by construction. The shared metamorphic non-overreach probe is now
exact relative to baseline+adopted coverage, so the terminal member's
registry-saturated state is correctly recognized.

**Tests (baselines).** `tests/helpers/selfDevSourceFixture.ts` renders
explicit catalog states (EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE) into
committed temporary source repos via the real renderer/validators;
`tests/helpers/selfDevStack.ts` loads the full selfDev stack (session, replay,
trust/eligibility, planner, sandbox, promotion) from one fixture source root,
so evaluation, replay, digests, and eligibility share ONE explicit adopted
state regardless of the checkout the test process runs in. All eight
historically affected test files were refactored to state-explicit baselines;
`tests/unit/selfDevPortfolio.test.ts` (30 tests) covers the selector, the
empty/one-entry/exhausted controller states, contract binding, CLI behavior
under each state, and historical replay-descriptor compatibility.

**Validation.** Pre-fix reproduction: one adopted entry in a synthetic
checkout → 47 failed / 58 passed (rendered one-entry catalog byte-matches the
historical applied postimage `sha256:fa7b71d4...`). Post-fix: full selfDev
lineage green in the real (empty) checkout, in a one-entry isolated
full-history checkout (159 passed — the historical blocker does NOT recur),
and in an exhausted A+B isolated checkout (160 passed — a second adoption
would not recreate the failure; exhaustion is intentional). Full Playwright
682 passed / 1 skipped (2 dirty-tree-only CLI failures, pass on any clean
tree); owner provenance 91; AI regressions 98; campaign synthetic 27;
typecheck, hardening (incl. new `checkPhase8B10PortfolioIntegrity`), git
diff --check, agent-state, and privacy scan all pass. Exact CI run
`31874715283` at `e02aebeb42b2b95995dc20f4123dade866ed71cd` — all steps
success, including the dedicated "Phase 8B.1.0 catalog-aware proposal
compatibility matrix" and the checkout-cleanliness step (real catalog stays
empty).

**Status.** Phase 8B.1.0 = `COMPLETE`. Phase 8B.1 = `BLOCKED` (historical
attempt preserved; approval permanently spent) with retry readiness:
`READY_FOR_FRESH_OWNER_AUTHORIZATION` — a future retry must begin from fresh
source state, a fresh selfDev artifact, a fresh sandbox proof, a fresh
promotion intent, and a fresh one-shot approval; it was NOT retried here.
The real canonical adopted-case catalog remains EMPTY (digest
`sha256:ffe3d635...` unchanged).

**Phase 8B.1.0.1 — continuity ledger & clean full-regression closeout
(complete).** Proved the complete unfiltered Playwright suite green from
clean source state at the starting and final SHAs (685/1/0 real checkout,
682/4/0 isolated mirrors) and reconciled every durable continuity record
with actual history. Exact CI runs 31878642370 @ cf3a757 and 31878877732 @
2e6c2cf completed success.

**Phase 8B.1.0.2 — completed-task continuity protocol & historical ledger
hardening (complete).** Introduced the versioned continuity protocol
`nightwatch.agent-continuity.v2`: strict COMPLETE / BLOCKED / IN_PROGRESS
state machines across ACTIVE_TASK/STATE/PLAN/REPORT, duplicate structured
field rejection, unresolved closure placeholder rejection, current-phase
status binding, non-self-referential finalization (Git/GitHub-Actions live
authority), all-v2 history auditing (`npm run agent:audit`), CI
enforcement, legacy v1 compatibility, and the 8B.1 lineage migration
(8B.1 BLOCKED, 8B.1.0 COMPLETE, 8B.1.0.1 COMPLETE — zero strict v2 errors;
24 legacy tasks remain warnings-only). The pre-fix checker accepted 9/9
impossible completed-task states; post-fix 0/9. Validated implementation
SHA 52a7c173; exact CI 31883287041 success including the Completed-task
continuity audit step; full clean Playwright 747 passed / 4 skipped / 0
failed at the substantive SHA. Phase 8B.1 remains
`BLOCKED`/`RETRY_NOT_STARTED` — `READY_FOR_SEPARATE_FRESH_OWNER_AUTHORIZATION`.

**Phase 8B.1-R1 — owner-gated canonical promotion retry (complete).**
Phase 8B.1-R1 executed the ONE authorized fresh canonical promotion retry
end to end under continuity protocol v2, after first making the CI
catalog-aware:

- **Catalog-aware CI transition (readiness commit `a319849a`, exact CI
  31886682576 success).** The obsolete operational gates — the workflow step
  "Phase 8B.1.0 checkout cleanliness (real catalog must stay empty)" and the
  `checkPhase8B10PortfolioIntegrity` empty-only assertion — were replaced by
  the cardinality-agnostic invariant "the real catalog must remain valid
  canonical adopted-case data": new read-only `bin/selfdev-catalog-integrity.mjs`
  reuses `validateAdoptedCatalog`/`renderAdoptedCatalogSource` to prove
  checkout cleanliness, schema validity, byte-identical canonical rendering,
  pure-data shape, and count <= 64 for ANY supported cardinality (EMPTY /
  one-entry / future two-entry / exhausted). Workflow step became "Phase 8B.1
  catalog integrity / checkout cleanliness"; hardening asserts pure-data
  shape + bin reuse + workflow invocation. Four focused tests added
  (live-file byte round-trip, one-entry fixture, two-entry fixture,
  noncanonical-byte detection); existing tests unweakened. The generated
  catalog stayed EMPTY through the readiness commit.
- **Fresh chain at the frozen base `a319849`.** Fresh v2 session
  `session:sha256:72da8503...` (VERIFIED_EXACT_BASE, replay PASS, 1 pass/1
  duplicate/1 rejected, portfolio SELECTED EXPAND_SUMMARY — candidate A),
  exactly one eligible candidate
  `candidate:f6b8fefb...`, fresh sandbox plan
  `adoption-plan:sha256:4f79e22f...` (strategy
  DECLARATIVE_REGRESSION_CATALOG_PROMOTION, target exactly
  `src/core/selfDev/adoptedCaseCatalog.generated.ts`, preimage
  `sha256:ffe3d635...`, postimage `sha256:fa7b71d4...`) and verified result
  `adoption-sandbox-result:sha256:e9d1d9bf...`
  (`SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED`, all five probes PASS,
  sandboxSourceWrites 1, canonical/Git/external 0, cleanup PASS).
- **Exact one-entry future-state rehearsal** in a disposable full-history
  clone (workspace /tmp/nw-r1-ws with read-only sibling mirrors): the exact
  planned postimage committed locally (never pushed); full Playwright
  751 passed / 4 skipped / 0 failed; local CI-equivalent gates all PASS
  (incl. the new catalog-integrity step at count 1); fresh synthetic session
  in that checkout SELECTED EXPAND_THEN_COLLAPSE (B) with passCount 1 and
  replay PASS — the historical structural blocker does not recur.
- **One promotion, one approval, one APPLY.** Fresh intent
  `canonical-promotion:sha256:7542c947...` (bound to a319849); fresh one-shot
  approval `canonical-promotion-approval:sha256:e065f088...` (exact
  `CANONICAL_ONE_FILE_ONLY` token; ID differs from the spent historical
  approval `17c97035...`); exactly one real APPLY — receipt
  `canonical-apply-receipt:sha256:72f7216e...`, `applyOutcome APPLIED`,
  canonicalSourceWrites 1, runtimeGitWrites 0, externalCalls 0, changed file
  exactly the one target, observed postimage digest exact; approval consumed
  once and permanently spent. Fresh-process verify
  `canonical-promotion-verification:sha256:527a42fd...` —
  `CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`, all four canonical metamorphic
  probes PASS, zero side effects. Post-apply real regression: full Playwright
  752 passed / 1 skipped / 2 failed where the 2 are the documented
  dirty-tree-only CLI tests (fail closed on `SELFDEV_AUTHORITATIVE_SOURCE_DIRTY`
  against the deliberately dirty tree; they pass at the clean one-entry
  state).
- **Canonical adoption commit `24fc437f`** ("Phase 8B.1-R1: canonically adopt
  first verified self-development case") containing exactly
  `src/core/selfDev/adoptedCaseCatalog.generated.ts` (1 entry, digest
  `sha256:fa7b71d4...`); exact CI 31887666112 success — all 22 steps green
  including the catalog-integrity step WITH COUNT=1; committed currentness
  `CANONICAL_PROMOTION_COMMITTED_EXACT`.
- **Post-commit continuation proof.** Fresh session at the committed
  one-entry HEAD
  `session:sha256:31935308...` — SELECTED EXPAND_THEN_COLLAPSE (B),
  passCount 1, replay PASS; read-only inspect proves B eligible with exactly
  one candidate (`candidate:4deb8d42...`); post-commit isolated full-history
  checkout at 24fc437 (`npm ci --ignore-scripts`) full Playwright
  751 passed / 4 skipped / 0 failed.
- **Status.** Phase 8B.1 = `COMPLETE VIA SUCCESSFUL RETRY R1` (the historical
  original attempt remains the truthful `BLOCKED`/CLOSED record; its
  approval stays spent). Canonical adopted-case count = 1 (variant A,
  EXPAND_SUMMARY); portfolio NOT exhausted — variant B
  (EXPAND_THEN_COLLAPSE) AVAILABLE_NOT_ADOPTED. No second approval, no
  second APPLY, no B adoption.

**Phase 8B.1-R1.1 — project-memory & canonical-source truth hardening
(complete).** Phase 8B.1-R1.1 fixed two live-truth defects without touching
adoption/evaluator semantics:

- **Generated catalog authority header corrected (Defect A).** The
  renderer (`renderAdoptedCatalogSource()` in
  `src/core/selfDev/adoptedCases.ts`) and the regenerated
  `adoptedCaseCatalog.generated.ts` previously described the catalog target
  as sandbox-only ("never in this canonical checkout at runtime") — obsolete
  once Phase 8B.1 added the owner-gated canonical-promotion authority. The
  corrected header states the exact partition: Phase 8B sandbox adoption may
  rewrite the target only inside a disposable private source mirror; the
  Phase 8B.1 canonical-promotion executor may rewrite the exact canonical
  target only after the complete owner-gated promotion evidence/approval
  chain, with the development session committing the promoted result;
  ordinary development never hand-edits the generated file (deterministic
  renderer only); no generic self-modification authority exists. The
  existing one-entry catalog was regenerated through the trusted renderer:
  deep semantic equality PASS (adoptedCaseId
  `adopted-case:sha256:90248aae...`, equivalentFingerprint
  `sha256:6a322450...`, fixture/actions/assertions/coverage/strategy
  unchanged; count exactly 1); raw digest `fa7b71d4...` →
  `401b2c67...` (header bytes only); `sourceBundleDigest` changed by
  construction; `contractDigest` unchanged (`d8012fae...`).
- **Duplicate live authority removed (Defect B).** The generic
  `LAST_VALIDATED_IMPLEMENTATION_SHA` / `LAST_DOCUMENTATION_CHECKPOINT_SHA`
  topology rows (Phase 8A.1-era) are gone; live HEAD is discovered from Git,
  and the current implementation checkpoint comes from
  `.agent/ACTIVE_TASK.md` under continuity v2. The Phase 8A.1 anchors are
  preserved as explicitly historical phase-qualified rows
  (`PHASE_8A_1_HISTORICAL_*_SHA`).
- **Project-state v1.** New versioned project-memory protocol
  `nightwatch.project-state.v1` with a machine-checked truth block in this
  file (above), a deterministic read-only checker
  `bin/project-state-check.mjs` (`npm run project:check`), 25 focused
  tests, and the CI "Project-memory truth check" step. The checker validates
  the block against the real validator/renderer/portfolio selector, requires
  ACTIVE_TASK continuity v2 to pass, requires a clean checkout, and rejects
  competing generic live anchors. `NEXT_PROMOTION_AUTHORITY: NONE` is
  enforced exactly; variant B availability never implies authorization.
- **Promotion currentness strictness preserved.** A regression test proves
  an authoritative source change after `CANONICAL_PROMOTION_COMMITTED_EXACT`
  yields strict `CANONICAL_PROMOTION_SOURCE_MISMATCH` for the old R1
  verification — historical R1 evidence stays historical exact evidence;
  current R1.1 source is a later validated state. Currentness logic was not
  modified.
- **Safety.** Zero DEV/NEXT/production contacts, product mutations, DB/infra
  queries, AI/model calls, promotion prepares/approvals/APPLYs, adopted-case
  mutations, or publication. Variant B remains AVAILABLE_NOT_ADOPTED;
  promotion authority NONE; Phase 8 still IN_PROGRESS; next architectural
  capability requires separate design + owner authorization.

**Phase 8B.1-R1.1.1 — canonical catalog authority wording closeout
(complete).** The R1.1 header still carried one false absolute: "runtime
code never writes canonical source" — contradicting the same header's grant
of the bounded canonical target write to the Phase 8B.1 canonical-promotion
executor (which IS runtime code). The corrected authority model, now stated
identically in the module header, the renderer
(`renderAdoptedCatalogSource()` in `src/core/selfDev/adoptedCases.ts`), and
the regenerated `adoptedCaseCatalog.generated.ts`:

- the Phase 8B sandbox executor may write the fixed target only inside a
  disposable private source mirror;
- the Phase 8B.1 canonical-promotion executor is the ONLY runtime authority
  that may perform the bounded canonical target write, and only after the
  complete owner-gated promotion evidence/approval chain;
- runtime promotion code never commits or pushes Git — the development
  session performs the later verified Git commit;
- candidates never directly write source; no generic runtime source-writing
  interface exists.

Deterministic regression tests (`tests/unit/selfDevAdoptionCatalog.test.ts`)
assert the positive invariant and reject the false absolutes; the hardening
check rejects reintroduction with
`PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT`. Regeneration was
header-bytes-only: deep semantic equality PASS (adoptedCaseId
`adopted-case:sha256:90248aae...`, equivalentFingerprint `sha256:6a322450...`,
fixture/actions/assertions/coverage/strategy unchanged; count exactly 1);
raw digest `401b2c67...` → `bd35b934...`; `sourceBundleDigest` changed by
construction; `contractDigest` unchanged (`d8012fae...`); D-51 records the
terminology decision (D-50 preserved as the historical R1.1 record). No
variant-B adoption; promotion authority NONE.

## Phase 8 design review — next architecture (design complete; implementation executed separately)

The next-architecture design review (`phase-8-next-architecture-design-review`,
Phase 8-DESIGN, authorization `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`,
2026-08-15) selected **`PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8`**
(secondary: REPEATABLE_OWNER_GATED_ADOPTION VIABLE_LATER; rejected:
autonomous promotion BY_DESIGN, runtime rollback machinery; deferred: owner
review queue, portfolio expansion). Evidence basis: the Phase 8 objective —
one owner-authorized canonical self-development promotion with a complete
source-bound evidence chain, plus continuation — is fulfilled with live
evidence (R1 at `24fc437`; `CANONICAL_PROMOTION_COMMITTED_EXACT`; post-commit
sessions select B with eligible true); catalog states 0/1/2 and EXHAUSTED
are fixture-proven; CI is cardinality-agnostic; a second adoption of
variant B (a structural canary with zero bug-hunting value) would close
only operational evidence gaps at the cost of ceremony and a source change.
Nightwatch's next investment belongs in the campaign/oracle/triage space.
The full analysis is in `docs/ARCHITECTURE.md` (Phase 8 next-architecture
design review section); the
decision record is D-52.

## Phase 8 final closure & Phase 9 roadmap selection (complete)

The authorized closure task
(`phase-8-final-closure-phase-9-roadmap-selection`, Phase 8-CLOSURE,
authorization `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`, 2026-08-15)
executed the design review's recommendation and closed Phase 8:

- **Project-state pin transition.** `bin/project-state-check.mjs` now
  requires `PHASE_8_STATUS: COMPLETE` (the pre-closure `IN_PROGRESS` pin is
  gone); the machine-checked truth block in this file was regenerated to
  `PHASE_8_STATUS: COMPLETE` while keeping `PHASE_8B_1_STATUS:
  COMPLETE_VIA_SUCCESSFUL_RETRY_R1`, `CANONICAL_CATALOG_ENTRY_COUNT: 1`,
  `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`, and
  `NEXT_PROMOTION_AUTHORITY: NONE`. Project-state protocol version stays
  `nightwatch.project-state.v1` (a normal value transition under the same
  schema/authority contract). Regression matrix updated: COMPLETE passes,
  IN_PROGRESS fails, arbitrary values fail, and the load-bearing invariant
  "Phase 8 COMPLETE never grants promotion authority" is explicitly tested.
- **docs/design checkpoint allowlist.** `bin/agent-state.mjs`
  `APPROVED_CHECKPOINT_PATHS` gained the narrow single-level pattern
  `/^docs\/design\/[^/]+\.md$/` so repository-native design documents are
  legitimate documentation-only descendants; negative tests prove nested
  directories, non-Markdown files, traversal forms, `docs/random.md`, and
  `src/design/foo.md` are rejected, and a docs/design + source commit is
  IMPLEMENTATION. Existing approved paths are unregressed; hardening guards
  assert the pin and the narrow pattern.
- **Canonical-promotion research boundary.** Phase 8 is COMPLETE, not
  FROZEN: the owner-gated promotion machinery is retained intact; there is
  no standing promotion authority; future use requires a concrete
  bug-hunting-value candidate + fresh owner authorization + fresh
  current-source evidence + fresh one-shot approval + one bounded APPLY.
- **Phase 9 selection.** The evidence-backed primary bottleneck is
  `insufficient semantic oracle depth` (protocol-only deterministic
  oracles; zero DOMAIN/RELATIONAL/value-level oracles; zero admitted
  findings across all real campaigns; the historical budget-starvation
  finding fixed by Hardening I/I.1). Selected:
  **`PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH`** —
  **Phase 9 — Deterministic Semantic Oracle Depth** — with an
  implementation-ready future-task spec in `docs/design/PHASE_9_ROADMAP.md`
  (D-53 records the decision). `PHASE_9_STATUS:
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED`;
  `PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.

Machine-checked truth block (current): catalog count 1, digest
`sha256:bd35b934...`, variant B AVAILABLE_NOT_ADOPTED, promotion authority
NONE, `PHASE_8_STATUS: COMPLETE`. No Phase-8C status was invented; no
catalog byte changed; no promotion machinery was used.

## Hardening Campaign I / I.1 — current durable closure

### Hardening Campaign I

`Hardening Campaign I: COMPLETE`.

- Hardening implementation checkpoint:
  `78cd8d60f6a743985d5b0eae2560f6d06c40dbe4`.
- Hardening closure documentation head before this I.1 task:
  `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- `REMOTE_CI_STATUS=CONFIRMED_PASS_AT_HARDENING_CLOSURE` for
  `ba5b518736281f48640982fcbdb6c874bc3e3123`. The historical Hardening I
  report's pending-CI wording remains accurate for the time it was written.

Main hardening results were:

- strict manifest fingerprint reconstruction;
- strict checkpoint validation;
- atomic budget accounting;
- bounded reproduction reserve;
- explicit child environment allowlisting;
- stable private filesystem roots;
- no-symlink / owner-only boundaries;
- canonical config provenance;
- DEV-only automated credential execution;
- Oops byte-digest provenance;
- truthful morning brief semantics;
- complete Playwright TypeScript config coverage;
- offline hardening check;
- private read-only GitHub Actions.

### Hardening Campaign I.1

`Nightwatch Codebase Hardening Campaign I.1: COMPLETE`.

The confirmed defect was checkpoint integrity only. It was not evidence of
production reachability, budget overrun, mutation, credential exposure, or a
product bug. The old predicate accepted `PARTIAL_BUDGET_EXHAUSTED` plus
`BUDGET_EXHAUSTED` when any remaining dimension was zero and its used key was
present. Because the bounded real profile intentionally sets
`maxExplorationContexts=0`, an unused ordinal-zero checkpoint could satisfy
that condition.

The fix requires a generic dimension to prove `policy limit > 0`,
`used == policy limit`, and `remaining == 0`; the existing exact arithmetic
invariant remains enforced for every dimension. No exact exhaustion-cause
field existed in the current checkpoint schema, so no schema migration was
introduced.

The validated I.1 implementation checkpoint is
`5de817764a4d58eaa1a5c0109464667f552cda5e`. Regression coverage proves the
zero-limit false-positive rejects before executor work with the sanitized
reason `BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION`, a legitimate
positive-cap exhaustion checkpoint is accepted, and mixed disabled-plus-
genuinely-exhausted dimensions are accepted. Current local validation is
399/399 Playwright tests, TypeScript PASS, hardening check PASS, synthetic
campaign PASS, agent-state PASS, and diff check PASS.

The first documentation checkpoint passed the private read-only workflow
(`Nightwatch hardening`, run `31758018614`, head
`801c307f77c27f33e4612462fffd08c4cf60fc60`). A final completion-state
documentation-only descendant is intentionally not self-referenced in this
file; its exact local/remote equality and workflow result are recorded in the
I.1 task handoff and completion response after verification.

## Phase 9 — Deterministic Semantic Oracle Depth (complete, local/synthetic)

`PHASE_9_ORACLE_DEPTH_STATUS: COMPLETE` (2026-08-16). The owner-authorized
implementation task (`phase-9-deterministic-semantic-oracle-depth`,
`PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`) delivered the full local/
synthetic stage and closed under `nightwatch.agent-continuity.v2` (D-54;
implementation record in `docs/design/PHASE_9_ROADMAP.md` §17):

- **Projection layer** (`src/oracles/projections/**`,
  `nightwatch.semantic-projection.v1`): ephemeral raw observations ->
  safe DTOs (paths, types, presence, shape, bounded counts, opaque
  encounter identity tokens, numeric relation refs); canonical byte-
  identical serialization + digests; hard caps; hostile-input fail-closed;
  `ProjectionContext` in-memory only, never serialized; fixed-point numeric
  relations emit facts only (no raw amounts).
- **Expectations** (`src/oracles/expectations/**`,
  `nightwatch.semantic-expectation.v1`): declarative contracts, strict
  validation, provenance bound to repo @ SHA with fail-closed staleness;
  one static source adapter for the synthetic fixture corpus and real
  read-only checkouts; real-source canary NOT_ADMITTED (no invented real
  product semantics).
- **Oracles** (`src/oracles/invariants/**`, `src/oracles/semantic/**`):
  fixed invariant vocabulary; safe finding DTO + categorical fingerprints;
  fail-closed classification order.
- **Corpus + FP control** (`corpus/phase9/**`): 5/5 required seeded
  semantic classes detected; 0 false positives on 10 benign cases;
  baseline protocol detection 0/5 (proven at M1); sentinel matrix zero
  leaks incl. failure paths and derived shapes.
- **Pipeline integration**: Phase 5 composed protocol/semantic stage;
  network-observer semantic hook; findings through the existing campaign
  orchestrator -> admission -> triage -> dossier (5 sanitized semantic
  dossiers from the seeded campaign pair; baseline admits none); dossier
  additive `semanticEvidence` (backward compatible).
- **Validation**: typecheck/hardening PASS; Phase 9 focused matrix 101
  passed; full regression 896 passed / 1 skipped / 0 failed; isolated
  full-history checkout 893 / 4 / 0; exact implementation CI
  31929017844 success at `e74185bf7b83783c2b7421e675ea2d3bb9053482`
  (29/29 steps incl. the Phase 9 matrix step); catalog byte-identical
  `sha256:bd35b934...`; `PHASE_8_STATUS: COMPLETE`; B
  AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`.
- **Phase 9B**: `PHASE_9_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`
  (not executed; no DEV contact).

## Phase 9A.1 — Real-Source Expectation Admission & Semantic Evaluation Observability (complete, local/source-only/synthetic)

`PHASE_9A_1_STATUS: COMPLETE` (2026-08-16). The owner-authorized readiness
task (`phase-9a-1-real-source-expectation-admission`,
`PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`) closed the three Phase 9B
readiness gaps and set `PHASE_9B_DEV_READINESS:
READY_FOR_SEPARATE_AUTHORIZATION` (D-55; records in
`docs/design/PHASE_9_ROADMAP.md` §18, `docs/ARCHITECTURE.md`, and the
Phase 9B future-task spec `docs/design/PHASE_9B_TASK_SPEC.md` — design only,
NOT_AUTHORIZED):

- **Real-source admission bridge** (`src/oracles/expectations/recipes/**`,
  `extract/**`, `admission.ts`): data-only recipes
  (`nightwatch.real-source-expectation-recipe.v1`) + fixed bounded
  syntax-aware PHP extractors (PUSH/ASSIGN row literals, builder-list
  returns, Routing.yaml bindings; never executed, no regex-as-authority) +
  source-evidence digests (`ev:sha256:<24>` over the normalized source
  structure) + strict validation/registry (approved read-only targets
  only). 4 expectations admitted from live `mobingilabs/ripple-api @
  27bb007a` (common-exchange, payer-exchange, account-inventory,
  billing-group-exchange; 3 DEV-reachable); no Alphaus annotations;
  billing-groups-legacy rejected (AMBIGUOUS); gRPC billing-groups deferred.
- **Atomic resolver + currentness** (`resolver.ts`): expectation + exact
  source snapshot together; freshness matrix A-F; multi-repo swap
  rejection; synthetic-rebinding rejection
  (`REAL_SOURCE_EXPECTATION_PROOF_MISSING` semantics).
- **Safe evaluation receipts** (`src/oracles/semantic/receipts.ts`,
  `nightwatch.semantic-evaluation-receipt.v1`): nine outcomes;
  NO_EXPECTATION/STALE/UNAVAILABLE/N-A/INTERNAL_ERROR never PASS; hook
  returns receipt + findings; observer `semanticEvaluations()` ledger
  (cap 512, explicit overflow); no-silent-failure; privacy violations
  escalate via the safety architecture; Phase 5 composed stage exposes
  receipts (additive).
- **Validation**: typecheck/hardening PASS; focused Phase 9 + 9A.1 matrix
  212 passed; full regression 994 passed / 1 skipped / 0 failed; isolated
  full-history checkout at the implementation SHA green (983 / 4
  environment-conditional skips / 0); exact implementation CI 31932079316
  success at `cfc2aaa65227b2caf26d2d51533bf32ecc489028` (29/29 steps incl.
  the new Phase 9A.1 matrix step); live canary 4 derived / 4 current /
  0 stale; conforming synthetic bodies PASS x4; mutated synthetic bodies
  ANOMALY x4; sentinel leaks 0; catalog byte-identical `sha256:bd35b934...`;
  `PHASE_8_STATUS: COMPLETE`; B AVAILABLE_NOT_ADOPTED;
  `NEXT_PROMOTION_AUTHORITY: NONE`.
- **Phase 9B**: `PHASE_9B_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED`; the
  future-task spec is design only; acceptance requires
  EXPECTATION RESOLVED + SEMANTIC EVALUATION RECEIPT EXISTS + OUTCOME IS
  EXPLICIT + ZERO PRIVACY/SAFETY FAILURE (zero anomalies is valid healthy
  evidence; zero expectations/receipts, stale source, or internal errors
  mean NOT PROVEN).

## Phase 9B — Contained DEV Semantic Acceptance (harness implemented + validated; DEV acceptance BLOCKED at the pre-browser auth gate)

`PHASE_9B_STATUS: BLOCKED` / `PHASE_9B_DEV_RESULT: NOT_PROVEN` /
`PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` (2026-08-16).
The owner-authorized Phase 9B task
(`phase-9b-contained-dev-semantic-acceptance`,
`PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, starting SHA
`62ec80426035e979b563135d858bdc1438d84fb4`) built and validated the complete
contained DEV semantic acceptance harness and executed the ONE authorized
acceptance pair through the gated launcher; the run stopped fail-closed at
the pre-browser readiness gate (D-56; records in
`docs/design/PHASE_9_ROADMAP.md` §19, `docs/ARCHITECTURE.md`,
`docs/SAFETY_MODEL.md`, and `docs/DECISIONS.md`):

- **Wiring**: `NightwatchContextOptions.semanticOracle?` passes the admitted
  real-source resolver into `createNetworkObserver` (no global default, no
  env-created authority).
- **Pure Phase 9B core** (`src/core/phase9b/`): source-freshness classifier
  (A-F; F2 REDERIVE_FRESH_SNAPSHOT binds to the fresh exact remote snapshot,
  never the stale reviewed SHA), metadata-only pre-dev readiness gate
  (13 checks; ANY failure -> NO DEV CONTACT), normalized safe pass summaries
  - one-pass acceptance gate (decisive = invariantPassCount > 0 or ANOMALY)
  - replay comparison (never raw values).
- **Gated launcher + runner**: `bin/phase9b-real.mjs` (`--env=dev` +
  `--storage-state` only; one-shot `NIGHTWATCH_PHASE_9B_REAL=1`) driving
  `tests/manual/phase9b-contained-dev-semantic.ts` — the fixed
  `ripple-common-exchange-read` pair (FIRST + one fresh-context replay)
  through the existing Phase 2B machinery; expectation
  `ripple.common-exchange.read.real-source-shape` exposed ONLY; unit
  matrices (34), hardening guards, CI matrix step (local/synthetic only).
- **Source freshness (read-only)**: ripple-api master `169df39d` and
  ripple-ui dev `818ce2da` advanced beyond the reviewed SHAs; relevant
  contract + journey source mechanically unchanged (byte-identical files,
  identical route block) -> F2; fresh derivation at `169df39d`:
  4 derived / 0 failures; selected digest
  `ev:sha256:608265368c9a086f43c94e5c`; restricted resolver RESOLVED.
  Disposable /tmp mirrors only; canonical sibling checkouts untouched.
- **Validation**: substantive checkpoint `cdfdf314839fd782a962e4096b68b32641a93db2`
  with exact implementation CI 31934803846 (completed/success/exact SHA,
  29/29 steps incl. the Phase 9B harness matrix step); full regression
  1026/1/2 dirty-tree (the only 2 failures = documented dirty-gate);
  isolated clean checkout 1017/4/0.
- **Execution**: the one launcher run passed source freshness, derivation,
  resolver RESOLVED, exact-head CI, proxy, and target checks, then FAILED
  the auth structural gate — the external DEV storage-state
  `mo_access_token` cookie is EXPIRED (boolean-only diagnostics). No
  browser context was created; zero DEV contact; zero artifacts; DEV
  semantic acceptance NOT proven; retry requires a human-led
  `npm run auth:capture` refresh plus a fresh owner authorization.
- **Phase 9B-R1 (2026-08-16)**: the fresh owner authorization
  (`PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`) after the
  owner's human-led auth refresh succeeded:
  `PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED` /
  `PHASE_9B_R1_DEV_RESULT: PASS` / `PRODUCT_SEMANTIC_MISMATCH:
  NONE_OBSERVED` / `PHASE_9_STATUS: COMPLETE`. The already-validated harness
  (cdfdf31 / exact CI 31934803846, zero source changes) ran exactly once:
  ripple-common-exchange-read FIRST + one fresh-context REPLAY against
  canonical DEV, both decisive PASS (resolved 1, receipts 1, PASS 1,
  decisive 1, invariants passed 3, anomalies 0) under expectation
  ripple.common-exchange.read.real-source-shape @ ripple-api 169df39d
  (digest ev:sha256:608265368c9a086f43c94e5c); replay deterministic; zero
  hard semantic outcomes; zero safety violations; privacy audit PASS;
  launcherInvocations 1 / browserContextsCreated 2 / devObservationPasses
  2 / completedJourneyPairs 1 (D-57). The original Phase 9B authorization
  remains spent and its task stays BLOCKED historical (D-56).

## Post-Phase-9 next-architecture design review (complete; Phase 10 designed, NOT authorized)

`POST_PHASE_9_ARCHITECTURE_DESIGN_STATUS: COMPLETE` (2026-08-16). The
owner-authorized design review (`post-phase-9-next-architecture-design-review`,
Phase `POST-9-DESIGN`, authorization
`POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, starting SHA
`aba46a9a`) recomputed the bug-yield bottleneck from current source and
selected the next bug-hunting investment (D-58; full analysis in
`docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md`):

```
PHASE_9_STATUS: COMPLETE (terminal; 9B-R1 VERIFIED/PASS, D-57)
CURRENT_PRIMARY_POST_PHASE9_BOTTLENECK:
  INSUFFICIENT_REAL_SEMANTIC_DEPTH
POST_PHASE_9_NEXT_ARCHITECTURE:
  DEEPER_REAL_SOURCE_SEMANTICS
NEXT_PHASE: PHASE_10 — Deeper Real-Source Semantic Contracts
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
```

Evidence basis (source-verified, not roadmap lore): all 4 admitted
real-source expectations are shape-only (root TYPE_MATCH ARRAY +
FIELD_PRESENT per item key; `src/oracles/expectations/admission.ts:135-145`);
real-DEV-accepted 1; L3+ invariant count 0/4; coverage rows capped at
~4-5 operations by the approved read-only surface while depth has provable
headroom in the pinned ripple-api source ((object) cast at
`ExchangeRate.php:92-94`, `CURRENCY_RANGE_VALIDATE` at `:29-37`, vendor
permission lists at `:40`); P(detection) is the dominant term with the
most headroom in `surfaces × P(defect) × P(detection) × P(actionable)`.
The old Phase 9 runner-up (triage confidence) was NOT retained as primary
(triage cannot create detections; zero real anomalies ever observed) and
is NEXT_AFTER, together with a recorded follow-up finding (real
minimization false-1-MINIMAL certification risk,
`orchestrator.ts:799-802` + `phase7-real-campaign.ts:360-366` — documented
in the design doc Appendix F; NOT fixed by this review). NEXT_AFTER:
HIGH_CONFIDENCE_SEMANTIC_TRIAGE, REAL_SEMANTIC_COVERAGE_EXPANSION;
VIABLE_LATER: BROWSER_API_SEMANTIC_DIFFERENTIAL,
CAMPAIGN_SEMANTIC_YIELD_INTELLIGENCE; DEFER: SOURCE_CHANGE_GUIDED_SEMANTIC_
SELECTION, MULTI_PRODUCT_EXPANSION, SELF_DEVELOPMENT_2ND_ADOPTION.

Phase 10 is DESIGNED, NOT STARTED, NOT AUTHORIZED. Implementation requires
a fresh owner authorization (`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`
for the local/synthetic Phase 10A; optional later
`PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` for one contained DEV
acceptance of the enriched common-exchange expectation). Machine-checked
truth block unchanged: catalog count 1 (digest `sha256:bd35b934...`),
variant B AVAILABLE_NOT_ADOPTED, promotion authority NONE,
`PHASE_8_STATUS: COMPLETE`. Phase 6 remains FROZEN_BY_OWNER; AI remains
non-authoritative.

## Phase 10A — Deeper Real-Source Semantic Contracts (complete, local/synthetic)

`PHASE_10_DEEPER_SEMANTIC: COMPLETE` / `PHASE_10A_STATUS: COMPLETE` /
`PHASE_10B_STATUS: COMPLETE` (Phase 10B DEV acceptance executed 2026-08-17,
D-60: `PHASE_10B: COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED` /
`PHASE_10B_DEV_RESULT: PASS` / `DEEP_INVARIANT_DEV_VALIDATION: VERIFIED` /
`PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED` / `PHASE_10_STATUS: COMPLETE`;
record in `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`; Phase 10A itself
(2026-08-16, D-59) implementation and acceptance record in
`docs/design/PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md`).
The owner pasted the Phase 10A prompt as the separate owner authorization
(`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`, starting SHA `c3393ce5`).

- **Current-source truth (re-verified, NOT D-58's historical reading)**:
  read-only remote metadata → mobingilabs/ripple-api master
  `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`; canonical sibling checkout
  untouched at the Phase 5 pin `27bb007a`; derivation used a disposable
  /tmp snapshot at 169df39d. `ExchangeRate.php` is byte-identical across
  the two SHAs. Common-exchange `exchange_rate` is ALWAYS a JSON OBJECT —
  the empty case is `(object)`-cast to `{}` (the D-58 "ARRAY when empty"
  claim is refuted by the actual cast direction). Payer-exchange
  `exchange_rate` is OBJECT-or-ARRAY (`[]` when no rates; no cast).
  Finite output-key sets: `SOURCE_ENUM_FLOW_UNPROVEN` for both targets
  (output keys are runtime-driven; `CURRENCY_RANGE_VALIDATE` is write-path
  validation only) ⇒ no finite-key invariant, no class-constant extractor,
  no `OBJECT_KEYS_SUBSET_OF` — nothing beyond mechanically proven source
  flow.
- **Versioning/identity**: recipe schema v2
  (`nightwatch.real-source-expectation-recipe.v2`) for common-exchange +
  payer-exchange (item-level `itemFieldTypeContracts` proven by the fixed
  bounded `PHP_ITEM_FIELD_TYPE_FLOW` extractor; v1 byte-meaning-stable for
  account-inventory + billing-group-exchange; retired v1 recipes archived
  under `corpus/phase10/historical/`); new fixed invariant `TYPE_IN_SET`
  (payer OBJECT|ARRAY; common uses the existing `TYPE_MATCH OBJECT`);
  semantic expectation DTO stays `nightwatch.semantic-expectation.v1`;
  deep expectation IDs `...real-source-deep` (historical
  `...real-source-shape` IDs stay historical-only); derivation v2; the
  type-flow evidence participates in the ev:sha256 digest (canonical
  branch; unknown extraction kinds fail closed).
- **Proof (synthetic)**: 4 seeded deep defects — shape-only baseline 0/4,
  enriched 4/4; benign 10 / FP 0 (incl. the payer valid empty-ARRAY union
  representation — PASS); sentinel sweep + unknown-key probe 0 leaks;
  derivation determinism 3 repeats / 0 mismatches; currentness matrix A–E
  - §44 mutation canaries fail closed; synthetic campaign: enriched
  expectations → TYPE_CONTRADICTED findings → existing orchestrator →
  triage → dossiers with `semanticEvidence` (paired baseline zero
  semantic evidence); owner-local canary at 169df39d: 4/4 derived / 0
  failures / depths [2,2,3,3] (L3+ = 2/4).
- **Validation**: typecheck/hardening PASS; focused Phase 9+9A.1+9B+10
  matrix 342 passed; full Playwright 1137 passed / 1 skipped
  (environment-conditional) / 0 failed; exact implementation CI
  31946005458 success at `6cef0c45b0733c3a7179789b360eeaba40ab931b`
  (32/32 steps incl. the Phase 10 matrix step); fresh clean-checkout
  acceptance green; catalog byte-identical `sha256:bd35b934...`;
  `PHASE_8_STATUS: COMPLETE`; B AVAILABLE_NOT_ADOPTED;
  `NEXT_PROMOTION_AUTHORITY: NONE`; agent:check/audit strict 0;
  project:check PASS at clean tree.
- **Boundaries**: NO DEV/NEXT/production; no new endpoints/journeys; no
  campaign/triage core change; no projection schema change; no Phase 6/AI/
  selfDev/promotion/catalog; the real-minimization false-1-MINIMAL
  follow-up finding (#1) stays with HIGH_CONFIDENCE_SEMANTIC_TRIAGE
  (NEXT_AFTER).
- **Next**: STOP. Phase 10B contained DEV acceptance was EXECUTED
  (2026-08-17, D-60): ONE common-exchange journey pair, the enriched deep
  expectation `ripple.common-exchange.read.real-source-deep` re-derived at
  the fresh snapshot (digest `ev:sha256:1447fe1342d804528a062b73`),
  FIRST + fresh-context REPLAY both clean deep PASS (4/4/0/0/0,
  deterministic), zero safety events; acceptance record in
  `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`. NEXT ACTION remains STOP —
  next architecture requires a separate post-Phase-10 design review.

## Post-Phase-10 design review — next bug-hunting architecture (design complete; implementation NOT authorized)

`POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS: COMPLETE` (2026-08-16). The
owner-authorized design review
(`post-phase-10-next-architecture-design-review`,
Phase `POST-10-DESIGN`, authorization
`POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, starting SHA
`1d7dd6cb6525195e59602e106f50306859a7998d`) recomputed the useful-bug-yield
bottleneck from current source after the terminal Phase 10 and selected the
next bug-hunting investment (D-61; full analysis in
`docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md`):

```
PHASE_10_STATUS: COMPLETE (terminal; 10B VERIFIED/PASS/NONE_OBSERVED, D-60)
CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK:
  COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP
POST_PHASE_10_NEXT_ARCHITECTURE:
  BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION
NEXT_PHASE: PHASE_11 — Bounded Collection-Wide Semantic Evaluation
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
```

Evidence basis (source-verified): all 4 admitted real-source contracts
are collection-style (top-level ARRAY). Item-level invariants evaluate
only item 0 (blueprint itemIndex:0 in all 4 registry recipes; admission
builds single-index paths; invariant evaluator resolves exactly one
numeric node; projection retains up to 128 items but nothing consumes
more than one). A synthetic proof (throwaway test, deleted after the run)
confirmed: a defect at row 1, 57, or 200 of a multi-row response is
invisible (PASS) for FIELD_PRESENT, TYPE_MATCH, and TYPE_IN_SET, while
row-0 violations are detected (ANOMALY). The real minimization gap
(invalidReducedReplay stub) remains CURRENT (D-58 finding #1, unfixed).
Differential has 0 viable pairs. Coverage expansion is capped. P(detection)
is the dominant term; collection-wide evaluation directly raises it.
Triage NOT auto-selected: creates zero detections, latent until a natural
anomaly.

NEXT_AFTER: HIGH_CONFIDENCE_SEMANTIC_TRIAGE, REAL_SEMANTIC_COVERAGE_
EXPANSION; VIABLE_LATER: BROWSER_API_SEMANTIC_DIFFERENTIAL,
SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE; DEFER: SOURCE_CHANGE_GUIDED_
SEMANTIC_SELECTION, DEEPER_RELATIONAL_SEMANTICS, MULTI_PRODUCT_EXPANSION,
SELF_DEVELOPMENT_2ND_ADOPTION, SECOND_DEEP_DEV_CANARY.

Phase 11 is DESIGNED, NOT STARTED, NOT AUTHORIZED. Implementation requires
a fresh owner authorization. Machine-checked truth block unchanged: catalog
count 1 (digest `sha256:bd35b934...`), variant B AVAILABLE_NOT_ADOPTED,
promotion authority NONE, `PHASE_8_STATUS: COMPLETE`. Phase 6 remains
FROZEN_BY_OWNER; AI remains non-authoritative.

## Phase 16B — contained DEV portfolio campaign acceptance (terminal: blocked at the runtime-binding gate; zero DEV contact)

`PHASE_16B_STATUS: BLOCKED_RUNTIME_BINDING_MISSING` (2026-08-23). Under owner
authorization `PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE` plus the
handoff gate value `PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED`
(both recorded before any DEV contact), the task traced the mandated chain
(plan -> dev-handoff -> authorization gate -> campaign runtime ->
owner-policy gate -> executor -> checkpoint/resume) in current source and
proved mechanically that NO safe path converts the authorized inert handoff
into the existing bounded campaign runtime: the handoff/plan manifest have no
consumers outside `src/core/portfolio/**`, `bin/portfolio.mjs`, and unit
tests; `bin/phase7-real.mjs` accepts only env/storage-state/ui-url/
prepare/resume options and its adapter composes its own frozen manifest from
a fixed bounded profile; the literal gate token is consumed by nothing; the
default deterministic plan selects three synthetic-fixture-only targets with
no runtime counterpart. Per SPEC §3 the task stopped WITHOUT implementing a
bypass, without DEV contact (zero browser/network/auth activity), and without
manufacturing a source checkpoint. The candidate plan/handoff were proven
byte-deterministic (plan x3 identical, trailing digest prefix
`bf4bde06eb2414fd`; handoff x2 identical,
`handoff:sha256:fcc58e79be98305dd44e8325`) and strictly parser-valid, but
never frozen for execution. Post-run gates: typecheck/hardening PASS; focused
Phase 16A+16H suites 98/0; campaign:synthetic 27/0; owner-provenance 91/0;
agent/project checks PASS. Full evidence:
`.agent/tasks/phase-16b-contained-dev-portfolio-campaign-acceptance/REPORT.md`.

## Phase 16C — portfolio runtime binding & real approved universe (complete, local/source/synthetic)

`PHASE_16C_STATUS: COMPLETE (HARDENED_LOCAL_SOURCE_SYNTHETIC)`
(2026-08-23, D-67/D-68). Under `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY`
the Phase-16B blocker was removed inside the ONE existing prepare/resume
architecture: canonical runtime-profile linkage; deterministic real approved
universe (payer/common/inventory x journey/API/exploration, synthetic fixtures
excluded by construction, exploration explicitly runtime-restricted); strict
admission of inert handoff+plan+universe+separately-supplied authorization
(23 bounded categorical reasons; authorization non-mutating; handoff stays
executable:false); versioned monotone-restrictive budget mapping v1;
schema-OPTIONAL `portfolioBinding` frozen into campaignId+fingerprint via
conditional spread so drift fails resume before executor while legacy
manifests stay byte-stable; single opt-in launcher input pair with strict path
validation and unchanged legacy surfaces. Phase 16CH then reproduced and
repaired the reserve arithmetic and unsafe diagnostic-key defects, ran the
171-case corpus and full canonical/isolated parity proof. Full evidence:
`.agent/tasks/phase-16c-portfolio-runtime-binding-real-universe/REPORT.md` +
`RUNTIME_BINDING_HANDOFF.md` +
`.agent/tasks/phase-16ch-portfolio-runtime-binding-hardening/REPORT.md`.
`PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI`; `PHASE_16D_DEV_RETRY:
NOT_AUTHORIZED`. DEV WAS NOT EXECUTED.

## Phase 16CH — portfolio runtime-binding hardening (terminal: local green, CI externally blocked)

`PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` (2026-08-23, D-68). The dedicated
local/source/synthetic hardening task validated the Phase-16C seam at
`794b32df443ae8c9a520182ef97b7a2c9985ba82`. DEF-01 repaired reserve
double-counting in the budget-feasibility guard while preserving the
three-API fail-closed boundary; DEF-02 bounded unsafe external field-name
diagnostics without echoing values. The 171-scenario adversarial corpus ran
three byte-identical complete repetitions with all thirteen quality floors at
zero. Affected compatibility was 172/0, `campaign:synthetic` was 27/0, and
owner provenance was 91/0.

The canonical complete Playwright suite was 2,232 passed / 4 skipped / 0
failed. A fresh topology-correct isolated clone with `npm ci`, read-only
aggregate sibling symlinks and `NIGHTWATCH_PROXY_PORT=19123` produced the
exact same 2,232 / 4 / 0 and the same four skip identities. The catalog
count/digest stayed unchanged and `NEXT_PROMOTION_AUTHORITY` stayed `NONE`.
Actions run 32624917568 / job 97158631282 completed as failure before any
step under the standing external billing/spending condition; local green is
not represented as CI green. Phase 16D remains separately unauthorized.

## Phase 17 — change-aware campaign and evidence hardening (terminal local; CI externally blocked)

`PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` on implementation
checkpoint `482ed51814ce8e8f7d67de7edc9a98786240430c`. The pure
`src/core/portfolio/changeImpact.ts` overlay consumes an already-produced
Phase 3 `SelectionResult` and an approved portfolio, carries only bounded
categorical impact facts, and reuses the canonical allocator. Direct, shared,
transitive, fallback, stale, irrelevant, and unlinked cases are covered; a
fallback or stale source result receives no positive ranking lift. The
allocation carries a deterministic selection-context digest and sanitized
reason tokens into the plan manifest without granting runtime authority.

The same checkpoint canonicalizes change/correlation identities across object
property order and omitted optional fields, strictly validates versioned
baseline documents before read/write, rejects inherited required fields and
contradictory references, and projects hostile duplicate/identity/URL-shaped
diagnostics to a fixed redaction marker. Repeated-action minimization remains
historical-schema compatible but refuses to construct occurrence-specific
proven minimality evidence when the public action-ID surface is ambiguous.
`corpus/phase17/changeImpactFixtures.ts` and the focused 27-test matrix cover
direct/shared/transitive/irrelevant/ambiguous/deleted/renamed/stale/
simultaneous source changes, malformed baselines, privacy sentinels,
repeated-action replay, and three-run byte stability. The affected
change-intelligence/portfolio/replay cone is 142 passed / 0 failed. The first
integrated run exposed seven Phase 15P readiness failures because broad
identity redaction misclassified `ripple-account-inventory.read`; DEF-17-06
narrowed the detector to identifier-shaped values and the repair matrix passed
52/0.

The final canonical full regression passed 2259 / 0 / 4 out of 2263, and a
fresh topology-correct isolated clone with `npm ci`, read-only aggregate
sibling symlinks, `NIGHTWATCH_SIBLING_ROOT`, and
`NIGHTWATCH_PROXY_PORT=19123` passed the exact same result and skip inventory.
This is LOCAL / SOURCE / SYNTHETIC evidence only. No DEV/NEXT/production
contact, authenticated session, product/data mutation, datastore/cloud/infra
operation, sibling write, publication, credential handling, or real finding
persistence occurred. Actions run 32628613509 / job 97167784939 completed as
failure with zero steps under the external billing/spending block; local green
is not CI green. Phase 16D remains separately unauthorized; Phase 6 is
`FROZEN_BY_OWNER`; Phase 11B/13B remain unauthorized.

## Phase 19 — autonomous bug-yield expansion and integrated campaign intelligence

Phase 19 is the current local implementation wave. It composes existing
Phase 9–18 authorities into an explicit deterministic loop:

source/change impact → affected behavior/contracts → campaign plan
→ semantic coverage and oracle execution → replay → minimization
→ stability/confidence → clustering → owner dossier → yield/coverage learning

The additive versioned cores are campaign plan, impact report, coverage
matrix, yield report, replay fidelity V4, minimization V2, nondeterminism,
finding clusters V2, confidence V2, and owner dossier V3. Planning uses
bounded explainable components and reason codes; source currentness, semantic
authority, safety, and owner policy remain hard gates. Product integration is
generic at the adapter boundary, while the real registry remains Ripple-only;
a second product exists only as a synthetic fixture.

The Phase 19 corpus contains 31 data-driven adversarial cases. Focused Phase
19 tests passed 12/0; the affected compatibility cone passed 414/0;
campaign:synthetic passed 27/0; owner provenance passed 91/0 on rerun. The
canonical full suite enumerated 2,297 with 2,293 passed, 4 skipped, and 0
failed. The topology-correct isolated clone produced the exact same result
and skip inventory. The four skips remain the three unavailable source-built
OOPS cases at phase5Api.test.ts:197, :246, :280 and the base-uid case at
selfDevSandboxConfinement.test.ts:147.

Phase 19 remains LOCAL / SOURCE / SYNTHETIC only. It adds no DEV/NEXT/
production, data, infrastructure, sibling-write, publication, AI, or
self-development authority. The owner freeze remains
FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE.

## Environment (machine facts)

- Node v22.22.1, npm 10.9.4, Playwright Test 1.62.1, TypeScript 5.x, git 2.43.0
- System Google Chrome at `/opt/google/chrome/chrome` via `channel: 'chrome'` (fallback: `npx playwright install chromium` + remove `channel` from `playwright.config.ts`)

## Phase 20 — semantic coverage saturation and cross-surface differential detection

Phase 20 is the local/source/synthetic implementation wave that expands the
Phase 19 bug-yield loop with mechanically justified behavior inventory,
relational contracts, explicit cross-surface equivalence, metamorphic checks,
contract-derived mutation measurement, and graph-driven gap planning. The
implementation checkpoint is `c58684046d66b2a68234a06c62dea889829d4110`.

The deterministic synthetic inventory covers 6 source artifacts and 22
candidates: 21 mechanically provable/admitted candidates and 1 explicitly
rejected unsupported-syntax candidate. The contract graph contains 22 contract
records, 157 nodes, 151 edges, and 86 lifecycle gaps. The evaluator admits 13
relational kinds represented by 12 synthetic relation records, 1 explicitly
declared browser/API differential pair, and 3 synthetic metamorphic relations
from a 7-kind bounded vocabulary. Observation projections expose only safe
type/presence/cardinality/order/set/relation categories.

The bounded mutation score generated 34 mutants, had 32 applicable, detected
all 32, and left 0 surviving; it also exercised 31 benign controls with 0
false positives, and 32 detections were replayed, minimized, and high
confidence within the synthetic measurement. The adversarial matrix contains
88 cases across 15 families with 6 benign controls and zero privacy/benign
quality-floor regressions. Gap ranking is integrated into the Phase 19 planner;
the largest deterministic reason counts are differential projection 20,
mechanically provable uncovered 16, replay 18, minimization 15, duplicate
coverage 2, and analyzer unsupported 1.

Phase 20 adds local `contracts`, `gaps`, `coverage`, `campaign`, `findings`,
and `explain` operator views, a synthetic multi-surface product adapter, safe
dossier v4 derivation evidence, and bounded source-keyed caches. It grants no
DEV/NEXT/production, data, infrastructure, sibling-write, publication, AI,
self-development, or execution authority. External CI is a separate
post-push fact and is never inferred from these local results.

Local validation is exact: Phase 20 plus the repaired auth compatibility cone
27/27; Phase 9–20 compatibility 1,275/1,275; `campaign:synthetic` 27/27;
owner provenance 91/91; typecheck and hardening PASS; canonical and isolated
full suites both 2,313 enumerated / 2,309 passed / 4 skipped / 0 failed. The
four skips are `tests/unit/phase5Api.test.ts:195`, `:244`, `:278`, and
`tests/unit/selfDevSandboxConfinement.test.ts:143`, with exact identity parity.
The one post-push Actions inspection for the synchronized checkpoint timed out
at the GitHub API before returning a run; no run/job/steps data was available,
so external CI is not called green and was not retried.

## Phase 21 — semantic gap closure, privacy-safe membership, and differential replay saturation

Phase 21 is the local/source/synthetic successor to terminal Phase 20. It
starts from `7a5f6d2ba5ece3bd3a4b21d5a4a15b9504cbd2ae`; the validated
implementation checkpoint is `69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a`.
Phase 19 and Phase 20 remain terminal and unchanged. The owner freeze remains
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

The immutable Phase 20 baseline is 157 graph nodes / 151 edges / 86 gaps,
with 20 differential-projection, 16 mechanically-provable-uncovered, 18
replay, 15 minimization, 2 duplicate-semantic-coverage, and 1 analyzer-
unsupported campaign-facing reason. It has 34 generated / 32 applicable / 32
detected / 0 surviving mutants, 31 benign controls / 0 benign false positives,
and 32 replayed / minimized / high-confidence detections.

Phase 21 adds the versioned closure ledger, bounded source-bound membership
categories, explicit scalar/list/default/set alignment, deterministic pair
discovery, contract-bound replay equivalence, dependency-aware minimization,
scenario-binding suggestions, coverage-quality levels, graph normalization,
dossier V5, local gap-burn-down views, operation telemetry, and a data-driven
privacy corpus. The final graph is 239 nodes / 233 edges / 3 residual gaps.
All 86 baseline identities are preserved: 83 are obsolete after graph rebuild,
0 remain actionable, and 3 are irreducible source-proof records (one
unsupported source syntax and two duplicate-equivalence proofs without a
mechanical join). Differential discovery is 22 candidate rows / 21 admitted
pairs, up from one explicit Phase 20 pair. Replay gaps fall from 18 to 0 and
minimization gaps from 15 to 0; the integrated campaign has 67 replay attempts
and 67 dependency-proven semantic fixed-point reductions. Twenty-one admitted
contracts reach `FULL_LIFECYCLE` quality.

Privacy-safe membership emits only bounded categories such as `ALL_ALLOWED`,
`SOME_DISALLOWED`, `EXACT_ALLOWED_SET`, `STRICT_SUBSET`,
`SUPERSET_OR_UNKNOWN_MEMBER`, `MISSING`, `AMBIGUOUS`, and `TRUNCATED`.
Allowed and observed values are compared only in an ephemeral projection
context; raw values, identity tokens, source enum literals, and reconstructible
members do not cross the projection boundary or enter dossiers, findings,
fingerprints, or errors. The Phase 21 membership slice measures 46 generated /
46 applicable / 46 detected / 0 surviving, with 33 benign controls and 0
benign false positives. The integrated mutation campaign measures 67 generated
/ 67 applicable / 67 detected / 0 surviving, 54 benign controls / 0 benign
false positives, and 67 replayed / minimized / high-confidence detections.

Four of seven metamorphic kinds are exercised. Duplicate-input normalization,
deterministic grouping, and presentation identity remain explicit
`NOT_JUSTIFIED` source-proof boundaries. The expanded adversarial corpus is
151 cases across 23 families, including 63 Phase 21 additions. Local terminal
validation is Phase 9–21 compatibility 1,295/1,295, owner provenance 91/91,
`campaign:synthetic` 27/27, typecheck PASS, hardening PASS, and canonical plus
topology-correct isolated full suites 2,333 enumerated / 2,329 passed / 4
skipped / 0 failed with exact skip identity parity. The current skip identities
are `tests/unit/phase5Api.test.ts:197`, `:246`, `:280`, and
`tests/unit/selfDevSandboxConfinement.test.ts:147`.

Phase 21 remains strictly local/source/synthetic: no DEV/NEXT/production,
authenticated browser state, datastore/database, cloud/infra, sibling write,
publication, AI authority, self-development promotion, or raw real evidence
was used. External CI is a separate post-push observation and is never inferred
from these local measurements.
The one permitted Actions inspection observed run `32672981417` for pushed
head `04ad56c8baa904b8fc8537a41e4fa2e90602770b`, with job `97276539731`
(`Local hardening checks`) concluding `failure` and `steps=[]`. This is recorded
as the external billing/spending restriction; no retry was made and CI is not
called green.

## Phase 22 — contained DEV semantic calibration and bounded real-campaign acceptance

Phase 22 adds the local/source/synthetic readiness bridge for the separately
authorized contained DEV acceptance. It does not reopen the terminal Phase 19,
Phase 20, or Phase 21 history and does not broaden owner scope. The bridge
classifies real eligibility and source freshness, re-derives current
expectations from a disposable read-only Ripple snapshot, freezes an immutable
`nightwatch.dev-semantic-acceptance-manifest.v1`, strengthens preflight and
privacy receipts, and supplies bounded collection projection, differential
eligibility, replay V4, calibration/confidence, Dossier V6, operator views, and
a no-contact dry-run adapter.

Fresh discovery resolved `mobingilabs/ripple-api@85e400a8b32fc23c05464033a2a6d5fff2a2890c`.
Six approved candidates were considered: three DEV-eligible collection
targets (`ripple.common-exchange.read`, `ripple.payer-exchange.read`, and
`ripple.account-inventory.read`), one real-source target without a runtime
binding, and two synthetic-only targets. The frozen manifest contains three
targets with safe ID
`manifest:sha256:3c0d357a25328212f7011d1d` and digest
`manifest:sha256:978c0e63310ea4f80d918cda`; its exact dry run planned three FIRST
and three replay observations across six contexts with zero external contact.
No real membership contract or mechanically proven second real differential
surface was available.

Terminal state is `BLOCKED_BEFORE_DEV`: the stronger executable CI gate failed
before DEV contact (Actions run `32681204267`, job `97298112036`, `steps=[]`;
failed-log retrieval timed out). No DEV launcher was invoked, no auth state was
read, and no real observation or finding exists. Local evidence is Phase 22
focused 7/7, Phase 9–22 compatibility 1,302/1,302, synthetic campaign 27/27,
owner provenance 91/91, typecheck/hardening/project PASS, and canonical plus
topology-correct isolated 2,336 passed / 4 skipped / 0 failed out of 2,340
with exact parity. The terminal safety vector is zero for all restricted
categories and for DEV observations. Phase 23 should first restore an exact
green executable CI gate and revalidate owner-only DEV authentication before
creating a fresh bounded manifest; this is bounded acceptance, not product
correctness certification.

## Phase 23 — executable CI gate unification and conditional DEV authority

Phase 23 replaces the historical hand-maintained CI matrix with the data-only
`nightwatch.quality-gate.v1` definition and its fixed-command serial runner.
The nine required groups are gate-definition, static, hardening, project
truth, agent continuity, Phase 9–23 semantic compatibility, owner provenance,
the synthetic campaign, and patch integrity. Local, CI, and disposable clean
checkout modes share the same group mapping; GitHub Actions only bootstraps
Ubuntu/Node 20 and invokes `npm run gate:ci`. Static parity checks reject a
future workflow bypass, authenticated product execution, private evidence
uploads, or permission broadening.

The old workflow inventory remains 32 steps / 30 run commands / 21 historical
matrix steps / 55 unique test files / 5 duplicate executions. The current gate
inventory is 130 unique compatibility files with zero accidental duplicate
file executions. The definition digest is
`sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`.
The validated implementation checkpoint is
`98ce2faa3eaf1282a0e61cbd37ec2c9895ac5b9b`. CI-mode gate receipt
`receipt:sha256:25e36d5165d745db5f5e6ac6` and disposable Node20 clean receipt
`clean-receipt:sha256:d7cbb1f53f164ac1cd58e31d` are PASS. Canonical and
topology-correct isolated full suites enumerate 2,364 tests and both finish
2,360 passed / 4 environment-conditional skipped / 0 failed with exact skip
identity parity.

Fresh read-only source re-derivation uses Ripple SHA
`27bb007ad0c798800b6bd3b29760c966422966e7`: six candidates were considered,
three collection targets were admitted, and three were excluded by current
runtime/contract evidence. The new Phase 23 manifest is
`manifest:sha256:2ae3ab3c7c34f0946f9244a9` with deterministic digest
`manifest:sha256:b35da8634bf4b64dc56351a4`; its no-contact dry run has three
FIRST plans, three replay plans, six contexts, zero contact/mutation/raw
persistence, and privacy/containment PASS. The exact current-head Actions run
`32709452878` / job `97377543621` matched the implementation head but had
`steps=[]`; it is classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. Pre-DEV V3
is `BLOCKED_EXTERNAL_CI`; owner-only auth was not read, and DEV observations
remain zero.

## Phase 24 — local autonomous triage depth and DEV-readiness acceleration

Phase 24 is terminal at `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`. It adds a pure
source snapshot analyzer and deterministic candidate portfolio with explicit
eligible/excluded reason details, source-change invalidation, stable diversity-
aware prioritization, manifest v3 identity binding, and a no-contact rehearsal
that validates the future campaign through teardown without external contact.
The semantic layer now has twelve bounded oracle classes and five exact,
freshness-bound cross-candidate relations. Replay/minimization v3 preserves
the original invariant and bug class across seven divergence classifications;
structured dossiers route only to code/component/repository ownership states,
with ambiguity retained rather than guessed.

The Phase 24 synthetic portfolio has eight candidates (six eligible and two
excluded), six semantic cases (three violated and three benign), zero benign
false positives, and deterministic repeat. The authoritative local gate at
implementation checkpoint
`cec14ac8e1b189aed96a1b8488381083951411f6` passed all nine groups with receipt
`receipt:sha256:c6da9a1edf31f47ac1b14d19`; compatibility is Phase 9–24,
1,824 total / 1,823 passed / 1 skipped / 0 failed, owner provenance is 91/91,
and the synthetic campaign is 28/28. The disposable Node20 clean-checkout
gate passed with clean receipt
`clean-receipt:sha256:719495ba80a55e351d8f24fb` and zero sibling writes.

The final exact-head Actions observation was run `32723603497` / job
`97419996717` for the implementation SHA. It concluded `failure` before any
job step (`steps=[]`) and was classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; it is not green CI and does not indicate
a Nightwatch test failure. The DEV launcher was invoked zero times, auth state
was not read, and all product/NEXT/production/mutation/publication/private
evidence counts remain zero. Phase 23's historical canonical/isolated parity
baseline remains 2,364 enumerated / 2,360 passed / 4 skipped / 0 failed with
exact parity; Phase 24's current certification is the shared compatibility and
clean-checkout cone rather than a duplicate full regression.

## Phase 28 terminal source-intelligence snapshot

Phase 28 is the completed local/source/synthetic hardening campaign at
implementation checkpoint `7e0b8c1ca584326dd8e7fa9bbf28ba8240fcf37c`. The
fresh approved-source snapshot is
`srcsnapshot:sha256:04ff583971865f335902f5ad`, with six current repositories:
1,732 files considered, 1,092 read, 1,078 admitted, 654 rejected, and
12,449,877 bytes inspected. The source projection remains 128 operations,
127 route proofs, 127 request contracts, 83 response contracts, 175 semantic
observations, 118 proven joins, 10 rejected joins, 47 mutation-capable
operations, 5 independently proven read-only operations, lifecycle
45 `DISCOVERED` / 80 `MECHANICALLY_PROVEN` / 3 `PROJECTABLE`, and Phase 24
3 eligible / 125 excluded.

The response-flow resolver attempted 13 current patterns, proved 0, rejected
13, resolved 0 calls, and observed maximum depth 0. The taxonomy is
`nightwatch.real-source-gap-taxonomy.v3`: 45 proof-gap surfaces, 325 rejected
diagnostics, and deterministic digest
`source-gap-taxonomy:sha256:7adf9ef4eee0788461b34494`. Its safe dimensions are
bounded and include analyzer version, rejection family, syntax/control-flow,
return-expression, declaration resolution, lexical budget, currentness, and
ambiguity. The operator projections `source-gaps` and `surfaces` agree on
these semantic facts in JSON and human-readable modes; timing remains advisory
and is intentionally excluded from deterministic identity.

The fresh producer census found zero strict single-assignment direct-literal
local producer candidates, so no new producer-flow authority was admitted.
The remaining variable producers, dynamic dispatch, property/service chains,
namespace/import, inheritance/trait/interface, factory/resource/DTO, and
generic data-flow cases remain fail-closed exclusions. Phase 24 remains the
sole portfolio authority and historical Phase 25–27 records remain unchanged.
The final local quality cone is green: compatibility 1,874 total / 1,861
passed / 13 skipped / 0 failed, owner provenance 91/91, synthetic campaign
49/49, canonical and topology-correct isolated complete Playwright both
2,438 passed / 16 skipped / 0 failed out of 2,454. The exact-head external
Actions observation remains a separate zero-step billing/platform result and
is not called green.
