# EXECUTION PROMPT — Autonomous Efficacy on the Real Local Substrate

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-autonomous-bug-hunting-programme-v1
OpenSpec: openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/
Planned-From: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
Target Branch: main
Predecessor Task ID: nightwatch-real-local-investigation-substrate-v1
Predecessor Status: COMPLETE

Child task: `nightwatch-autonomous-efficacy-real-local-substrate-v1`
Child task directory: `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

Continue the existing Nightwatch autonomous bug-hunting programme from its LIVE repository state. W0-W7 are already integrated. Do not repeat them.

W7 closed the product/benchmark substrate gap. The ordinary campaign path now has real owner-local sensing, shared deterministic reproduction, and mechanical dossier admission. The open problem is efficacy: a live provider can use the real substrate yet still loop into `NO_PROGRESS` without producing a grounded candidate.

W8 must make the autonomous investigator maintain coherent bounded state across stateless CLI turns and fresh investigations, explore distinct useful targets, form evidence-grounded hypotheses, recognize verification/reproduction readiness, and measurably improve historical/live-provider investigation behavior without increasing false-positive admission or weakening any W7 safety invariant.

## Read first

Read, in order:

1. `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/SPEC.md`
2. `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/PLAN.md`
3. `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/STATE.md`
4. `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/REPORT.md`
5. W7 `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md`
6. parent programme `PROGRAMME.json`, `STATE.md`, `REPORT.md`
7. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, applicable instruction files, `docs/CURRENT_STATE.md`, OpenSpec
8. live Git/worktree/session truth and the relevant runtime/reasoner/campaign/local-investigation/benchmark source + tests.

## Starting problem to reproduce

Do not assume the diagnosis. Reproduce it.

W7 reference live run:

- real W7 owner-local substrate;
- OpenCode Go provider;
- 8 investigations;
- 24 reasoner calls;
- 26 tool actions;
- 0 provider failures;
- ~595.5s;
- termination `NO_PROGRESS`;
- 0 candidates.

Likely bottlenecks that MUST be verified against live code/traces before implementation:

1. `ReasonerTurnRequest` provides phase/current untrusted output/evidence refs/budget but insufficient accumulated investigation state for an isolated stateless print invocation.
2. each investigation starts a fresh runtime/tool session while campaign history is mainly aggregated after completion, so subsequent investigations can forget exhausted targets/approaches.
3. print guidance may be too procedural and memory-poor, encouraging repeated source-index/first-file patterns rather than discriminating actions.
4. reproduction is correctly host-gated but readiness/missing-grounding state may not be explicit enough for a stateless reasoner.

If recon disproves any hypothesis, record that and adapt the design. Do not force the code to fit this prompt.

## Primary objectives

### 1. Bounded turn working memory

Give each isolated reasoner call a deterministic, versioned, bounded summary of the investigation it is already performing: safe hypothesis/candidate state, recent action/result summaries, inspected source paths + evidence refs, neutral reproduction state, and relevant progress counters.

Do not replay raw transcripts. Do not expose secrets, hidden replay coordinates, replay stderr, arbitrary env values, or unbounded source text.

### 2. Cross-investigation strategy memory

A new investigation must know enough about prior completed investigations to avoid blindly repeating exhausted targets. Preserve bounded target/hypothesis/reproduction/termination summaries across investigation boundaries and checkpoint/resume.

A deliberate revisit with new evidence must remain possible; distinguish justified re-verification from pointless duplication.

### 3. Better target selection while preserving reasoner autonomy

Use deterministic W7 data to present bounded admissible choices/hints: unexplored source paths, System Map gaps/facts, Bug Atlas relevance, real System Atlas concepts when configured, and prior attempted paths. The host may bound/rank safe choices, but the frontier reasoner still chooses what to investigate.

Historical hidden truth must never influence reasoner-visible ranking.

### 4. Operational hypothesis/verification state

Hypotheses must become mechanically useful. Distinguish ungrounded ideas from grounded/open, verification-ready, disproved/rejected, and reproduced states using host-observed evidence/results. Model prose alone cannot self-promote to verification/reproduction credit.

### 5. Reproduction readiness

Expose neutral readiness/missing-grounding information to the reasoner without hidden replay details. Keep actual reproduction execution behind the W7 deterministic provider and its grounding checks.

### 6. Stateless print guidance

Update the print adapter to consume structured W8 memory. It must explicitly orient each isolated turn, prefer new discriminating evidence over repetition, and stop assuming conversational memory. Do not replace host state with prompt prose alone.

### 7. Measured efficacy

Create a reproducible fixed-corpus before/after evaluator. Measure unique targets, repeat rates, grounded hypotheses, verification-ready hypotheses, reproduction attempts, candidates, mechanical admissions, VERIFIED_ROOT_CAUSE_REDISCOVERY, strict EXACT separately, negative-control false positives, and time/calls/actions to meaningful progress.

No anecdotal “looks smarter” completion claim is acceptable.

## Orchestration and delegation

You are the frontier orchestrator/reviewer. Own live truth, shared interfaces, dependency decisions, integration, final validation, and programme documentation.

Use subagents only when parallelism materially helps. Every writing executor must have its own C-00 session worktree, explicit owned paths, and leaf status. Executors must not integrate themselves.

Do NOT dispatch overlapping implementation lanes until M1 freezes the shared W8 working-memory/readiness contracts.

Suggested post-freeze lanes:

- Runtime memory lane — reasoner observation memory + runtime/protocol tests.
- Campaign strategy lane — cross-investigation memory/checkpoint/diversity + campaign tests.
- Reasoner guidance lane — print/readiness presentation + adversarial/canonicalization tests.
- Efficacy benchmark lane — fixed corpus, metrics, negative controls, before/after harness.

Global programme/task/current-state/OpenSpec files remain orchestrator-owned unless explicitly assigned.

A worker's report is not evidence. Before accepting a lane:

1. inspect its actual diff and changed paths;
2. confirm no hidden scope expansion or weakened tests;
3. reconcile it against the current integration head;
4. rerun its acceptance suite after reconciliation;
5. only then accept/integrate.

## Execution milestones

Execute M0 through M9 from the task PLAN. Do not stop because one milestone passes.

M0: live truth + baseline.
M1: freeze additive/versioned memory/readiness/metric contracts.
M2: runtime working memory.
M3: cross-investigation strategy/diversity memory.
M4: verification/reproduction readiness.
M5: stateless reasoner guidance.
M6: fixed-corpus efficacy harness.
M7: integration + independent reruns.
M8: live-provider historical + real-owner-local efficacy proof.
M9: full certification + truthful closeout.

## Hard safety boundaries

LOCAL only.

NOT AUTHORIZED:

- DEV/NEXT/production contact;
- C-07, C-08b, C-12/C-13/C-14 live execution;
- Slack, Leslie, Pondr, Notion, communication scraping, external filing;
- credentials, deployment, secrets changes;
- sibling writes/mutation;
- force push, history rewrite, destructive Git recovery.

The reasoner never receives arbitrary shell/Git/network/filesystem authority. Untrusted source/history/evidence bytes have zero instruction authority.

W7 invariants are load-bearing. Do not weaken these to improve apparent yield:

- real-vs-synthetic provider honesty;
- bounded source reads;
- deterministic reproduction grounding;
- hidden historical truth isolation;
- harness-only replay audit;
- mechanical admission from observed evidence/receipts;
- human review required / external publication prohibited.

## Failure discipline

- Never convert `NO_PROGRESS`, provider block, timeout, or unavailable replay into success.
- Never fabricate a candidate so a live run appears productive.
- Never lower scoring/EXACT thresholds to claim efficacy.
- Never delete/weaken a regression test just to integrate.
- Never use force/reset/rebase/history rewrite as recovery for integration difficulty.
- If a lane conflicts, inspect and resolve semantics deliberately or reject/reassign it.
- If the provider fails/quota-blocks, continue every deterministic/local task that remains executable; preserve the live proof command and leave W8 truthfully IN_PROGRESS/BLOCKED if the live acceptance criterion cannot be met.
- Record failed intermediate runs and their fixes in REPORT.

## Required live proof

After deterministic integration is green:

1. Run a live subscribed CLI reasoner on a leak-isolated historical case through the normal product/session path. The reasoner must show coherent stateful progress. If a locally executable contained-replay case remains available, target at least one mechanically reproduced `VERIFIED_ROOT_CAUSE_REDISCOVERY`.
2. Run a live reasoner on the real owner-local substrate. It must demonstrate diversified grounded investigation progress rather than repeating the same target until stagnation. A previously unknown bug is NOT required and must not be invented.

Use current available provider routing; do not hard-code success to one provider/model. Record exact provider/model provenance.

## Terminal acceptance

Do NOT mark W8 COMPLETE until all SPEC completion criteria are actually satisfied, including:

- bounded reasoner-visible turn memory;
- bounded cross-investigation strategy memory with resume continuity;
- demonstrably reduced pointless repetition / improved target diversity;
- mechanically grounded verification/reproduction readiness;
- fixed-corpus before/after efficacy improvement without increased false-positive admission;
- live-provider historical meaningful progress and mechanically verified root-cause rediscovery when executable replay prerequisites exist;
- real owner-local live diversified grounded progress;
- W7 real historical product-path proof remains valid;
- focused suites, typecheck, hardening, agent/handoff/project/workspace/session checks PASS;
- full `npm test` PASS without unexplained regression;
- `gate:local` FULL PASS;
- `gate:clean` PASS on a fresh Node 20 clone;
- task and parent continuity truth updated from observed evidence only.

Even after W8 completes, do NOT claim parent-programme completion, previously unknown Alphaus bug yield, DEV/NEXT proof, production proof, or strict EXACT unless separately and actually proven.

Begin now from live Git/workspace/session truth and continue until the W8 terminal criteria are satisfied or a genuine external/manual blocker prevents further authorized progress.
