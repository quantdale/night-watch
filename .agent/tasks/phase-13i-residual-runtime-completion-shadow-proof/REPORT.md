# REPORT — Nightwatch Phase 13I — Residual Runtime Completion & Integrated Shadow Proof

Task ID: phase-13i-residual-runtime-completion-shadow-proof
Phase: 13I-RESIDUAL-RUNTIME-COMPLETION-SHADOW-PROOF
Status: BLOCKED_EXTERNAL_CI
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Authority and bootstrap

- Required token: `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY` — exact, recorded before edits in `.agent/ACTIVE_TASK.md` and this `STATE.md` (Execution STARTING_SHA `8c1cf09f5d33d10a2e7540b6bb9589814a95735c`, which supersedes publication anchor `a7abfee...`; implementation anchor `d672b626f...` preserved as LAST_VALIDATED).
- Fetch origin --prune exit 0; `git rev-parse HEAD == origin/main == 8c1cf09` verified before edits; working tree clean.
- Phase 13I transitioned `NONE -> IN_PROGRESS` and made ACTIVE_TASK; Phase 13H preserved as historical `BLOCKED` (no rewrite); stale `a7abfee`/`d672b62` live-HEAD Recovery wording reconciled to `LIVE_HEAD_AUTHORITY: GIT`, `FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD`.
- Scope honoured: local/source/tests/docs/workflow only. No DEV/NEXT/production, no real campaign (`bin/phase7-real.mjs` never invoked), no DB/infra/Phase 6, no Alphaus writes, no AI/model authority, no selfDev/promotion, no publication. Phase 13B remains `NOT_AUTHORIZED`.

## R1–R5 pre-fix reproductions (live source, SPEC §4)

All five confirmed, zero refutations; each reproduced before fixing:

- **R1 SEMANTIC_PROMOTION_ROUTE_MISSING** — confirmed: `grep clusterAnomalies` in `src/core/campaign/orchestrator.ts` showed only `clusterAnomalies`/`triageAnomaly`/dossier-v1 for every candidate; `campaignSemanticEvidence`/`semanticClusterKey` absent; spec report items 1–3 match live source.
- **R2 REAL_ADAPTER_STRUCTURAL_REPLAY_CERTIFICATION** — confirmed: `grep -n FAILURE tests/manual/phase7-real-campaign.ts` before fix listed direct `return { status:'FAILURE' }` helpers without executor; `replayBinding.ts` validation/execution split existed but was not load-bearing at the adapter.
- **R3 REPLAY_PLAN_V2_NOT_LOAD_BEARING_AT_ADAPTER** — confirmed: no `TriageReplayPlanV2` consumption at the adapter boundary; `grep validateReplayPlanV2|executeReplayPlanV2|TriageReplayPlanV2` absent in `tests/manual/phase7-real-campaign.ts` before fix.
- **R4 PHASE13_SHADOW_PROOF_MISSING** — confirmed: `ls corpus/phase13` exited `No such file or directory` at bootstrap.
- **R5 VERSION_DRIFT_MATRIX_INCOMPLETE** — confirmed: manifest/checkpoint one-at-a-time version drift was not exhaustively proven stop-before-executor (workstream D incomplete; shadow D11 empty at bootstrap).

## Semantic candidate evidence (Workstream A)

- New strict versioned DTO `nightwatch.campaign-semantic-evidence.v1` at `src/core/campaign/campaignSemanticEvidence.ts`: 13 fields, all safe categorical/control identity — `bundleId` (`scb:sha256:<24>`), `bundleVersion` (`nightwatch.semantic-campaign-bundle.private.v1`), `targetId`/`expectationId`/`sourceRepoId` (SAFE_ID), `sourceSha` (40-hex), `sourceEvidenceDigest` (`ev:sha256:<24>`), `sourceDerivationVersion`/`sourceAdmissionVersion` (generic version), `resolverState`/`sourceCurrentness`/`receiptOutcome`/`coverageState`/`findingCategory` (enums), `receiptVersion` (`nightwatch.semantic-evaluation-receipt.vN`), `findingFingerprint` (`fp:sha256:<24>`), `invariantDefinitionId` (`inv:sha256:<24>`). Unknown fields reject (`*_UNKNOWN_FIELD`), sentinel (`CUSTOMER_*`/`Bearer`/JWT/AKIA/private-key) privacy block, certification-bearing `REPRODUCED|HIGH|READY|SAFE|CURRENT` (outside dedicated enums) rejected. No raw body/value/DOM. Pure — no fs/net/process/DB/AI.
- `CampaignAnomalyCandidate.campaignSemanticEvidence?: CampaignSemanticEvidence` optional (historical protocol-only stays parseable).
- `src/core/campaign/identity.ts` `assertPersistedCandidateShape` allowlists + `validateCampaignSemanticEvidence` (strict `v1`).
- Historical v1 candidate without evidence remains protocol-only; sentinel leakage 0.

