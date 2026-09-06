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
  - `npm run gate:local`: PASS on `6fdf5353762883bb6aae3f4f703b819f30b57e10` (SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed; SYNTHETIC_CAMPAIGN 1131 passed; PATCH_INTEGRITY/WORKSPACE_INTEGRITY PASS). Prior dirty-tree run failed PATCH_INTEGRITY (`SELFDEV_CATALOG_INTEGRITY_CHECKOUT_DIRTY`) then passed after the report commit.
  - `npm run gate:clean`: PASS on `90387370c958c44c64741ace04df997580eea862` (install PASS; all groups PASS; cleanBefore/cleanAfter true; siblingWrites 0).
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
  - Two further mined live hunts (distinct repos, leak=[] both): `alphauslabs/ai-driven-bug-hunting` admitted MISS; `alphauslabs/alupi` not admitted MISS (Grok NONZERO_EXIT on ANALYZE). 0/3 historical rediscoveries. Not cherry-picked after the first miss.
  - Operator `campaign run` now starts from `NIGHTWATCH_PRINT_CLI` alone (defaults executable to node + print adapter). Smoke: `camp-print-default-1` COMPLETE_NO_FINDING, LOCAL. Print adapter always isolates spawn cwd so Grok cannot reuse the checkout session without `__CWD__`.
  - Local campaign `dossierStatus`: `NONE` with no candidate; `REFUSED_NO_REPRODUCTION` when a candidate is proposed. Dossiers are never auto-emitted (`reproductionCount` would be fabricated). `tests/unit/localCampaign.test.ts` 5 passed.









- Decisions: Lane H merged into Lane A. System Atlas is an overlay on systemMap. `aiReview` remains end-stage. Fake/blind reasoners never count as rediscovery.
- Safety events: NONE. No DEV/NEXT/production contact. No Slack/Leslie/Pondr. No sibling writes. No force-push.
- Deferred items:
  - DEV/NEXT hunt; communication-evidence atlas.
  - Honest finding dossiers require a real reproduction (`reproductionCount >= 1`); auto-filling that from a proposal would be fabricated evidence.
  - Issue/PR titles are Wave-4 leak-class (`issue title` / `bug description` must not enter reasoner context). Git-commit mining therefore cannot show a ticket statement without leaking the fix subject. An operator-paraphrased alupi PR 512 hunt scored PARTIAL_REDISCOVERY and is **not counted**.

- Remaining blockers:
  - DEV/NEXT not authorized (external).
  - Historical rediscovery NOT PROVEN (0/3 live mined hunts, leak=[]).
  - Exact seeded rediscovery structurally needs the hidden failing-test name in candidate text.
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
- W4: sibling mine + pre-fix extraction + live Grok. Rediscovery NOT PROVEN (0/3).
- W5: `campaign run` via `NIGHTWATCH_PRINT_CLI`; cwd always isolated. Empty LOCAL finds nothing.


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
- False anomaly (live Grok): `bench-negative-quiet-000` COMPLETE_NO_FINDING, not admitted.
- Reproduction: none (no failing-test execution). Dossiers not emitted.
- External filing: none

## Historical benchmark

- Corpus: synthetic fixtures (8 positive + 1 negative) + mined sibling git (read-only)
- Leakage: fail-closed; live and blind hunts leaked 0
- Synthetic live Grok: 7/8 SAME_ROOT_CAUSE_ALTERNATE, 1 admitted MISS (data-005), negative not admitted
- Mined live Grok: 3 cases, 3 MISS (Octo-Design-System, ai-driven-bug-hunting, alupi)
- Rediscovered (historical): 0
- False positives: 0 on negative control
- Reproduction rate: unmeasured (no real failing-test execution)


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
