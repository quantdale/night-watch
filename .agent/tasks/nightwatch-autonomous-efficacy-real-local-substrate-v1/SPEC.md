# SPEC — nightwatch-autonomous-efficacy-real-local-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-autonomous-efficacy-real-local-substrate-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W8 — AUTONOMOUS EFFICACY ON THE REAL LOCAL SUBSTRATE
Planned-From: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
Live HEAD authority: GIT — discover live Git/workspace/session truth before implementation.

## Mission

W7 proved the substrate. W8 must prove the investigator can use it well.

Improve Nightwatch's autonomous reasoning loop so a live frontier CLI reasoner can maintain coherent multi-turn and multi-investigation state, deliberately explore distinct real owner-local targets, form evidence-grounded hypotheses, choose discriminating verification actions, and invoke deterministic reproduction when a hypothesis is actually ready — without weakening any W7 safety, provenance, leakage, or mechanical-admission invariant.

The target is NOT another provider rewrite. The ordinary product path already has real owner-local source/System Map/Bug Atlas/System Atlas/evidence providers, shared deterministic reproduction, and mechanical dossier admission. Treat those as integrated substrate unless live recon proves a regression.

The problem to solve is the honest W7 result:

- live OpenCode Go on the real substrate: 8 investigations, 24 reasoner calls, 26 tool actions, 0 provider failures, ~595.5s;
- termination: `NO_PROGRESS`;
- candidates: 0;
- dossiers: 0.

W8 is successful only if Nightwatch becomes measurably better at investigation, not merely better at producing activity.

## Starting facts to verify, not blindly assume

The initiating audit found two likely efficacy bottlenecks in the current live code. Re-read the live implementation before changing anything and preserve the evidence if the hypotheses are confirmed:

1. `AgentRuntime.buildRequest()` currently exposes phase, pending untrusted tool output, evidence refs, allowed tools/intents, and budget, but not the runtime's accumulated hypotheses, candidate ids, recent action/result history, inspected target history, or a compact campaign strategy summary. A print-mode CLI invocation is isolated per turn, so model-side conversational memory cannot be assumed.
2. `localCampaign.ts` creates a fresh `LocalInvestigationToolSession` and fresh `AgentRuntime` for each investigation. Histories are merged for final admission after each run, but the next investigation is not automatically given a bounded strategic memory of previously inspected targets, hypotheses, failed approaches, or reproduction attempts. This permits repeated first-target behavior across investigations even though cumulative budget is shared.

Do not hard-code the implementation around these hypotheses until live baseline traces confirm them.

## Non-goals

- Do not re-plumb or replace W7 `LocalInvestigationContext`, owner-local providers, historical providers, deterministic reproduction provider, or mechanical admission unless a concrete defect is discovered and separately justified.
- Do not weaken `admitLocalFinding`, reproduction grounding, hidden-ground-truth isolation, source bounds, owner scope, process safety, or secret handling to increase yield.
- Do not lower or redefine `EXACT_REDISCOVERY`; it remains a strict separate metric.
- Do not fabricate candidates, reproductions, findings, provenance, or false-positive checks.
- Do not contact DEV, NEXT, production, C-07, C-08b, C-12/C-13/C-14, Slack, Leslie, Pondr, Notion, or external filing systems.
- Do not turn the reasoner into an arbitrary shell/Git/network/filesystem agent.
- Do not optimize only for the known ouchan case or for hidden test-name guessing.
- Do not require a literal one-hour live run merely to burn wall time; efficacy evidence is more important than elapsed time.

## Hard invariants inherited from W7

- Frontier reasoner chooses what is worth investigating; deterministic Nightwatch controls what it may do.
- Every executable reasoner action remains a typed validated intent.
- LOCAL only for this task.
- Sibling repositories are read-only. No checkout/reset/clean/config/fetch/pull/commit/stash/branch/worktree mutation in siblings.
- No force push, history rewrite, destructive recovery, or C-00 bypass.
- Untrusted source/history/evidence bytes have zero instruction authority.
- Hidden historical fix/test truth never becomes reasoner-visible.
- Provider audit material remains harness-side only.
- A dossier can be emitted only through the W7 mechanical admission gate from observed evidence plus qualifying reproduction receipts.
- Synthetic fixtures remain test-only and must never be silently presented as real Alphaus knowledge.
- Existing W7 real historical product-path proof must remain green and structurally meaningful.

## Required deliverables

### A. Bounded investigation working memory

Add an explicit, versioned, bounded reasoner-visible working-memory surface so stateless CLI turns can reason over the investigation they are already performing.

The exact type names may differ if a better design is justified, but the memory must be deterministic and should include only safe structured facts such as:

