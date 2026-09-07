# PLAN — nightwatch-autonomous-efficacy-real-local-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-autonomous-efficacy-real-local-substrate-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W8
Planned-From: 4b3b183e07a9a348b8904f618a3bc35e4990df1c

## Purpose

Raise Nightwatch's autonomous efficacy on the real W7 substrate. The programme already has safe real sensing, deterministic reproduction, and mechanical admission; W8 must make the reasoner maintain coherent investigation state, diversify targets, form better grounded hypotheses, and choose verification/reproduction actions that can actually produce useful evidence.

## Execution order

### M0 — Live truth + baseline capture

- Discover live `HEAD`, `origin/main`, canonical/worktree/session truth.
- Read W7 SPEC/PLAN/STATE/REPORT, parent PROGRAMME/STATE/REPORT, current `AgentRuntime`, reasoner protocol, print adapter, local campaign, local investigation session/provider/admission code, benchmark/historical harness, tests, OpenSpec, AGENTS/instructions.
- Re-run the W7 focused substrate suites before changing behavior.
- Capture one baseline deterministic campaign and one baseline live-provider trace if the provider is available.
- Prove or disprove the initiating hypotheses: stateless turn memory and cross-investigation strategic amnesia.
- Record baseline efficacy metrics in REPORT before implementation.

Acceptance: baseline evidence exists and the implementation plan names the exact confirmed bottlenecks rather than assuming them.

### M1 — Freeze W8 working-memory/readiness contracts

Orchestrator-owned shared-interface step. Do this before parallel delegated writes.

Define additive/versioned bounded contracts for:

- per-turn investigation working memory;
- campaign-level strategy/diversity memory;
- reproduction readiness / verification state;
- efficacy metrics/result vocabulary.

Specify record/byte caps, deterministic truncation, checkpoint compatibility, secret/hidden-truth exclusions, and backwards-compatibility behavior.

Acceptance: focused protocol/type/validator tests pass; no lane starts against an unfrozen shared shape.

### M2 — Runtime working memory

Implement the bounded reasoner-visible state in the runtime request path.

Expected responsibilities:

- expose current hypotheses/candidates/recent action/result summaries;
- expose inspected targets/evidence mapping when available through a safe injected/derived summary;
- preserve untrusted envelopes separately;
- cap and deterministically serialize memory;
- keep runtime/provider neutrality.

Acceptance: unit tests prove a stateless fake/print reasoner can make turn N decisions using only turn N request state; no secret/audit leakage.

### M3 — Cross-investigation strategy memory

Make fresh investigations receive bounded campaign history sufficient to avoid repeating exhausted targets blindly.

- accumulate completed investigation summaries;
- persist/restore in campaign checkpoints or a compatible progress envelope;
- preserve pause/resume/idempotence;
- distinguish pointless duplicate target attempts from justified revisits after new evidence;
- expose bounded prior-target/hypothesis/termination context to the next `AgentRuntime`.

Acceptance: multi-investigation tests prove target diversity and resume continuity; existing W6 endurance invariants remain green.

### M4 — Verification and reproduction readiness

Add deterministic host-side readiness classification and/or additive hypothesis lifecycle state.

- a hypothesis must be evidence-grounded to become verification-ready;
- reproduction readiness must identify missing grounding without leaking hidden coordinates;
- neutral prior reproduction verdicts may be surfaced;
- mechanically observed results, not model prose, drive strong state transitions.

Acceptance: adversarial tests prove model output cannot self-upgrade readiness or reproduction credit.

### M5 — Reasoner guidance / print adapter

Update `bin/nightwatch-reasoner-print.mjs` and any provider-neutral presentation helpers to consume the W8 memory.

- current state must be explicit for stateless turns;
- favor discriminating evidence and unexplored targets;
- avoid rigidly repeating one scripted tool sequence;
- teach exact grounded reproduction/proposal requirements from structured state;
- keep isolated cwd/session, canonical output, byte caps, secret handling and untrusted-data rules.