## Dual clustering (Workstream A)

- Explicit dual-path in `CampaignOrchestrator.recomputeClusters()`:
  - Semantic candidates (those with valid evidence) via `clusterSemanticObservations` using existing Phase-12 `semanticContractIdentity`/`semanticClusterKey`/`semanticInvariantDefinitionId`. Identity binds `expectationId+targetId+invariantId+repoId+evidenceDigest+derivationVersion`; ignores ordinal/count/timestamp/runPath/raw values and SHA movement when `evidenceDigest`+`derivation` unchanged; splits on `evidenceDigest`/`derivation`/`target`/`expectation`/`invariant` changes. Distinct namespace `sc:sha256` (semantic) vs `cluster:sha256` (protocol) — D13 no alias.
  - Protocol-only via historical `clusterAnomalies()` unchanged.
  - No global replacement; one explicit routing decision with `hasValidSemanticEvidence` completeness gate.
- `invariantFromEvidence` synthesizes a deterministic stub `FIELD_PRESENT @ [__semantic_invariant__, invHash]` preserving split/merge correctness (different `invariantDefinitionId` ⇒ different `clusterKey`) without persisting raw invariant JSON; full invariant recovered downstream from frozen expectation/bundle if needed.
- Shadow proves: S11 dedup across SHA with same evidence, S12/S13 digest/derivation split, S14/S15 ordinal/count same cluster, S16 two distinct invariant contracts distinct.

## Semantic promotion pipeline (Workstream B)

- Promotion still routes through `triageAnomaly` (v1 bytes persisted). Ledger is future-ready: `CampaignDossierRecord.dossierVersion?: string` (absent ⇒ v1), `checkpoint.ts` validates `v1|v2`, enforces `READY → bugCandidates` and `UNRESOLVED ∉ bugCandidates` (unresolved semantic never becomes top finding — G06/G07). `loadDossiers()` routes `dossierVersion==v2` or `raw.schemaVersion==v2` through `parseBugDossierV2` (strict allowlist/sentinel) before `validateBugDossier`.
- Future v2 emission (where `createBugDossierV2` is emitted with `isReadySemanticDossier`/`rankSemanticConfidence` readiness) is documented deferred — ledger stays v1-implied now so readback stays valid (tagged v2 with v1 bytes would fail closed on `NIGHTWATCH_INTERNAL_DEFECT:DOSSIER_READBACK_FAILED`, intentionally not shipped).
- Semantic triage evidence / confidence / dossier-v2 are proved via the harness directly (not via orchestrator injection): `S01 HIGH+READY`, `S02 not reproduced not READY`, `S03 PARTIAL not HIGH/READY`, `S04/S05 stale/unavailable not HIGH`, `S08/S09/S10 fp/safety/privacy blocks READY`, protocol v1 compat `P03`, determinism triple.

## Replay-plan-V2 real-adapter binding (Workstream C)

- All structural-only `return {status:'FAILURE'}` removed from `tests/manual/phase7-real-campaign.ts`. Every path now:
  1) builds `TriageReplayPlanV2` from `originalOccurrences` (ordinal=index) + `retainedOccurrenceOrdinals`;
  2) maps retained `MinimizationAction[]` to unambiguous occurrence ordinals via `mapRetainedActionsToOrdinals` (counts distinct order-preserving occurrence embeddings; `count!=1` → `INVALID` — handles duplicate action IDs: retain first vs second occurrence have distinct `planId`s; reordered/invented → rejected);
  3) `validateReplayPlanV2(plan)` (fails closed on `ACTION_NOT_IN_ORIGINAL`/`PRECONDITION_DIVERGENCE`/`ACTION_NOT_APPROVED`/version);
  4) `executeReplayPlanV2(plan, injectedExecutor)` — only injected `V2Executor` may return `FAILURE`; `normalizeExecutorResult` enforces exact fingerprint equality (different fingerprint → `PASS`), `throw` → `INVALID`.
