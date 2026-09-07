# Task State

## Identity

Task ID: nightwatch-real-local-investigation-substrate-v1
Phase: W7_REAL_LOCAL_INVESTIGATION_SUBSTRATE
Status: IN_PROGRESS
Starting SHA: 9cb2ec76cc026eed093e86d2758f795ff018ad8a
Last validated implementation SHA: 2437895c883902bbbccaf796c278863cade0cbbc
Last substantive checkpoint SHA: 2437895c883902bbbccaf796c278863cade0cbbc
Live HEAD authority: GIT
Current local/remote HEAD: 130231b0968cf68a89ab780e22d2512996c451e9 / 9cb2ec76cc026eed093e86d2758f795ff018ad8a
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: M0 live truth reconciled; shared real-local provider interfaces frozen and typechecked
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9cb2ec76cc026eed093e86d2758f795ff018ad8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Make the normal Nightwatch autonomous campaign path consume real owner-local source/intelligence/evidence/reproduction through shared safe providers, then prove one historical reproduced defect through that same product path.

## Current Milestone

M1/M3-M6 — provider contracts are frozen; execute ownership-separated continuity, provider, replay, and admission/scoring lanes before orchestrator campaign integration.

## Completed Milestones

- M0: reconciled the owned orchestrator session with origin/main, inspected the product/benchmark seams, and reproduced the encoded semantic split with the 46-test focused baseline.
- M2 interface freeze: `src/core/localInvestigation/types.ts` now defines the only shared provider/context/history/reproduction contracts. Separate lanes may implement against it but may not change it.

## Work In Progress

Implementation map and ownership freeze:

- Orchestrator-only: `src/core/localInvestigation/types.ts`, `index.ts`, `src/core/agentRuntime/localCampaign.ts`, `bin/nightwatch-agent.mjs`, global task/programme/current-state/OpenSpec records, final integration tests and certification.
- Context lane: provider-backed tool session plus real owner-local source/System Map/Bug Atlas/System Atlas/evidence adapters.
- Replay lane: historical/pre-fix adapters and benchmark migration onto the shared provider contract.
- Admission lane: runtime-history-derived finding admission and additive verified root-cause/reproduction tier; strict EXACT remains unchanged.
- Continuity lane: duplicate/ambiguous programme identity parser/validator wired into agent-state checks.

Observed gap at the M0 baseline: generic `localCampaign.ts` injects `{ authorizedEnvironments: ['LOCAL'] }` with no data providers; source/System Map/evidence are unavailable; Bug/System Atlas silently fall back to synthetic fixtures; generic reproduction validates a plan without execution. `benchmark/hunt.ts` owns a separate richer pre-fix source and contained-replay executor.

## Exact Next Action

1. Commit and integrate the frozen provider-contract checkpoint so C-00 worker sessions share one base.
2. Start ownership-separated context, replay, admission, and continuity workers.
3. Inspect and reconcile every worker diff; independently rerun each lane's focused acceptance.
4. Wire the normal CLI campaign path, run the leak-isolated historical product-path proof, then execute M9 certification.

## Known facts from the initiating audit

These are observations to verify against live code before acting, not permission to skip recon:

- AgentRuntime, CLI reasoner gateway, typed tool protocol, Bug Atlas, System Atlas schema, historical benchmark, contained replay, and dossier builder exist.
- `localCampaign.ts` currently constructs the generic LOCAL tool executor without real source/System Map/evidence providers.
- generic Bug/System Atlas queries can fall back to synthetic/fixture data.
- benchmark historical hunts have a richer source/reproduction executor than the generic product path.
- generic `RERUN_SAFE_REPRODUCTION` validates a plan but does not itself execute the contained replay.
- parent `PROGRAMME.json` previously contained a duplicate `E` lane key; the documentation record has been repaired to preserve W1 `E` and W6 `E6`, but machine enforcement is still required.
- strict `EXACT_REDISCOVERY` currently requires the hidden failing-test path to appear in candidate text; keep this metric but add a separately meaningful verified root-cause/reproduction tier.
- final dossier building must be bound to mechanically observed reproduction/evidence, not model-asserted counts.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/SPEC.md` | W7 mission/acceptance contract | DONE |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/PLAN.md` | W7 execution plan | DONE |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/STATE.md` | W7 continuity | IN_PROGRESS |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/REPORT.md` | W7 evidence ledger | IN_PROGRESS |
| `src/core/localInvestigation/types.ts` | Frozen shared provider/context/history/reproduction interface | DONE |
| `src/core/localInvestigation/index.ts` | Shared contract exports | DONE |