Acceptance: print-adapter tests show coherent multi-turn behavior from isolated invocations and preserve all safety/canonicalization tests.

### M6 — Efficacy harness + historical fixed corpus

Create a reproducible before/after evaluator over a fixed leak-isolated corpus spanning multiple repositories/surface types.

Required metrics are defined in SPEC. Keep strict EXACT separate. Record provider/model provenance and exact corpus identifiers without leaking hidden truth to the reasoner.

Acceptance:

- deterministic harness is reproducible;
- negative controls remain clean;
- no scoring path receives hidden truth before the run ends;
- at least one real contained replay case is included when locally executable.

### M7 — Independent integration review

For every worker lane:

- inspect actual diff and owned paths;
- reject scope violations or weakened tests;
- reconcile against current integration head;
- rerun that lane's acceptance suite AFTER reconcile;
- resolve shared-interface mismatches deliberately, never by silently weakening contracts.

Then run cross-lane memory/campaign/print/benchmark suites.

Acceptance: all integrated behavior is re-verified by the orchestrator rather than accepted from worker reports.

### M8 — Live-provider efficacy proof

Run live subscribed CLI reasoning only after deterministic integration is green.

1. Historical live-provider proof through the normal product/session path, hidden truth isolated.
2. Real owner-local campaign on the W7 substrate.

Target evidence:

- meaningful distinct source exploration;
- grounded hypotheses;
- reduced repeat rate;
- verification-ready state reached;
- grounded reproduction attempts when available;
- at least one `VERIFIED_ROOT_CAUSE_REDISCOVERY` on an executable historical case if local replay prerequisites remain present;
- no fabricated candidate in a negative/no-defect path.

If provider quota/account failure blocks this milestone, preserve commands and deterministic readiness but leave W8 IN_PROGRESS/BLOCKED; do not fake closure.

### M9 — Full certification and truthful closeout

Run:

- focused W8 suites;
- W7 regression suites;
- real historical opt-in proof when prerequisites are present;
- `npm run typecheck`;
- `npm run hardening:check`;
- `npm run agent:check`;
- `npm run handoff:check`;
- `npm run project:check`;
- `npm run workspace:check` / session checks;
- full `npm test`;
- `npm run gate:local`;
- `npm run gate:clean` on a fresh Node 20 clone.

Update W8 STATE/REPORT, parent PROGRAMME/STATE/ACTIVE_TASK/docs truth only from observed results. Commit and integrate through normal C-00 session flow. Never force push.

## Suggested parallel lanes after M1

### Lane A — Runtime memory

Owned area: reasoner observation/working-memory implementation + focused runtime/protocol tests.

Must not own campaign checkpoint logic or global docs.

### Lane B — Campaign strategy/diversity

Owned area: `localCampaign` strategy memory/checkpoint/resume/diversity logic + focused campaign tests.

Must not mutate frozen provider/admission semantics.

### Lane C — Reasoner presentation/readiness

Owned area: print adapter and safe presentation/readiness helpers + adversarial/canonicalization tests.

Must not own hidden historical replay coordinates or provider authority.

### Lane D — Efficacy benchmark

Owned area: fixed-corpus evaluator, metrics, negative controls, before/after harness tests.

Must not alter scoring thresholds to manufacture improvement.

## Decision rules

- Prefer additive protocol evolution over breaking W7 contracts.
- Prefer bounded structured memory over raw transcript replay.
- Prefer host-derived state over model self-report.
- Prefer evidence diversity over action count.
- Repeated targets are allowed only when new evidence/explicit re-verification justifies the revisit.
- A candidate without mechanical admission remains a refused proposal, not a finding.
- A provider block is evidence of a block, not evidence of a defect or success.
- A benchmark improvement that raises false positives is not accepted as efficacy improvement.
- EXACT remains unchanged even if VERIFIED_ROOT_CAUSE improves.

## Completion gate

Do not stop at 'memory implemented', 'tests pass', or 'live run completed'. Continue through M9 unless a genuine external/manual blocker makes remaining authorized work impossible.