- Exploration: catalog guards via `replayBinding` (`KNOWN_READ|LOCAL_ONLY`, no `SERVER_STATE`, route envelope).
- API: single original/retained (`API_V2_*_MUST_BE_SINGLE`), foreign operation → rejected.
- Journey: exact via V2 plan + executor; `REDUCED_CANDIDATE` delegates to `journeyReducedUnsupported()` → `PRECONDITION_DIVERGENCE` INVALID always.

## Ledger / brief / version drift (Workstream D)

- `CampaignVersionFingerprint` already binds all 8 load-bearing contracts: `triageReplayPlanVersion`/`triageReplayPlanV2Version`/`semanticTriageEvidenceVersion`/`dossierV2Version`/`semanticClusterVersion`/`semanticBundleVersion`/`semanticReceiptVersion`/`semanticExpectationDerivationVersion`. `identity.ts` validates exact key set; `orchestrator.assertCurrentVersions()` does `stableCampaignJson(current)!=manifest.versions → CAMPAIGN_VERSION_DRIFT` before any new work, before executor callbacks, on resume. `checkpoint.ts` validates `dossierVersion v1|v2`, `UNRESOLVED_DOSSIER_IN_BUG_CANDIDATES`, `SOURCE_SNAPSHOT_MISMATCH`/`SELECTION_MISMATCH` (frozen bundle cannot auto-rebind).
- Shadow D11 exhaustively proves one-at-a-time drift of all 8 fields + D09/D12 checkpoint/schema mismatch + D10 frozen bundle no-autorebind (all `stableCampaignJson` divergence before executor; exact facts in metrics).

## Permanent corpus/phase13 shadow campaign (Workstream E)

- `corpus/phase13/{README,response-fixtures,source-fixture/phase13Fixtures}` + `src/core/phase13/shadow.ts` (`nightwatch.phase13.shadow.v1`, pure, synthetic executors only, deterministic `stableJson` key) + `tests/unit/phase13Shadow.test.ts` (26 tests) — uses actual Phase-13 modules, not shims.
- Fixture coverage (42 fixed classes): 11 replay (`R01` duplicate retain first, `R02` retain second load-bearing with distinct `planId`, `R03` reordered rejected, `R04` invented ordinal rejected, `R05` guard, `R06` API multi-original rejected, `R07` API exact reproduced, `R08` different fingerprint → `PASS`, `R09` throw → `INVALID`, `R10` journey exact reproduced, `R11` journey reduced `PRECONDITION_DIVERGENCE`); 16 semantic truth (`S01` HIGH+READY current+reproduced+minimized, `S02` not reproduced, `S03` PARTIAL, `S04/S05` stale/unavailable, `S06/S07` wrong target/expectation (bundle coherence), `S08` false-positive, `S09/S10` safety/privacy nonzero, `S11/S14/S15` dedup/same-cluster on SHA/ordinal/count, `S12/S13` digest/derivation split, `S16` distinct contracts distinct); 3 protocol (`P01/P02` historical cluster, `P03` v1/v2 distinct validation); 12 drift (`D01-D12` per acceptance row H01-H11 + checkpoint/ledger).
- **Determinism**: 3× `runPhase13DeterminismTriple()` `mismatch 0` (identical canonical `stableJson` serialized outputs).
- **Quality floors (all 0)**: falseReproduction 0, structuralOnlyCertification 0, falseReady 0, falseHigh 0, partialFalseReady 0, staleUnavailableFalseReady 0, unsafePrivateFalseReady 0, fragmentation 0, crossMerge 0, driftMiss 0, privacyLeak 0, authorityExpansion 0.
- **Privacy**: sentinel sweep `FORBIDDEN_RE` (PH13_* + legacy CUSTOMER/ACCOUNT/EMAIL/COST/TOKEN/Bearer/JWT/AKIA/private-key) over every safe output — 0 leaks.

## Compatibility and fresh-source (Workstreams F + canary)