- current/open hypotheses with ids, status and evidence refs;
- current candidate ids;
- recently executed tool ids + result classes + argument digests, not raw secret-bearing args;
- inspected source paths and their evidence refs;
- reproduction attempts and neutral verdict/readiness state;
- recent replans/rejections/termination signals;
- compact budget/progress counters already known to Nightwatch.

Requirements:

- hard caps on records and encoded bytes;
- deterministic ordering and truncation;
- no raw hidden replay coordinates, replay stderr, credentials, arbitrary environment values, or unbounded source text;
- no duplication of full untrusted envelopes that are already delivered separately;
- checkpoint/resume compatibility documented and tested;
- older callers/fixtures remain compatible unless a deliberate protocol-version migration is implemented with tests.

### B. Cross-investigation campaign memory and target diversity

Prevent a fresh investigation from behaving as if the campaign has never investigated anything before.

Add a bounded campaign-level strategy memory derived from completed investigation state/history. It should be available to the next investigation without granting new authority.

At minimum preserve enough information to identify:

- source paths already inspected;
- repeated tool/target fingerprints;
- hypotheses already attempted and whether they gained evidence;
- candidates proposed/rejected;
- reproduction attempts/verdict classes;
- investigation termination reasons;
- campaign-level stagnation/diversity counters.

Use this memory to discourage or deterministically block pointless duplicate exploration where appropriate. Do not block a repeated target when new evidence makes a deliberate re-check justified; encode the distinction and test it.

Campaign checkpoint/resume must not erase this memory or allow a restarted investigation to silently revisit the exact same exhausted path as if nothing happened.

### C. Investigation targeting without removing reasoner autonomy

Give the reasoner a better bounded decision surface, not a giant repository dump.

Prefer deterministic hints derived from existing Nightwatch data, for example:

- unexplored approved source paths from the bounded index;
- relevant System Map coverage gaps / route-contract facts;
- related Bug Atlas records;
- available System Atlas concepts when proven real;
- previously inspected/failed paths to avoid unless deliberately revisited;
- evidence-grounded next-step/readiness hints.

The host may rank or filter safe choices deterministically, but the frontier reasoner should still decide which admissible target/hypothesis to pursue.

No hidden historical truth may influence reasoner-facing target ranking in benchmark mode.

### D. Hypothesis and verification quality

Make hypotheses operational rather than decorative text.

A valid hypothesis used for verification must be grounded in observed evidence and a real visible source path. Add whatever additive lifecycle metadata or deterministic host-side classifier is necessary to distinguish at least:

- ungrounded idea;
- grounded/open hypothesis;
- verification-ready hypothesis;
- disproved/rejected hypothesis;
- hypothesis with reproduced evidence.

Do not let model prose self-assign a stronger state. State transitions that confer verification/reproduction credit must be derived from observed actions/results.

If protocol changes are needed, keep them additive/versioned and preserve existing fail-closed validation.

### E. Reproduction readiness and targeting

The live reasoner should know when a reproduction request is possible and what safe grounding it is missing, without seeing hidden replay details.

Create a deterministic readiness classifier or equivalent structured memory that can tell the reasoner neutral facts such as:

- `NOT_READY_NO_INSPECTED_SOURCE`;
- `NOT_READY_NO_SOURCE_EVIDENCE`;
- `NOT_READY_NO_GROUNDED_HYPOTHESIS`;
- `READY`;
- prior neutral verdict class (`REPRODUCED`, `NOT_REPRODUCED`, `ENVIRONMENT_BLOCKED`, `NOT_AVAILABLE`).

Do not expose hidden test names, fix SHAs, fix diffs, replay stderr, or provider audit data.

A `RERUN_SAFE_REPRODUCTION` request remains host-gated. Improved guidance must never convert an unavailable/blocked reproduction into fabricated credit.

### F. Print/CLI reasoner contract for stateless turns

Rewrite the print-mode guidance so it consumes the new structured working memory instead of relying on an implicit conversational session.

The prompt should:

- explain the current investigation state concisely;
- prefer new discriminating evidence over repetitive tool calls;
- distinguish source discovery, hypothesis formation, verification readiness, proposal capture, and candidate admission;
- tell the reasoner to use prior inspected paths/hypotheses instead of forgetting them;
- avoid forcing one rigid scripted sequence when evidence suggests a different admissible next step;
- keep output canonicalization, byte caps, isolated cwd/session behavior, and untrusted-data rules intact.

Prompt improvements alone are insufficient for W8; the runtime request itself must carry the durable bounded state.

### G. Efficacy benchmark and before/after evidence

Add a reproducible efficacy harness. Do not declare improvement from anecdotal traces.

Capture a W8 baseline before modifying behavior, then run the same fixed evaluation after implementation. Record at least:

