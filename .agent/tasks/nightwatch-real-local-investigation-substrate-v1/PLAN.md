# PLAN — nightwatch-real-local-investigation-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1

## Operating model

One frontier orchestrator owns programme truth, interfaces, review, integration, and final certification. It MAY delegate bounded implementation lanes to subagents in separate C-00 session worktrees. Executors must be leaf workers: they do not redefine programme scope, do not integrate themselves, and do not edit orchestrator-owned global state unless explicitly assigned.

Parallelism is by ownership, not by hope.

## Milestone status (live)

| Milestone | Status |
|---|---|
| M0 live truth | COMPLETE |
| M1 programme identity | COMPLETE |
| M2 provider contract freeze | COMPLETE |
| M3 real local sensing on the normal path | COMPLETE |
| M4 unified deterministic reproduction | COMPLETE |
| M5 mechanical finding admission | COMPLETE |
| M6 additive verified tier | COMPLETE |
| M7 product-path historical proof | COMPLETE |
| M8 endurance sanity | COMPLETE |
| M9 integration review and certification | COMPLETE |

No live milestone remains open. See `STATE.md` Validation Ledger and `REPORT.md` for evidence.

## M0 — Re-establish live truth before changing code

1. Read `AGENTS.md` and all applicable instruction files.
2. Read `.agent/ACTIVE_TASK.md`, this SPEC/PLAN/STATE, parent `PROGRAMME.json`, parent REPORT/STATE, `docs/CURRENT_STATE.md`, OpenSpec, and the relevant implementation/tests.
3. Run Git/workspace/session status. Discover live HEAD and origin/main; do not trust the SHA from this document.
4. Identify every live/foreign worktree. Do not touch the pre-existing review-operations worktree or any session not owned by this campaign.
5. Inspect the exact current behavior of:
   - `src/core/agentRuntime/localCampaign.ts`
   - `bin/nightwatch-agent.mjs`
   - `src/core/agentTools/**`
   - `src/core/benchmark/**`
   - `src/core/bugAtlas/**`
   - `src/core/systemAtlas/**`
   - `src/core/systemMap/**`
   - `src/core/autonomousFinding/**`
   - source/sibling/evidence/replay modules reused by existing Nightwatch campaigns.
6. Run the smallest focused baseline needed to reproduce the current product/benchmark semantic gap before implementing.

Exit M0 only with a written implementation map and explicit ownership boundaries.

## M1 — Repair durable programme identity first

- Fix the duplicate lane key in parent `PROGRAMME.json` without losing either historical lane record.
- Add a validator/check that fails on duplicate/ambiguous programme identities before state is accepted as durable truth.
- Prefer stable globally unique task/lane identifiers over reused single letters for new programme entries.
- Preserve backwards compatibility if existing tooling expects original A–G fields; migrate deliberately and test.

Acceptance:
- parent programme state parses to one unambiguous record for every historical lane/task;
- a synthetic duplicate-identity fixture fails closed;
- `agent:check`/programme-state validation passes.

## M2 — Freeze a shared real-local context/provider contract

Before separate lanes write implementation, freeze the minimum interfaces needed by BOTH normal campaigns and historical benchmarks. Suggested responsibilities, names flexible:

- `LocalSourceProvider`
  - bounded index of approved source files;
  - bounded read of one approved path;
  - no mutation, no recursive context dump.
- `LocalSystemMapProvider`
  - supplies the real existing System Map input/projection.
- `LocalBugAtlasProvider`
  - loads owner-private snapshot or runs existing read-only miner under explicit bounds;
  - explicit unavailable/data-blocked state.
- `LocalSystemAtlasProvider`
  - loads proven non-synthetic records where available;
  - synthetic fixtures never silently substituted in product mode.
- `LocalEvidenceProvider`
  - exposes only sanitized records by evidence ref.
- `DeterministicReproductionProvider`
  - executes an already-authorized bounded replay;
  - returns the frozen reproduction result vocabulary plus audit metadata hidden from the reasoner.
- `LocalInvestigationContext`
  - aggregates providers/config without granting new authority.

Keep acquisition separate from `AgentRuntime` and reasoner transport.

Acceptance:
- interfaces are unit-tested, small, provider-neutral, and require explicit dependencies;
- missing providers fail closed instead of silently substituting fixtures.

## M3 — Wire real local sensing into the ordinary campaign path

Modify normal `nightwatch-agent campaign run` setup so it constructs/injects a real owner-local investigation context.

Required semantics:

### Source
- `INSPECT_SOURCE_SURFACE {}` -> bounded index, not first arbitrary fixture.
- `INSPECT_SOURCE_SURFACE {path}` -> selected approved file only.
- reject unknown/out-of-scope paths, symlinks/path traversal, oversized reads, and binary/unparseable surfaces honestly.

### System Map
- `QUERY_SYSTEM_MAP` uses the actual local Nightwatch System Map input/projection available to the campaign.
- do not mint facts if the map is unavailable.

### Bug Atlas
- use owner-private mined/snapshot data when available.
- no implicit fallback to `bugAtlasFixtureCorpus()` in a real product run.
- explicit synthetic/test mode may still use fixtures.

### System Atlas
- query real source/docs-backed overlay records when present.
- synthetic concepts remain labelled/test-only.
- no Slack/communication ingestion in this task.

### Evidence
- only known evidence refs may be read;
- sanitization happens before reasoner-visible envelopes;
- secret/prompt-injection bytes remain untrusted data.

Acceptance:
- normal campaign with a deterministic fake reasoner can enumerate a real approved source index, inspect a selected file, query real Atlas/System Map data where available, and fail closed where unavailable.

## M4 — Unify deterministic reproduction semantics