- **Hardening**: `bin/hardening-check.mjs` `PASS: offline structural invariants hold` (no new fs/net/process/DB/AI/Phase-6/authority). Phase-12/Phase-9/10/11 pure-core guards intact.
- **Focused matrices**: `phase13Shadow` 26 passed; `campaign` synthetic 27 passed; `phase12SemanticCluster`/`phase12SemanticTriage` 76 passed; `phase12Replay`/`phase12CoverageInventory` 40 passed (includes G01 remote `e026c855…` fresh, G02 disposable snapshot matches, G03 canonical sibling 0 writes).
- **Fresh current-source canary**: `realSourceCanary` (registry mirrors `PHASE5_API_CATALOG` KNOWN_READ, every recipe KNOWN_READ GET + journey rule, exactly 4 recipes admitted at live sibling; ≥1 live derive, fixture-backed parity), `phase10Canary` (4/4 derived, depths [2,2,3,3]), `phase12CoverageInventory` (G01 fresh remote, G02 disposable exact snapshot `e026c855…`, G03 byte-identical canonical siblings, 40/40 PASS). `mobingilabs/ripple-api` present read-only at `DEFAULT_SIBLING_ROOT`; disposable snapshot outside canonical siblings; **0 canonical sibling writes**.
- **Catalog**: `sha256:bd35b934...` count 1, `B AVAILABLE_NOT_ADOPTED`, `NEXT_PROMOTION_AUTHORITY: NONE` — unchanged and enforced by `project:check`.

## Full regressions (topology-correct)

- **Typecheck**: `tsc --noEmit` PASS (0 errors).
- **Hardening**: `bin/hardening-check.mjs` PASS.
- **Canonical complete** (`npx playwright test --project=nightwatch --workers=1`): **1391 passed / 4 skipped / 0 failed** (2.7–3.1m).
- **Isolated topology** — `--local` clone alone (`/tmp/nightwatch-isolated-*`) shows 1343/4/0 with **7 identical `changeIntelligenceBacktest` failures** (missing `mobingilabs/ripple-ui` at `/tmp/...` — git cat-file cannot resolve those historical commits without siblings). This is **topology-expected** without siblings, not a code regression: canonical 8/8 backtest `PASS` validates the code; isolated `--local` path cannot verify sibling commits.
  - **Topology-correct isolated** (recreated `REPOSITORIES` layout with symlink `mobingilabs`/`alphauslabs` + `npm ci --ignore-scripts`, full `--project=nightwatch --workers=1`): **1391 passed / 4 skipped / 0 failed** (3.1m). Re-cleaned after run.
- No new skips hide failures (`grep skip` unchanged).

## Continuity / project / diff

- `npm run agent:check` PASS (no strict errors; warnings only `STALE_IMPLEMENTATION_BASELINE` expected pre-push and 24 legacy v1 tasks — audit `strict_errors 0`, `legacy_warnings 24`).
- `npm run agent:audit --audit-history` strict 0.
- `npm run project:check` — `PROJECT_STATE_CHECKOUT_DIRTY` only pre-push with uncommitted task state; will be clean post-commit at docs closure (catalog/authority checks green when run on a clean tree — verified at prior Phase 12 closure).
- `git diff --check` PASS (0 whitespace/trailing errors).

## Git / CI (M10)

- Implementation checkpoint committed **only after every local gate was green**: commit `186122f96741c57f5d5fdf4cca3ec1e9328a9f30` on `main`:
  `Phase 13I: close residual runtime gaps — semantic routing, V2 executor binding, shadow proof`
  (13 files, 2333+, showing above diffs). Pushed fast-forward; **`HEAD == origin/main == 186122f`, working tree clean**.
- Decisive post-push re-run `npx playwright test tests/unit/phase13Shadow.test.ts tests/unit/campaign.test.ts --project=nightwatch --workers=1` 53 passed; `typecheck` PASS; `hardening` PASS.
- **Exact implementation Actions run 32325943234 @ 186122f** inspected via `gh run view` / `gh api`:
  `status: completed`, `conclusion: failure`, `event: push`, `jobs: [ Local hardening checks: failure (completed) steps: [] ]`.
  Annotation: **`The job was not started because recent account payments have failed or your spending limit needs to be increased.`**
  → **Externally billing-blocked before any job execution; `gh run view --log-failed` has no logs because no step ran.** This is **not** a code failure; the job never executed.
- No retry loop: do not claim CI green while billing-blocked.

## Docs closure (M11)

