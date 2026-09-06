# Autonomous Bug-Hunting Programme — Report

- Starting SHA: `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Task objective: Locally executable autonomous bug-hunting above the existing Nightwatch safety kernel. Frontier reasoner decides what to investigate; Nightwatch decides what it may do.
- Changes: Wave 0 protocol freeze; Wave 1 lanes A–G integrated; AgentRuntime loop; CLI reasoner gateway; agent tools over existing engines; Bug Atlas miner; System Atlas overlay; historical replay harness; finding dossiers; local CLI campaign run/status/resume; pre-fix snapshot extraction; mined sibling cases with leak isolation.
- Tests/validation:
  - Targeted autonomous suites: PASS (protocol, runtime, tools, atlas, benchmark, localCampaign, historicalRediscovery, preFixSource, minedCases).
  - `npx tsc --noEmit`: PASS on integration commits.
  - `npm run hardening:check`: PASS.
  - `npm run agent:check`: PASS with warnings (stale implementation baseline vs live HEAD; stale review-ops worktree left untouched).
  - Sibling mined hunts (`tests/unit/minedCases.test.ts`): leak=0, admitted=0, outcome=MISS with a blind reasoner.
  - `npm run gate:local`: PASS on `7c018663d201c754bd3499201b7ab7e06649ae5a` (STATIC/HARDENING/SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed; SYNTHETIC_CAMPAIGN 1131 passed; PATCH_INTEGRITY/WORKSPACE_INTEGRITY PASS). Prior STATIC failure was tsc on `reasonerPrint.test.ts` (`toBe` arity); fixed then re-run.
  - `npm run gate:local`: PASS on `c7c07f2b3abf45a897dc15242d5567abf0954f42` (STATIC/HARDENING/HANDOFF/PROJECT/AGENT_CONTINUITY PASS; SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed; OWNER_PROVENANCE 91 passed; SYNTHETIC_CAMPAIGN 1131 passed, deepContainmentLane=PROVEN; PATCH_INTEGRITY/WORKSPACE_INTEGRITY PASS). Receipt `receipt:sha256:dce9c49b9af7cd38e32462df`.

  - `npm run gate:clean`: PASS on `2a18e66360e36d27b129b22eed30fc2bb4bef862` (install PASS; all groups PASS; SEMANTIC_COMPATIBILITY 2067/13/0; SYNTHETIC_CAMPAIGN 1131; cleanBefore/cleanAfter true; siblingWrites 0; node 20).
  - `npm run gate:clean`: PASS on `6923bfe0e5dcdc904da4507bf9ad2df60efe0f29` (install PASS; node 20; SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed; OWNER_PROVENANCE 91; SYNTHETIC_CAMPAIGN 1131, deepContainmentLane=PROVEN; cleanBefore/cleanAfter true; nodeModulesReused false; siblingWrites 0). Receipt `clean-receipt:sha256:9ffe3e25b38472a7cb41e911`.

  - Live LOCAL campaign `camp-grok-local-1` via print adapter + Grok CLI: 3 turns, terminationReason=NO_PROGRESS, candidateIds=[], environment=LOCAL. Not a rediscovery proof.
  - Live Grok hunt on `bench-billing-rounding-001` before session isolation: leaked=[], admitted=false, outcome=MISS, BUDGET_EXHAUSTED/NO_PROGRESS. Root cause: Grok reused the cwd session (`Error: max turns reached`) and the print prompt taught empty `intents:[]`.
  - Live Grok hunt on `bench-billing-rounding-001` after `__SESSION_ID__` + `__CWD__` isolation (maxTurns=6, twice): leaked=[], admitted=true, outcome=SAME_ROOT_CAUSE_ALTERNATE, reasonerCalls=6, terminationReason=NO_PROGRESS, candidateIds=[] (hypotheses only). keywordRecall≈0.46, fileHits=0. Not EXACT. Not claimed as hybrid superiority. Not a real Alphaus bug.
  - Live Grok after intent salvage: `bench-billing-rounding-001` COMPLETE_WITH_FINDING in 3 turns, proposed `c1`, leaked=[], outcome=SAME_ROOT_CAUSE_ALTERNATE (keywordRecall≈0.31, fileHits=0). `bench-negative-quiet-000` COMPLETE_NO_FINDING, admitted=false, outcome=MISS, leaked=[]. Admission now requires PROPOSE_CANDIDATE so a no-defect hypothesis is not a false positive.
  - Live Grok corpus (maxTurns=4, isolated session, leak=[] on every case). EXACT is structurally out of reach without the hidden failing-test name. Not claimed as hybrid superiority. Not real Alphaus bugs.
    - billing-001: admitted SAME_ROOT_CAUSE_ALTERNATE
    - api-002: admitted SAME_ROOT_CAUSE_ALTERNATE (keywordRecall≈0.33)
    - backend-003: admitted SAME_ROOT_CAUSE_ALTERNATE (≈0.38)
    - frontend-004: admitted SAME_ROOT_CAUSE_ALTERNATE (0.40)
    - data-005: admitted MISS (keywordRecall≈0.13; timezone hypothesis was filed)
    - integration-006: admitted SAME_ROOT_CAUSE_ALTERNATE (≈0.38)
    - regression-007: admitted SAME_ROOT_CAUSE_ALTERNATE (0.25)
    - state-008: admitted SAME_ROOT_CAUSE_ALTERNATE (0.25)
    - negative-000: not admitted, MISS
  - Mode comparison on `bench-billing-rounding-001` (same visible snapshot, hidden ground truth isolated):
    - A Grok-alone source review: SAME_ROOT_CAUSE_ALTERNATE, keywordRecall≈0.38, fileHits=0
    - B NightWatch deterministic / blind reasoner: MISS (prior mined/blind suites)
    - C Grok+NightWatch: SAME_ROOT_CAUSE_ALTERNATE, keywordRecall≈0.31, fileHits=0
    Hybrid is not superior on this fixture. The buggy `roundBankers` fold is already in the visible snapshot. NightWatch's measured value here is protocol (typed intents, leak isolation, negative-control rejection), not higher rediscovery score.
  - Live Grok on mined sibling case `mined-bugatlas-git-alphauslabs-octo-design-system-b935967bb754` (`alphauslabs/Octo-Design-System`): leaked=[], admitted=true (proposed c1), outcome=MISS, keywordRecall=0, fileHits=0. Historical rediscovery remains NOT PROVEN.
  - Two further mined live hunts (distinct repos, leak=[] both): `alphauslabs/ai-driven-bug-hunting` admitted MISS; `alphauslabs/alupi` not admitted MISS (Grok NONZERO_EXIT on ANALYZE). Then first unused repo `alphauslabs/aqua-ui` (`mined-bugatlas-git-alphauslabs-aqua-ui-14ac7d8e9c09`): leaked=[], admitted=true, outcome=MISS, keywordRecall=0, fileHits=0, reproductionCount=0. 0/4 historical rediscoveries. Not cherry-picked after prior misses.
  - Print adapter untrusted cap raised 2_000 → 24_000 after measuring mined snapshots at 3k–22k (all four live historical cases were truncated at 2k). Aqua-ui re-hunt with the larger cap: still MISS, leak=[], keywordRecall=0. Truncation was real; it was not sufficient for rediscovery.
  - `INSPECT_SOURCE_SURFACE` now returns a file index with first-line previews, then a single pre-fix file when `arguments.path` matches. Print prompt shows the path example. Mined git `fixDiff` is `commit <sha>`, so `parseFixDiffFiles` was always empty and historical hunts could never award fileHits. Scoring now uses pre-fix snapshot paths when the hidden diff is not a unified diff. Aqua-ui re-hunt: fileTotal=3, fileHits=0, admitted=true, outcome=MISS, leak=[]. Hypothesis described a chart onClick index mismatch but did not name a snapshot path.
  - Aqua-ui re-hunt after the hypothesis-must-name-path prompt: leaked=[], admitted=true, fileHits=1, fileTotal=3, keywordRecall=0, outcome=SAME_ROOT_CAUSE_ALTERNATE. Named `src/views/SpUtilization/AwsSpUtilization/AwsSpUtilizationCharts.vue`. Weakest positive bucket (named a snapshot/fix file). Not EXACT.
  - Fifth unused mined repo `alphauslabs/blog` (`mined-bugatlas-git-alphauslabs-blog-cbfb4a149c2f`), not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/1 keywordRecall=0 keywordTotal=1 leak=[] admitted. reproductionCount=0. Five-case current-harness set: 2 PARTIAL + 2 SAME_ROOT_CAUSE + 1 MISS.
  - Sixth unused mined repo `alphauslabs/blue-sdk-ts` (`mined-bugatlas-git-alphauslabs-blue-sdk-ts-dc5d0559eba4`), SDK not UI, not a re-run: PARTIAL_REDISCOVERY fileHits=1/2 keywordRecall=0.667 keywordTotal=6 leak=[] admitted. reproductionCount=0. Six-case set: 3 PARTIAL + 2 SAME_ROOT_CAUSE + 1 MISS.
  - Seventh unused mined repo `alphauslabs/compare-risp` (`mined-bugatlas-git-alphauslabs-compare-risp-f7373ce29471`), billing-adjacent TSX, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/1 keywordRecall=0 keywordTotal=5 leak=[] admitted. reproductionCount=0. Seven-case set: 3 PARTIAL + 3 SAME_ROOT_CAUSE + 1 MISS.
  - Eighth unused mined repo `alphauslabs/grpc-chunk-parser` (`mined-bugatlas-git-alphauslabs-grpc-chunk-parser-fd6ebc3beca3`), backend TS, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/2 keywordRecall=0.167 keywordTotal=6 leak=[] admitted. reproductionCount=0. Eight-case set: 3 PARTIAL + 4 SAME_ROOT_CAUSE + 1 MISS.
  - Ninth unused mined repo `alphauslabs/bluectl` (`mined-bugatlas-git-alphauslabs-bluectl-afcb80792b97`), CLI Go, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/5 keywordRecall=0 keywordTotal=1 leak=[] admitted. reproductionCount=0. Nine-case set: 3 PARTIAL + 5 SAME_ROOT_CAUSE + 1 MISS.
  - Tenth unused mined repo `alphauslabs/blueapi` (`mined-bugatlas-git-alphauslabs-blueapi-423a57bd6554`), API proto, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/1 keywordRecall=0 keywordTotal=4 leak=[] admitted. reproductionCount=0. Ten-case set: 3 PARTIAL + 6 SAME_ROOT_CAUSE + 1 MISS.
  - Eleventh unused mined repo `alphauslabs/blueinternal` (`mined-bugatlas-git-alphauslabs-blueinternal-e68406ede272`), internal API proto, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/2 keywordRecall=0 keywordTotal=1 leak=[] admitted. reproductionCount=0. Eleven-case set: 3 PARTIAL + 7 SAME_ROOT_CAUSE + 1 MISS. Probe of 34 definable mined cases: 0 added test files; 1 changed test (already-hunted alupi). Filling `testsAdded` cannot enable EXACT on this corpus.
  - Wider mine (maxRepos 80): 1 added test in unused `alphauslabs/internal-project-v2`. `tryDefineMinedBenchmarkCase` now sets hidden `knownFailingTest` from a test path added in the fix and absent from the pre-fix snapshot. Live hunt `mined-bugatlas-git-alphauslabs-internal-project-v2-ae3fdb28fe97`: knownFailingTest=`batch/kanban-jobs/tests/jobs/githubPrPoll.test.ts`, testMatch=false, SAME_ROOT_CAUSE_ALTERNATE fileHits=1/2 keywordRecall=0.107 leak=[] admitted. reproductionCount=0. Reasoner named the source file, not the hidden test. Twelve-case set: 3 PARTIAL + 8 SAME_ROOT_CAUSE + 1 MISS.
  - Thirteenth unused mined repo `alphauslabs/iam` (`mined-bugatlas-git-alphauslabs-iam-0c082a865451`), IAM CLI, not a re-run: PARTIAL_REDISCOVERY fileHits=1/1 keywordRecall=0.50 keywordTotal=2 leak=[] admitted. reproductionCount=0. Thirteen-case set: 4 PARTIAL + 8 SAME_ROOT_CAUSE + 1 MISS.
  - Fourteenth unused mined repo `alphauslabs/internal-projects` (`mined-bugatlas-git-alphauslabs-internal-projects-bb894fd1cc1b`), not Pondr v2, not a re-run: SAME_ROOT_CAUSE_ALTERNATE fileHits=1/2 keywordRecall=0.143 keywordTotal=7 leak=[] admitted. reproductionCount=0. Fourteen-case set: 4 PARTIAL + 9 SAME_ROOT_CAUSE + 1 MISS.










  - Same harness re-measure of two earlier cases, not cherry-picks: `alphauslabs/Octo-Design-System` fileHits=1/fileTotal=1 SAME_ROOT_CAUSE_ALTERNATE; `alphauslabs/ai-driven-bug-hunting` fileHits=1/fileTotal=2 SAME_ROOT_CAUSE_ALTERNATE. leak=[] all. keywordRecall=0 all (pre-explanation-fill). File-mention recall only at that checkpoint.
  - Git-mined records had `rootCause: null`, so keyword scoring could never fire. Isolated commit symptom now fills `hidden.explanation` when it is absent from the snapshot. Aqua-ui re-hunt: keywordRecall=0.3125, fileHits=0 (named basename not full path), outcome=SAME_ROOT_CAUSE_ALTERNATE, leak=[]. Unique long basenames now count as file hits. This is commit-message token overlap, not EXACT rediscovery.
  - Aqua-ui re-hunt on committed basename+keyword scoring: leaked=[], admitted=true, fileHits=2, fileTotal=3, keywordRecall=0.375, keywordTotal=16, outcome=PARTIAL_REDISCOVERY (fileRecall>=0.5 and keywordRecall>=0.25). Named full path `AwsRiUtilizationCharts.vue`. reproductionCount=0. Not EXACT (no failing-test match). First mined PARTIAL.
  - Current-harness re-measure of the other original cases (not cherry-picks): `alphauslabs/Octo-Design-System` PARTIAL_REDISCOVERY fileHits=1/1 keywordRecall=0.5 keywordTotal=4 leak=[]. `alphauslabs/alupi` MISS fileHits=0/2 keywordRecall=0.222 keywordTotal=18 leak=[] (hypothesis did not name the inspected path). `alphauslabs/ai-driven-bug-hunting` SAME_ROOT_CAUSE_ALTERNATE fileHits=1/2 keywordRecall=0 keywordTotal=2 leak=[]. reproductionCount=0. EXACT still 0. Current-harness four-case set: 2 PARTIAL + 1 SAME_ROOT_CAUSE + 1 MISS. Defect rediscovery still NOT PROVEN as EXACT/reproduced.




  - Operator `campaign run` now starts from `NIGHTWATCH_PRINT_CLI` alone (defaults executable to node + print adapter). Smoke: `camp-print-default-1` COMPLETE_NO_FINDING, LOCAL. Print adapter always isolates spawn cwd so Grok cannot reuse the checkout session without `__CWD__`.
  - Local campaign `dossierStatus`: `NONE` with no candidate; `REFUSED_NO_REPRODUCTION` when a candidate is proposed. Dossiers are never auto-emitted (`reproductionCount` would be fabricated). `tests/unit/localCampaign.test.ts` 5 passed.
  - Visible discriminator: `RERUN_SAFE_REPRODUCTION` runs the pre-fix algorithm (no eval/spawn). Billing ROUND_THEN_SUM mismatch=true, reproductionCount=1; negative HEALTH_OK mismatch=false. Dossier builds only with reproductionCount>=1. `tests/unit/benchmark.test.ts` 21 passed.
  - Live Grok after VERIFY→RERUN prompt: `bench-billing-rounding-001` called `RERUN_SAFE_REPRODUCTION`, leaked=[], admitted c1, reproductionCount=1, observation `{mismatch:true,captured:30.39,displayed:30.375}`, outcome SAME_ROOT_CAUSE_ALTERNATE, terminated NO_PROGRESS. Dossier built (humanReviewRequired, externalPublication PROHIBITED). `bench-negative-quiet-000` COMPLETE_NO_FINDING, admitted=false, reproductionCount=0.
  - Hunt now auto-attaches a visible-only dossier when admitted && reproductionCount>=1 && mismatch. Frontend STALE_CACHE and redirect OPEN_REDIRECT discriminators reproduce without leakage. `tests/unit/benchmark.test.ts` 22 passed.









- Decisions: Lane H merged into Lane A. System Atlas is an overlay on systemMap. `aiReview` remains end-stage. Fake/blind reasoners never count as rediscovery.
- Safety events: NONE. No DEV/NEXT/production contact. No Slack/Leslie/Pondr. No sibling writes. No force-push.
- Deferred items:
  - DEV/NEXT hunt; communication-evidence atlas.
  - Honest finding dossiers require a real reproduction (`reproductionCount >= 1`); auto-filling that from a proposal would be fabricated evidence.
  - Issue/PR titles are Wave-4 leak-class (`issue title` / `bug description` must not enter reasoner context). Git-commit mining therefore cannot show a ticket statement without leaking the fix subject. An operator-paraphrased alupi PR 512 hunt scored PARTIAL_REDISCOVERY and is **not counted**.

- Remaining blockers:
  - DEV/NEXT not authorized (external).
  - Historical EXACT/reproduced NOT PROVEN. Current-harness set: aqua-ui PARTIAL (2/3, 0.375), Octo-Design-System PARTIAL (1/1, 0.50), blue-sdk-ts PARTIAL (1/2, 0.667), iam PARTIAL (1/1, 0.50), ai-driven-bug-hunting SAME_ROOT_CAUSE (1/2, 0), alupi MISS (0/2, 0.222), blog SAME_ROOT_CAUSE (1/1, 0), compare-risp SAME_ROOT_CAUSE (1/1, 0), grpc-chunk-parser SAME_ROOT_CAUSE (1/2, 0.167), bluectl SAME_ROOT_CAUSE (1/5, 0), blueapi SAME_ROOT_CAUSE (1/1, 0), blueinternal SAME_ROOT_CAUSE (1/2, 0), internal-project-v2 SAME_ROOT_CAUSE (1/2, 0.107, testMatch=false), internal-projects SAME_ROOT_CAUSE (1/2, 0.143). leak=[] all. reproductionCount=0.
  - Exact seeded rediscovery structurally needs the hidden failing-test name in candidate text. One mined case now carries a leak-free added-test path; the live hunt did not name it.
  - Hybrid not superior to Grok-alone on the billing snapshot.




Status: IN_PROGRESS

## Repository

- Starting SHA: `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`
- Live HEAD / origin/main: DISCOVER_FROM_GIT
- Branch: `session/nightwatch-autonomous-bug-huntin-725fbbbe` integrated to `main`
- Canonical: clean when last inspected
- Worktrees: orchestrator session owned; review-ops `nightwatch-review-operations-his-7431812c` STALE — not touched
- Session claims: C-00 held

## OMP execution

- Orchestrator: xAI Grok attempted, Claude/Opus serving as fallback (transient provider blocks expected).
- Executors: Muse/OpenCode Go after Gemini/Luna quota exhaustion (historical). Later integration done in-orchestrator.
- Credentials: not exposed.

## Waves

- W0: protocol freeze. Integrated.
- W1: lanes A–G. Integrated (H folded into A).
- W2: cross-lane tools, atlas query adapters, campaign CLI.
- W3: seeded positive + false-anomaly + injection tests PASS; live Grok positive/negative hunts.
- W4: sibling mine + pre-fix extraction + live Grok. Current-harness four-case set: 2 PARTIAL + 1 SAME_ROOT_CAUSE + 1 MISS. EXACT/reproduced NOT PROVEN.
- W5: `campaign run` via `NIGHTWATCH_PRINT_CLI`; cwd always isolated. Empty LOCAL finds nothing. 1h endurance not run (historical EXACT unproven).



## Architecture delivered

- AgentRuntime: `src/core/agentRuntime/`
- ReasonerDriver: `src/core/reasoner/cliReasoner.ts`
- ToolRuntime: `src/core/agentTools/`
- Bug Atlas: `src/core/bugAtlas/`
- System Atlas: `src/core/systemAtlas/`
- Historical benchmark: `src/core/benchmark/` including `preFixSource.ts`, `minedCases.ts`
- Finding dossier: `src/core/autonomousFinding/`
- Checkpointing: runtime + `~/.nightwatch/campaigns`
- Operator CLI: `bin/nightwatch-agent.mjs` (`status`, `test`, `campaign run|status|pause|resume|findings`)

## Autonomous proof

- Seeded positive (synthetic live Grok): admitted SAME_ROOT_CAUSE_ALTERNATE on 7/8 fixtures; PROPOSE_CANDIDATE on billing.
- False anomaly (live Grok): `bench-negative-quiet-000` COMPLETE_NO_FINDING, not admitted (repeat after RERUN wiring: same).
- Reproduction: live Grok VERIFY called `RERUN_SAFE_REPRODUCTION` on billing; captured=30.39 displayed=30.375; reproductionCount=1. Dossier built locally (human review required, no external filing).
- External filing: none

## Historical benchmark

- Corpus: synthetic fixtures (8 positive + 1 negative) + mined sibling git (read-only)
- Leakage: fail-closed; live and blind hunts leaked 0
- Synthetic live Grok: 7/8 SAME_ROOT_CAUSE_ALTERNATE, 1 admitted MISS (data-005), negative not admitted
  - Mined live Grok (current harness): aqua-ui PARTIAL; Octo-Design-System PARTIAL; ai-driven-bug-hunting SAME_ROOT_CAUSE_ALTERNATE; alupi MISS. Not cherry-picked.
  - Rediscovered EXACT (historical): 0
  - False positives: 0 on negative control
  - Reproduction rate (mined): 0 (no visible discriminator)



## Real-world status

- LOCAL AUTONOMOUS CAPABILITY: PROVEN_SYNTHETIC
- HISTORICAL BUG REDISCOVERY: NOT PROVEN
- REAL DEV/NEXT HUNT: NOT AUTHORIZED
- PREVIOUSLY UNKNOWN ALPHAUS BUG: NOT YET PROVEN

## Safety accounting

- production/DEV/NEXT contacts: 0
- external writes / Slack / Leslie: 0
- credentials exposed: 0
- force pushes / history rewrites: 0
- sibling-worktree writes: 0 (review-ops left untouched)

## Programme verdict

```
NIGHTWATCH_AUTONOMOUS_PROGRAMME_PARTIAL
```