## Validation Ledger

Command: `npm run session:status` before and after reconciliation
Result: PASS. Owned orchestrator worktree; canonical clean; foreign review-operations worktree remains STALE and untouched. Initial origin/main advanced to `9cb2ec76...`; `node bin/nightwatch-session.mjs reconcile` created local merge `130231b0...`.

Command: `npx playwright test tests/unit/agentTools.test.ts tests/unit/localCampaign.test.ts tests/unit/benchmark.test.ts --project=nightwatch --workers=1`
Result: PASS — 46 passed. This is the M0 encoded baseline: the current tests explicitly prove generic reproduction is validation-only and generic local campaigns lack real providers.

Command: `npm run typecheck`
Result: PASS after the shared provider contract freeze.

## Decisions Made During This Task

Decision: prioritize normal product-path real local sensing/reproduction over forcing `EXACT_REDISCOVERY=1` or a literal full-hour soak.
Reason: the product/benchmark capability split is the highest-value blocker to a credible general autonomous bug hunter.
Evidence/constraint: initiating repository audit plus child SPEC.

Decision: shared provider interfaces must be frozen before parallel delegated writes.
Reason: source/replay/admission lanes otherwise risk forking authority and recreating benchmark-private behavior.
Evidence/constraint: C-00 ownership discipline and parent programme parallelism rules.

Decision: freeze one `LocalInvestigationContext` seam with six narrow providers and one harness-only tool-session history rather than widening `AgentRuntime`.
Reason: the runtime remains provider-neutral; product and benchmark adapters share the same executor semantics; hidden replay audit data cannot enter reasoner envelopes.
Evidence/constraint: `AgentToolExecutor` is already the runtime seam, while the current product/benchmark split lives entirely in executor construction.

Decision: provider absence is a typed BLOCKED result; every context property is required.
Reason: optional fixture fallback recreated the exact claimed-real ambiguity W7 must remove.
Evidence/constraint: SPEC A-C and the current `bugAtlasFixtureCorpus()` / `createSyntheticSystemAtlasOverlay()` defaults.

## Discoveries

- Parent programme durable state previously reused lane key `E`; documentation repair applied before W7 implementation, machine validation still pending.
- Parent programme remains PARTIAL/IN_PROGRESS; W7 completion does not imply unknown-bug yield or DEV/NEXT proof.
- Live Git after reconciliation: local session `130231b0968cf68a89ab780e22d2512996c451e9`; origin/main `9cb2ec76cc026eed093e86d2758f795ff018ad8a`; canonical main `e94f9455cd9ee0fa6bc148747191d072bcad7ab4`.
- The existing sibling-source module already provides bounded, no-follow, admission-ledgered reads and enumeration. The owner-local source provider will adapt it rather than create a second filesystem authority.
- Bug Atlas already has an owner-private snapshot loader and bounded read-only miner. System Atlas has no real snapshot loader today; absence must remain explicit rather than synthetic.

## Blockers

None for authorized local work at task creation time. Provider quota/account failures may affect live-model proof but do not block deterministic/local implementation.

## Safety Events

NONE

## Authorization

IMPLEMENTATION AUTHORIZED:
- Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state.
- owner-local read-only source/history/evidence adapters.
- Bug Atlas/System Atlas local integration.
- deterministic local historical reproduction in disposable temp trees.
- synthetic/fabricated test repositories and fixtures.
- read-only sibling Git history/object reads needed by existing bounded replay/mining contracts.

NOT AUTHORIZED:
- DEV/NEXT/production contact.
- C-07, C-08b, C-12/C-13/C-14 live execution.
- Slack/Leslie/Pondr/Notion or any communication scraping.
- external issue/PR/Slack filing or comments.
- credential acquisition, deployment, secrets changes.
- sibling writes or mutation.
- force push/history rewrite/destructive recovery.

## Deferred / Follow-Up

- DEV/NEXT and previously unknown Alphaus bug yield remain outside this task.
- Communication-evidence Atlas population remains unauthorized.
- Literal full-hour live-provider soak is secondary until the real product substrate works.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read this task's SPEC/PLAN/STATE/REPORT and the parent programme state/report.
3. Discover live Git/workspace/session truth; replace DISCOVER_FROM_GIT anchors only with observed truth.
4. Execute M0-M9; do not repeat parent W0-W6.

## Completion Snapshot

Not complete. Populate only after full implementation and certification.