Move/reuse the benchmark's real reproduction capability behind the shared `DeterministicReproductionProvider` contract.

Rules:

- no benchmark-private privileged executor after this milestone unless it is only a thin compatibility wrapper over the shared product provider;
- reproduction requires a real grounding condition before execution (at least one approved visible source path named/linked by the live investigation, or an equally strong deterministic criterion justified in SPEC/REPORT);
- reasoner-visible reproduction output remains neutral and contains no hidden test path, fix diff, fix subject, assertion text, or audit stderr;
- audit metadata stays harness-side;
- `ENVIRONMENT_BLOCKED`/inconclusive cases do not mint reproduction credit;
- sibling repos remain read-only;
- no network dependency installation is performed merely to make a replay pass.

Acceptance:
- existing contained replay tests still pass;
- product tool tests prove real execution through injection and prove no execution when grounding/provider/authorization is absent;
- benchmark uses the same provider contract.

## M5 — Mechanical finding admission gate

Introduce one deterministic gate after a reasoner proposes a candidate and before a final dossier exists.

The gate must derive, not trust:

- successful reproduction count from runtime action log/results;
- evidence refs from actually observed campaign evidence;
- reproduction result identity/provenance;
- candidate existence and linkage to the observed evidence.

The model may propose title/description/severity rationale/alternative hypotheses, but it must not be able to self-certify `reproductionCount` or manufacture evidence refs that were never observed.

If required final-dossier fields cannot be mechanically grounded, return a proposal/refusal state rather than fabricating a dossier.

Acceptance:
- forged model draft with `reproductionCount: 99` but no runtime reproduction is refused;
- forged evidence refs are refused;
- one real reproduced candidate can produce a human-review dossier;
- dossier authority remains frozen and external publication prohibited.

## M6 — Add meaningful historical success tier without weakening EXACT

Keep existing `EXACT_REDISCOVERY` intact for backwards compatibility and strict analysis.

Add/report a distinct verified tier for:

- correct relevant source/root-cause grounding;
- admitted candidate;
- mechanical reproduction observed by Nightwatch;
- no ground-truth leakage;
- hidden test path need not be guessed by the reasoner.

Document precisely how this tier differs from PARTIAL/SAME_ROOT_CAUSE/EXACT. Add negative/adversarial tests so reproduction of an unrelated or ungrounded condition cannot upgrade a score.

Do not manipulate thresholds solely to turn historical results green.

## M7 — Product-path historical proof

Run at least one real historical pre-fix case THROUGH THE SAME PRODUCT CONTEXT/TOOL PATH used by normal campaign execution.

Preferred flow:

1. isolate hidden ground truth;
2. construct the real local investigation context for the pre-fix visible surface;
3. run the configured CLI reasoner through `AgentRuntime`/normal campaign machinery;
4. index source;
5. inspect selected path(s);
6. form hypothesis/candidate grounded in visible source;
7. invoke shared deterministic reproduction provider;
8. observe pre-fail/post-pass;
9. mechanically admit dossier;
10. verify request leakage is zero;
11. verify sibling HEAD/worktree/status unchanged.

Use the existing ouchan case if still suitable, but do not add case-specific code that makes the proof vacuous.

The proof is invalid if the reasoner receives hidden failing-test path/fix diff/fix subject/expected answer.

## M8 — Endurance sanity after wiring

Do not waste time forcing a literal 60-minute run before the product path works.

After M7 is green, run a bounded live-provider campaign long enough to demonstrate multiple investigations using the real context path. If provider limits or stagnation stop before 1h, report that truthfully. Do not loop pointlessly merely to consume wall time.

A full-hour soak remains useful but is secondary to real sensing/reproduction correctness.

## M9 — Integration review and certification

The orchestrator independently reviews every delegated lane:

- inspect diffs, not worker summaries;
- confirm owned paths;
- rerun lane acceptance tests after reconciliation;
- run cross-lane focused tests;
- run typecheck/hardening/agent/project/workspace/session checks;
- run full `npm test`;
- run `gate:local` FULL PASS;
- run `gate:clean` in fresh Node 20 clone;
- update task/parent programme/current-state anchors only after implementation truth is validated.

Any post-integration regression must be recorded and fixed, not hidden by deleting/loosening tests.

## Suggested delegation lanes

The orchestrator may keep this sequential if simpler. If parallel delegation is beneficial, use no more than these ownership-separated lanes after M2 interfaces are frozen:

1. **Context lane** — real local source/System Map/Bug Atlas/System Atlas/evidence providers and campaign wiring.
2. **Replay lane** — shared deterministic reproduction provider + benchmark migration.
3. **Admission lane** — mechanical finding admission + scoring tier.
4. **Continuity lane** — programme identity validator/duplicate repair.

Global `.agent/ACTIVE_TASK.md`, parent programme state, `docs/CURRENT_STATE.md`, OpenSpec lifecycle, package manifests/lockfiles, and final integration tests remain orchestrator-owned unless explicitly reassigned.

## Stop conditions

Stop and report PARTIAL rather than claim completion if any of the following remains true:

- normal product campaign still depends on synthetic fixtures for its claimed real source/Atlas evidence;
- historical proof requires a benchmark-private privileged executor;
- reproductionCount can be supplied by model draft rather than derived mechanically;
- hidden ground truth leaks to the reasoner;
- sibling repo mutation occurs;
- any required gate fails;
- real sensing/reproduction success is inferred rather than executed.

## Terminal definition

Task COMPLETE means the normal autonomous campaign path has real local sensing + shared deterministic reproduction + mechanically grounded dossier admission, proves one leak-free historical reproduced defect through that path, fixes durable programme identity ambiguity, and passes full certification.