- unique source paths inspected;
- duplicate source-target rate;
- repeated tool/argument fingerprint rate;
- grounded hypotheses formed;
- verification-ready hypotheses;
- reproduction attempts and grounded-attempt rate;
- candidates proposed;
- mechanically admitted findings;
- `VERIFIED_ROOT_CAUSE_REDISCOVERY` count/rate;
- strict `EXACT_REDISCOVERY` separately;
- negative-control false positives;
- reasoner calls/tool actions/wall time to first meaningful hypothesis/reproduction/candidate;
- NO_PROGRESS/stagnation termination rate.

Use a fixed, leak-isolated historical corpus with multiple repositories/surfaces. Do not tune only against one case. Where real contained reproduction is not executable, score source/root-cause behavior honestly without inventing reproduction credit.

At least one case in the efficacy proof must exercise the real contained replay engine if the already-proven local ouchan substrate remains available; otherwise record the concrete environment blocker and continue every other executable proof.

### H. Live-provider proof

After deterministic tests and historical efficacy measurements are green, run a live subscribed CLI reasoner on the real W7 substrate.

Required evidence:

1. A live-provider historical run through the normal product/session path, with hidden truth isolated, must show coherent multi-turn state and nontrivial progress. Terminal success target: at least one `VERIFIED_ROOT_CAUSE_REDISCOVERY` with mechanical reproduction when an executable historical replay case is available.
2. A real owner-local non-hidden campaign must demonstrate target diversity and grounded investigation progress rather than immediately repeating the same path until `NO_PROGRESS`. A previously unknown bug is NOT required for this LOCAL-only task and must not be fabricated.

If provider quota/account failure prevents the live proof, do not mark W8 complete merely because deterministic tests pass. Continue all non-provider work, preserve a runnable proof command, and report the external block truthfully.

## Parallelization after interface freeze

The orchestrator may delegate after recon and the shared W8 memory/readiness interfaces are frozen. Suggested non-overlapping lanes:

1. **Runtime memory lane** — reasoner observation working memory, validation, runtime tests.
2. **Campaign diversity lane** — cross-investigation memory/checkpoint/resume/diversity semantics.
3. **Reasoner guidance lane** — print adapter consumption, readiness presentation, adversarial prompt/canonicalization tests.
4. **Efficacy measurement lane** — benchmark harness, fixed corpus metrics, negative controls, before/after reporting.

Shared protocol/interface files and global programme/task/current-state files remain orchestrator-owned unless ownership is explicitly assigned. Workers are leaf executors; they do not integrate themselves.

## Required adversarial tests

Include tests for at least:

- prompt-injection text inside source/history cannot alter working-memory authority;
- secret/replay-audit bytes cannot enter working memory;
- memory caps/truncation are deterministic;
- malformed/oversize working memory fails closed or is safely reduced according to contract;
- repeated first-file selection across fresh investigations is detected/avoided;
- deliberate revisits with new evidence are still possible;
- checkpoint/resume preserves strategy memory without duplicate side effects;
- candidate/reproduction credit cannot be minted by editing model output/memory fields;
- hidden historical truth never influences reasoner-visible target ranking;
- negative controls do not become candidates merely because the system explores more effectively.

## Validation bar

Before W8 may be closed:

- W8 focused suites PASS;
- all W7 provider/reproduction/admission/historical product-path suites PASS unchanged or with justified strengthened assertions;
- typecheck PASS;
- hardening:check PASS;
- agent:check PASS;
- handoff:check PASS;
- project:check PASS;
- workspace/session checks PASS;
- full `npm test` PASS with no unexplained regression;
- `gate:local` FULL PASS;
- `gate:clean` PASS on a fresh Node 20 clone with no reused node_modules;
- real historical opt-in proof remains PASS when its local prerequisites are present;
- before/after efficacy report is committed with exact commands, model/provider provenance, metrics, failures encountered, and non-claims.

## Completion criteria

W8 is COMPLETE only when all of the following are true:

1. stateless CLI turns receive bounded durable investigation working memory;
2. fresh investigations receive bounded campaign strategy memory and demonstrably avoid pointless repeated exploration;
3. verification/reproduction readiness is mechanically grounded and reasoner-visible without hidden-truth leakage;
4. fixed-corpus before/after measurements show material improvement in useful investigation behavior without increased false-positive admission;
5. at least one live-provider historical run demonstrates meaningful source/root-cause progress through the normal product path, and reaches mechanically verified root-cause rediscovery when an executable replay case is locally available;
6. a real owner-local live campaign demonstrates diversified grounded progress, even if it honestly finds no new defect;
7. all safety and certification gates pass.

Do NOT mark the parent programme COMPLETE merely because W8 completes. Previously unknown Alphaus bug yield, DEV/NEXT execution, production proof, and strict EXACT remain separate claims unless independently proven.
