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






- Decisions: Lane H merged into Lane A. System Atlas is an overlay on systemMap. `aiReview` remains end-stage. Fake/blind reasoners never count as rediscovery.
- Safety events: NONE. No DEV/NEXT/production contact. No Slack/Leslie/Pondr. No sibling writes. No force-push.
- Deferred items:
  - DEV/NEXT hunt; communication-evidence atlas; live 1h campaign with isolated Grok sessions.
  - Live Grok still emits MALFORMED_OUTPUT on some turns; no PROPOSE_CANDIDATE yet.

- Remaining blockers:
  - DEV/NEXT not authorized.
  - Exact seeded rediscovery and real historical-bug rediscovery not proven.
  - Operator must pass `--session-id __SESSION_ID__ --cwd __CWD__` in `NIGHTWATCH_PRINT_ARGS` so Grok does not reuse a directory session.

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
- W3: seeded positive + false-anomaly + injection tests PASS.
- W4: sibling mine + pre-fix extraction + blind hunts. Ran. Rediscovery NOT PROVEN.
- W5: local CLI campaign path exists; live 1h not started (CLI unset).

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

- Seeded positive: PASS (`tests/unit/agentAutonomyLoop.test.ts`)
- False anomaly: PASS (no admission without evidence)
- Reproduction: synthetic only
- External filing: none

## Historical benchmark

- Corpus: synthetic fixtures + mined sibling git (read-only `rev-parse`/`log`/`show`)
- Leakage: fail-closed; sibling hunts leaked 0
- Cases run: bounded sibling (2 hunts in `minedCases.test.ts`) + synthetic pre-fix fixture
- Rediscovered: 0
- Missed: all blind hunts
- False positives: 0 in those hunts
- Reproduction rate: unmeasured (no live reasoner)

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