- `docs/DECISIONS.md` next live number discovered as **D-63** (prior was D-62); appended with authorization `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`, starting `8c1cf09`, implementation `186122f`, Context/Decision/Architecture/Result/Consequences covering all four workstream architectures, validation raw counts above, and the truthful `BLOCKED_EXTERNAL_CI` terminal.
- `docs/CURRENT_STATE.md` snapshot updated at **2026-08-20** (Phase 13I), `PHASE_13I_STATUS`, `PHASE_13_SEMANTIC_PROMOTION`, `PHASE_13_REPLAY_V2_BINDING`, `PHASE_13_SHADOW_CAMPAIGN` rows, header durability line, and project-state truth block preserved (canonical catalog count 1, `NEXT_PROMOTION_AUTHORITY: NONE`).
- `docs/ROADMAP.md` appended `Phase 13I — Residual Runtime Completion & Integrated Shadow Proof (implemented-local, CI-blocked)` with status triple `BLOCKED_EXTERNAL_CI / VERIFIED_LOCAL_NOT_CI_VERIFIED ×3`, workstream summaries, validation (186122f 1391/4/0 both topologies), and `STOP` next (11B/13B NOT_AUTHORIZED).
- Final docs push will be fast-forward after this report; exact final Actions truth inspected post-push.

## Safety / privacy / authority vector

- **Safety**: all `CampaignSafetyVector` and `SafetyVector` fields 0 in every promoted path; `safety nonzero → not READY/HIGH` proven (S09). `DatabaseQueries`/`InfrastructureQueries`/`ExternalPublicationAttempts` remain 0.
- **Privacy**: raw bodies/values/DOM/customer values/cost strings/tokens/paths never cross the semantic projection into campaign evidence (still enforced by `campaignSemanticEvidence` sentinel/certification rejection, `cluster` sanitizer, `checkpoint`/`brief` allowlists, and shadow sweep of 0 leaks over 42 fixtures + 26 tests).
- **Authority**: catalog still 1 entry `bd35b934…`; `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`; `NEXT_PROMOTION_AUTHORITY: NONE`; `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE` frozen; no new endpoint/target/transport/network/DB/Phase-6/AI/model/selfDev/promotion authority added; Nightwatch remains private local only.

## Residual limitations

- **External CI billing block** before job execution (documented above) — not a code defect. Unblock is `billing/spending-limit restored + new push re-runs Actions green`. This is the **only** blocker beyond local verification.
- **Semantic v2 dossier emission** deferred: triage still emits `BugDossier` v1 bytes; ledger stores v1 with readback-compatible validation. A genuine `BugDossierV2` emission when `campaignSemanticEvidence` + `semanticFindings` are present (so `dossierVersion: v2` bytes are readback-consistent) belongs to a future task with a live semantic candidate fixture.
- **Journey reduced replay remains `PRECONDITION_DIVERGENCE`** by design (frozen 2-step journey cannot invent subset precondition semantics).
- **Corpus/phase13 `benign/`/`defects/`** are placeholder dirs (fixtures are code-generated via `phase13Fixtures.ts`).

## Phase 13B disposition

`PHASE_13B_STATUS: NOT_AUTHORIZED` — no 13B contained-DEV acceptance is part of this task; any Phase 13B canary requires a separately authorized concrete task after exact CI is green. No `bin/phase7-real.mjs` invocation occurred in this task.

## Terminal tokens (truthful)

The Phase 13I local runtime surface is **locally runtime-complete**. Because every local/source gate is green but GitHub Actions is externally billing-blocked before job execution, the truthful terminal state is `BLOCKED_EXTERNAL_CI` per SPEC §13/15 — NOT `COMPLETE` and NOT `BLOCKED` with a residual local gap.

```text
PHASE_13I_STATUS: BLOCKED_EXTERNAL_CI
PHASE_13_RUNTIME_COMPLETION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_SEMANTIC_PROMOTION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_REPLAY_V2_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_SHADOW_CAMPAIGN: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13H_STATUS: BLOCKED (historical)
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Validated implementation commit `186122f96741c57f5d5fdf4cca3ec1e9328a9f30` is pushed fast-forward; `HEAD == origin/main`; exact implementation Actions run `32325943234` not-started (billing/spending-limit). STOP until billing restores and/or Phase 13B is separately authorized. Implementation evidence is in `.agent/tasks/phase-13i-residual-runtime-completion-shadow-proof/` and the commit diff.

## Final-state rule satisfied

Not `COMPLETE` (CI not green), not `BLOCKED` with a residual local gap (every local row proven). Only `BLOCKED_EXTERNAL_CI` with every local acceptance row green is truthful.

No DEV is authorized by this report.
