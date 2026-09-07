# Task State

## Identity

Task ID: nightwatch-real-local-investigation-substrate-v1
Phase: W7_REAL_LOCAL_INVESTIGATION_SUBSTRATE
Status: IN_PROGRESS
Starting SHA: DISCOVER_FROM_GIT
Last validated implementation SHA: NONE
Last substantive checkpoint SHA: NONE
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: DISCOVER_FROM_GIT
Last checkpoint: task authored from repository audit; implementation not started
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: DISCOVER_FROM_GIT
LAST_VALIDATED_IMPLEMENTATION_SHA: NONE
LAST_SUBSTANTIVE_CHECKPOINT_SHA: NONE
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Make the normal Nightwatch autonomous campaign path consume real owner-local source/intelligence/evidence/reproduction through shared safe providers, then prove one historical reproduced defect through that same product path.

## Current Milestone

M0 — re-establish live repository truth and reproduce the product-vs-benchmark capability gap before implementation.

## Completed Milestones

NONE in this child task. Parent W0-W6 are already integrated and must not be repeated.

## Work In Progress

Implementation not started. The next executor must discover live Git/workspace/session truth, reproduce the current generic-path limitations, and freeze the shared local investigation provider interfaces before delegating overlapping implementation work.

## Exact Next Action

1. Discover live HEAD/origin/main and workspace/session truth.
2. Read SPEC/PLAN plus parent programme continuity and relevant implementation/tests.
3. Reproduce the generic-product-path limitations with focused tests/operator probes.
4. Freeze the shared `LocalInvestigationContext`/provider interfaces before delegating parallel code changes.
5. Proceed milestone-by-milestone; do not declare the task COMPLETE until M9 certification.

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

## Validation Ledger

No implementation validation has been run for this child task yet. Parent Wave-6 certification must not be relabelled as W7 certification.

## Decisions Made During This Task

Decision: prioritize normal product-path real local sensing/reproduction over forcing `EXACT_REDISCOVERY=1` or a literal full-hour soak.
Reason: the product/benchmark capability split is the highest-value blocker to a credible general autonomous bug hunter.
Evidence/constraint: initiating repository audit plus child SPEC.

Decision: shared provider interfaces must be frozen before parallel delegated writes.
Reason: source/replay/admission lanes otherwise risk forking authority and recreating benchmark-private behavior.
Evidence/constraint: C-00 ownership discipline and parent programme parallelism rules.

## Discoveries

- Parent programme durable state previously reused lane key `E`; documentation repair applied before W7 implementation, machine validation still pending.
- Parent programme remains PARTIAL/IN_PROGRESS; W7 completion does not imply unknown-bug yield or DEV/NEXT proof.

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
