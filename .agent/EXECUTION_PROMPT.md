# Nightwatch Executor Campaign — Phase 24 Authority Lifecycle + Whole-Repository Hardening

Status: ACTIVE
Planned-From: `4c7dc739e5b5004da36623ed4c97b45ce20d1340`
Target-Branch: `main`
Campaign-Class: `HARDENING`
Campaign-ID: `phase24-authority-lifecycle-hardening`
Execution-Budget: approximately one long autonomous workday / ~10 hours of substantive audit, implementation, adversarial testing, repository-wide hardening, hygiene, regression validation, and closure. This is a breadth-and-depth target, not permission to pad the run. Do not stop after the first defect or after the Phase 24 work is green while later mandatory workstreams remain materially unverified.

## 0. Mission

Run one integrated hardening campaign with three mandatory stages:

1. **Primary mission — Phase 24 authority lifecycle and stale-artifact invalidation hardening.** Prove that a stale, superseded, removed, ambiguously current, or partially unavailable candidate incarnation cannot remain mechanically authoritative merely because its stable logical candidate identity still exists.
2. **Whole-repository hardening sweep.** After the focused Phase 24 mission is green, audit the entire Nightwatch repository and its cross-system boundaries for reproducible correctness, safety, determinism, recovery, concurrency, cache/currentness, validation, privacy, and operator-state defects. Fix every reproducible Critical/High defect found. Fix Medium defects when the root cause is well understood, the change is bounded, and regression risk is low. Record lower-severity or speculative findings instead of creating churn.
3. **Workspace/worktree hygiene.** Reconcile the current accumulation of local autonomous-agent worktrees, local swarm branches, and generated test-output directories safely, then leave behind a durable prevention mechanism so future campaigns do not leak abandoned worktrees/branches or persistent test clutter.

The repository-wide stage is not optional and must not be reduced to a grep of recently changed files. Audit the authored codebase, tests, scripts, configuration, CI/gates, continuity machinery, local runtime boundaries, caches, persistence, process/filesystem/network wrappers, and all major producer/consumer seams. Recent changes are entry points, not audit boundaries.

The goal is not to maximize code change. Every repair must be justified by reproduced evidence or a mechanically demonstrable robustness gap. Do not invent defects, rewrite mature architecture for aesthetics, add features to consume the budget, or weaken existing safety/quality gates.

## 1. Why this campaign is next

The previous response-flow proof-binding hardening campaign is COMPLETE. Its fresh approved-source census remained structurally identical to Phase 28 and it closed two real false-positive declaration-binding defects. The next planner audit found a higher-value cross-layer trust seam in Phase 24 authority/currentness semantics, and the owner has now explicitly requested a repository-wide hardening stage in the same long campaign.

Important Phase 24 audit hypotheses:

1. `Phase24CandidateDecision.candidateId` is deliberately a stable logical surface identity derived from surface/target/product/route/contract/expectation fields rather than source SHA/evidence. Existing tests explicitly expect candidate ID stability across source SHA changes. **Do not casually change this contract.** If incarnation-specific identity is required, introduce or strengthen a separate authority/revision binding instead of silently redefining the logical candidate ID.
2. `analyzePhase24SourceSnapshot()` computes `sourceSnapshotMatches` against an explicit snapshot, while lower-level portfolio normalization treats omitted `sourceSnapshotMatches` as `true`. The real-source bridge also currently constructs Phase 24 inputs with `sourceSnapshotMatches: true`. Audit whether every eligibility-conferring path has mechanically proved that assertion and eliminate optimistic trust where the boundary is caller-controlled or ambiguous.
3. `buildPhase24CandidateInvalidationLedger()` correlates prior/current decisions by `surfaceKey`, accepts one global `sourceAvailable` boolean, and emits a record whose single `candidateId` comes from `current ?? prior`. Audit candidate-ID-changing transitions, partial source-repository unavailability, removal/reappearance, and downstream consumers. A current-side-only identity must not leave prior replay/dossier/manifest artifacts looking valid.
4. Replay plans bind candidate ID + occurrence + source + semantic contract + expectation. Dossiers bind candidate IDs plus source contracts. Manifests bind full portfolio digests and selected-candidate snapshots. These are strong local contracts, but their cross-version lifecycle must be proven against invalidation/currentness rather than assumed.
5. The repository now has a large, mature proof pipeline. A narrow unit-only patch would be insufficient. The focused work must be followed by a genuine whole-repository hardening sweep.

These are hypotheses and trust seams, not pre-decided bugs. Reproduce before changing semantics.

## 2. Non-negotiable operating rules

Read and obey, in precedence order, the repository's current instructions and state before changing code:

- `AGENTS.md`
- `.agent/PLANNER_HANDOFF.md`
- `docs/CURRENT_STATE.md`
- `docs/SAFETY_MODEL.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md` only as historical/planning context; do not follow stale “recommended next” text over current state
- `.agent/ACTIVE_TASK.md`
- this execution prompt
- the new campaign continuity files once created

Before substantive implementation:

- fetch/prune safely and reconcile with `origin/main` according to repository policy;
- verify current HEAD and compare it with `Planned-From`;
- if `main` advanced, inspect every intervening commit/diff and reconcile this campaign against landed work instead of overwriting it;
- run required continuity/project checks;
- perform a fresh bounded live Git/source census sufficient to prove approved-source/currentness assumptions used by the primary mission;
- create a fresh continuity-v2 task under `.agent/tasks/phase24-authority-lifecycle-hardening/` with `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`, then route `.agent/ACTIVE_TASK.md` to it;
- record the three mandatory stages and their audit coverage in PLAN/STATE so context compaction cannot accidentally skip the repository-wide or hygiene stages.

Permanent boundaries remain unchanged:

- no production contact;
- no GCP/GKE/Kubernetes/AWS/infrastructure/datastore/SQL/IAM work;
- no Phase 6 resurrection;
- no Alphaus sibling-repository modification, install, checkout rewrite, fetch on Nightwatch's behalf, or generated files in those repos;
- no external publication or issue/Slack/email/Drive handoff;
- no raw source text, customer values, auth material, runtime bodies, credentials, screenshots, or traces persisted into Git-tracked artifacts;
- source reads remain bounded, local, read-only, path-confined, and ephemeral;
- do not run authenticated DEV/NEXT/browser/API campaigns unless a separate fresh owner authorization already exists in current repository state. This campaign itself grants none;
- Phase 24 remains the sole portfolio authority; do not create a parallel selection authority;
- deterministic evidence outranks heuristics/AI;
- all fail-closed safety, privacy, containment, and owner-scope contracts remain at least as strict as current `main`;
- never delete, reset, force-push, or overwrite uncertain work merely to make the workspace look clean.

## 3. Stage A — Phase 24 authority lifecycle audit

Do not limit review to recently changed files. Build a producer/consumer authority graph and inspect the complete dependency cone for candidate identity, source currentness, invalidation, and stale-artifact handling.

At minimum audit:

### 3.1 Phase 24 core

- `src/core/phase24/types.ts`
- `src/core/phase24/common.ts`
- `src/core/phase24/sourceAnalysis.ts`
- `src/core/phase24/portfolio.ts`
- `src/core/phase24/invalidation.ts`
- `src/core/phase24/manifest.ts`
- `src/core/phase24/rehearsal.ts`
- `src/core/phase24/replay.ts`
- `src/core/phase24/dossier.ts`
- `src/core/phase24/semantic.ts`
- `src/core/phase24/observability.ts`
- every Phase 24 export/validator that can accept or re-emit candidate/source identity

### 3.2 Real source intelligence and bridges

- `src/core/source/surfaces.ts`
- `src/core/source/scan.ts`
- `src/core/source/scanTypes.ts`
- `src/core/source/approvedScan.ts`
- `src/core/source/cache.ts`
- `src/core/source/invalidation.ts`
- `src/core/source/review.ts`
- `src/core/source/gapTaxonomy.ts`
- `src/core/source/responseFlow.ts`
- `src/core/source/siblingSource.ts`
- `src/core/source/semanticCampaignBundle.ts`
- source/snapshot/currentness adapters under change intelligence, repositories, provenance, project snapshot, campaign intelligence, or semantic coverage that feed the above

### 3.3 Downstream authority consumers

Audit every use of the following as a key or authority:

- `candidateId`
- `surfaceKey`
- portfolio digest
- source repo/SHA/evidence digest
- contract ID/request/response digests
- semantic expectation ID
- replay plan identity
- dossier source contracts/candidate IDs
- invalidation arrays/records
- cache keys
- manifest selected-candidate snapshots
- local triage/finding identity

Include relevant modules under `src/core/campaign*`, `src/core/portfolio`, `src/core/triage`, `src/core/evidence`, `src/core/provenance`, `src/core/projectSnapshot`, `src/core/readiness`, `src/core/qualityGate`, CLI/operator adapters in `bin/`, and synthetic campaign plumbing.

### 3.4 Tests, gates, state, and CI authority

Inspect rather than assume coverage from filenames:

- `tests/unit/phase24LocalTriage.test.ts`
- Phase 24 synthetic/proxy tests
- Phase 25–28 source-intelligence tests
- `tests/unit/responseFlowBindingHardening.test.ts`
- campaign/portfolio/triage/provenance/currentness/cache/invalidation tests in the dependency cone
- `package.json` scripts
- `bin/hardening-check.mjs`
- quality-gate scripts and inventories
- `.github/workflows/hardening.yml`
- continuity/project-state validators

Record audited seams and deliberately unchanged seams with rationale.

## 4. Stage A mandatory adversarial matrix

Create deterministic probes/tests for real defects before selecting a repair design. Exercise transitions independently and in combinations. Do not settle for “digest changed”; prove whether stale authority can cross the boundary.

### 4.1 Stable logical candidate, changed source incarnation

- same surface/route/contract/expectation, source SHA changes;
- same SHA but source evidence digest changes;
- both change;
- relevant implementation files/owner evidence change while logical identity remains stable;
- currentness flips CURRENT → DRIFTED/UNKNOWN/unavailable → CURRENT.

Prove whether old replay plans, dossier assumptions, selected-candidate snapshots, and cache entries are rejected or explicitly invalidated.

### 4.2 Candidate-ID-changing transitions

Exercise changes to identity-participating fields:

- route identity/template;
- request/response contract identity/digest/version;
- semantic expectation identity;
- target/product identity where structurally legal.

Because invalidation correlation is by `surfaceKey`, verify that both prior artifact identity and current replacement identity are represented unambiguously. A stale replay/dossier keyed by the prior candidate ID must not survive merely because invalidation exposes only the replacement ID.

### 4.3 Removal, reappearance, and key reuse

- candidate removed while its source repo remains available;
- candidate absent because its source repo is unavailable;
- candidate later reappears with the same surface key but different source/contract/expectation;
- candidate reappears with stable logical candidate ID but a different authority incarnation;
- duplicate/colliding surface keys and candidate IDs must fail closed according to existing contracts.

### 4.4 Partial approved-source unavailability

Reproduce at least:

- one repository unavailable while other approved repositories remain current;
- two unavailable repositories;
- an unavailable repository that previously supplied an eligible candidate while unrelated candidates remain present;
- recovery of that repository at a new SHA/evidence digest.

Audit the global `sourceAvailable` invalidation input. If it cannot truthfully model per-candidate/per-repository availability, replace or augment it with a mechanically bound representation. Do not misclassify “source unavailable” as “contract removed,” or vice versa.

### 4.5 Snapshot-match trust boundary

Exercise:

- explicit `sourceSnapshotMatches: false`;
- field omitted on a direct portfolio-builder call;
- field asserted `true` by an untrusted/low-level caller without an explicit snapshot comparison;
- mixed-repository portfolio inputs;
- per-repository snapshot analysis followed by aggregate portfolio selection.

Any eligibility-conferring assertion must be derived inside a trusted constructor from exact identities or be required/validated as proven input. Absence must not become proof.

### 4.6 Manifest/rehearsal/replay/dossier stale crossing

Construct old/new portfolio pairs and prove that an artifact created from old authority cannot be consumed as current after each relevant transition:

- old manifest vs new portfolio;
- old replay plan vs current source/contract/expectation;
- old dossier assumptions vs changed ownership/relevant files/source contract;
- old selection vs new portfolio;
- old cache result vs new source/config/currentness;
- invalidation-ledger consumption by downstream code.

If no direct consumer exists, document it and harden the contract so future consumers cannot misread ambiguous fields.

## 5. Stage A repair requirements

Choose the smallest architecture that makes authority explicit and mechanically checkable.

- Preserve stable logical candidate identity unless evidence requires a migration. Prefer a separate candidate authority/revision/incarnation binding when currentness needs stronger identity.
- Make invalidation lossless: prior identity, current replacement identity, exact source incarnation changes, replay/dossier invalidation, transition reason, and stale artifact keys must remain unambiguous.
- Make source availability granular if a single boolean is unsafe for a multi-repository universe.
- Eliminate optimistic authority defaults for `current`, `matching`, `safe`, `proven`, or `available` values at trust boundaries.
- Bind replay plans, manifests, dossiers, selections, rehearsals, cache records, and triage outputs to the correct canonical authority layer without duplicating Phase 24 selection logic.
- If serialized/schema-visible contracts change, version them deliberately; update validators/digests/compatibility behavior and never silently accept old ambiguous shapes as authoritative.

## 6. Stage A adversarial/property net

Build a bounded deterministic transition corpus that systematically generates legal prior/current pairs across the authority axes above. Add hand-written cases for high-risk interactions.

Required properties include:

- deterministic output under input-order permutations;
- no stale prior artifact remains current after an authority-relevant transition;
- unrelated candidates remain current when another repository/source becomes unavailable;
- restoration/reappearance never auto-revalidates an older-incarnation artifact;
- currentness cannot be obtained from omitted proof fields;
- logical candidate stability does not imply source-incarnation stability;
- candidate-ID-changing transitions retain both prior and current identity in invalidation evidence;
- no duplicate invalidation identity or ambiguous mapping;
- source/replay/dossier/manifest/selection digests change exactly when authority inputs require and remain stable under irrelevant ordering changes;
- privacy projection remains raw-source-free;
- all bounded count/size/determinism limits remain enforced.

Where useful, add mutation-style tests that alter one authority field at a time and assert the exact rejection/invalidation consequence.

## 7. Dedicated cache/currentness audit

Prove cached source discovery/analysis cannot be reused incorrectly across:

- source SHA changes;
- source evidence/content digest changes;
- scan configuration changes;
- analyzer/response-flow schema changes;
- partial source disappearance/recovery;
- authority-schema/version changes introduced by this campaign.

Check both cache-key construction and all reuse call sites. If a cache entry can become stale while still validating structurally, fix it and add a regression.

## 8. Stage B — mandatory whole-repository hardening sweep

Only after Stage A focused tests and dependency-cone validation are green, perform a fresh systematic hardening audit of the **entire Nightwatch repository**. This stage is mandatory even if every Stage A hypothesis is disproved.

Do not merely rerun existing gates and call that a hardening audit. Inspect implementation and exercise adversarial behavior across all major subsystems. Build an audit inventory from the actual repository tree and record coverage in the campaign report.

At minimum cover these classes:

### 8.1 Safety, containment, and authority

- owner-scope enforcement and fail-closed unknown operation classes;
- production/DEV/NEXT guards and explicit authorization boundaries;
- sibling-repository read-only/path-confined access;
- raw-source/value/privacy projection boundaries;
- local finding/evidence persistence and sanitization;
- capability leakage between deterministic core, AI/self-dev, browser/API adapters, and operator tooling;
- any default/nullable path where absence can accidentally mean authorized/safe/current.

### 8.2 State, continuity, recovery, and idempotence

- continuity-v2 state transitions and duplicate/stale fields;
- interrupted campaign/checkpoint recovery;
- partial writes and atomicity of local durable state;
- stale task/report/project-state disagreement;
- rerun/idempotence behavior after interruption;
- malformed/corrupt persisted artifacts and schema-version mismatches;
- recovery from half-completed cleanup/checkpoint/gate operations.

### 8.3 Determinism, identity, and provenance

- all hashes/digests/fingerprints and canonical ordering;
- duplicate/collision handling;
- provenance binding and stale-source rejection;
- ordering-dependent results;
- serialization stability and schema drift;
- old artifact consumption against newer authority.

### 8.4 Concurrency, process, filesystem, and workspace behavior

- concurrent workers touching shared files/state;
- race-prone temporary files and rename/atomic-write patterns;
- subprocess timeout/abort/error propagation;
- stale lock/lease behavior where applicable;
- path traversal/symlink/canonicalization boundaries;
- environment-variable/config isolation;
- worker crashes leaving ambiguous durable state;
- worktree/branch creation and cleanup lifecycle used by autonomous agents.

### 8.5 Input validation and failure semantics

- malformed config, unsupported enum/operation kinds, impossible combinations, empty/missing fields, oversized bounded inputs;
- parser/extractor ambiguity;
- unsafe optimistic fallbacks;
- swallowed exceptions, warning-only paths that should fail closed, misleading success receipts;
- CLI exit codes and operator-visible classification of code failure vs external/platform blocker.

### 8.6 Tests, gates, and negative-space coverage

- tests that assert only happy paths but miss stale/corrupt/partial states;
- tests that mock away the exact boundary they claim to validate;
- duplicated fixtures that can drift from real constructors;
- quality-gate inventory holes;
- CI/local parity and clean-checkout assumptions;
- skipped tests whose reason is stale or no longer mechanically justified;
- dead validation scripts, unreachable checks, or gates that can return success without performing meaningful work.

### 8.7 Architecture and dead-assumption audit

- stale compatibility shims still granting authority;
- duplicate authority sources;
- legacy paths accidentally reachable from current entry points;
- unused exports/types/configs that create misleading supported surface;
- cross-phase assumptions invalidated by Phase 24–28 evolution;
- performance/resource blowups in bounded scanners, corpus generation, test enumeration, or cache invalidation.

### 8.8 Whole-repo defect handling policy

For each candidate defect:

1. Reproduce or mechanically prove the robustness gap.
2. Classify severity and blast radius.
3. Identify the root cause and all affected consumers.
4. Fix Critical/High defects in this campaign; they are not deferrable.
5. Fix Medium defects when bounded and low-risk; otherwise document exact follow-up with evidence.
6. Do not perform aesthetic refactors, speculative rewrites, feature additions, or low-value churn.
7. Add regression coverage for every behavior-changing fix.
8. Re-run the affected dependency cone before moving on.

The repository-wide sweep is complete only when every major subsystem has an explicit audited/unchanged/fixed result in REPORT.md. “No defects found” is acceptable only with concrete audit evidence.

## 9. Stage B cross-system adversarial scenarios

Add or execute deterministic probes where the current suite does not already prove the boundary. Include as applicable:

- malformed or stale continuity/task state;
- corrupt/truncated local artifacts;
- old schema versions presented as current;
- interrupted atomic write/recovery;
- duplicate IDs/digests and ordering perturbation;
- stale caches after source/config/schema changes;
- one or more source repositories unavailable and later restored;
- subprocess failure, timeout, cancellation, and partial output;
- invalid path/symlink/traversal attempts at repository/source boundaries;
- concurrent workers targeting shared state;
- stale worktree/branch residue from interrupted autonomous swarms;
- privacy-sentinel values attempting to cross persistence/logging/error boundaries;
- invalid manifests/replay plans/dossiers/selections consumed against newer authority;
- command/gate failures that must not be misreported as success;
- clean-checkout parity vs a developer workspace containing ignored/generated files.

Prefer a compact high-signal matrix over thousands of redundant fixtures.

## 10. Stage C — workspace, worktree, branch, and generated-output hygiene

The current owner workspace visibly contains many sibling directories such as `nightwatch-isolated-*` plus local `swarm/*` and `swarm2/*` branches. The canonical Nightwatch checkout also contains ignored generated outputs such as `test-results*` and `artifacts/`. Treat this as a local hygiene problem, not as tracked-source corruption.

### 10.1 Initial inventory — do not delete first

At campaign bootstrap, capture a sanitized local inventory using Git-native mechanisms:

- `git worktree list --porcelain` from the canonical Nightwatch repository;
- local branches, especially `swarm/*`, `swarm2/*`, and any campaign-generated temporary namespace;
- branch-to-worktree attachment;
- clean/dirty/untracked state of every registered worktree;
- whether each worktree HEAD is already reachable from current `main`;
- whether each branch is fully merged/reachable from current `main`;
- ignored generated-output families in the canonical worktree (`test-results/`, `test-results-*/`, test-generated `artifacts/*`, and other repository-defined transient outputs).

The `+` marker shown by `git branch` means that branch is checked out in another linked worktree. Never try to delete such a branch before safely handling its worktree.

### 10.2 Safe cleanup rules

Cleanup must be conservative and evidence-driven:

- never remove a dirty worktree automatically;
- never remove a worktree or branch containing commits not reachable from canonical `main` unless those commits have first been intentionally integrated or explicitly preserved/quarantined;
- never use `git branch -D`, `git worktree remove --force`, `git reset --hard`, or recursive deletion merely to achieve a clean-looking workspace;
- for a clean registered worktree whose HEAD is already reachable from canonical `main` and which is no longer active, remove it with normal Git worktree removal, then run `git worktree prune`;
- after its worktree is gone, delete its merged local branch with normal safe deletion (`git branch -d` semantics), never force deletion;
- if a directory looks like an old `nightwatch-isolated-*` workspace but is not a registered worktree, inspect it for `.git`/unique/uncommitted content before doing anything. If certainty is insufficient, leave it untouched and record it for the owner rather than deleting it;
- do not remove any currently active worker's worktree. Perform final pruning after all campaign workers have finished and their changes are integrated;
- generated test result directories may be removed after their receipts have been captured and they are no longer needed. Do not delete owner-only findings or evidence that policy requires to remain available;
- preview ignored-file cleanup before applying it. Prefer targeted cleanup of known transient families over broad `git clean -fdx` or similar destructive commands.

The screenshot's `test-results*`, `artifacts`, and `node_modules` are already ignored by repository policy; the problem is local accumulation, not `.gitignore` coverage. Do not churn `.gitignore` unless the audit finds a real missing transient family.

### 10.3 Durable prevention mechanism

Implement a small repository-native, deterministic, **dry-run-first** hygiene mechanism so future autonomous campaigns can detect and reconcile this residue without bespoke shell archaeology. Exact implementation is executor-selected, but it must provide equivalent behavior to:

- a status/audit command that inventories registered worktrees, attached local branches, merged/reachable status, dirty state, and known generated-output residue;
- an explicit apply/clean mode that removes **only proven-safe** merged clean worktrees/branches and known transient test outputs;
- refusal/fail-safe behavior for dirty, unmerged, ambiguous, locked, or active-looking worktrees;
- deterministic machine-readable or stable text output suitable for tests;
- Windows/WSL-safe path handling where repository tooling already supports both;
- no network requirement;
- no external repository mutation;
- no secret/raw-evidence output.

Preferred integration if consistent with current repository conventions:

- `npm run hygiene:status`
- `npm run hygiene:clean` or an explicit `--apply` equivalent
- focused unit/integration tests for safe vs unsafe cleanup classification
- a short permanent agent-hygiene rule in `AGENTS.md` requiring autonomous workers to use isolated run-scoped worktrees, integrate/preserve their changes, and clean them at successful campaign closure.

Do **not** make destructive cleanup an unconditional CI step. CI may audit hygiene contracts, but local worktree removal must remain an explicit local operation.

### 10.4 Prevent future swarm collisions and leaks

If autonomous sub-agents/workers create worktrees or branches during this campaign or future campaigns, establish these invariants:

- one worker owns one unique worktree and one unique run-scoped branch;
- no two workers write to the same worktree;
- no worker may reset, checkout, clean, delete, or rewrite another worker's worktree/branch;
- branch/worktree names include a campaign/run identifier rather than reusing generic names indefinitely;
- canonical `main` remains the integration authority;
- worker results are integrated intentionally, validated, then the worker worktree/branch is retired if fully merged;
- interrupted workers leave detectable state that the hygiene status command reports rather than silently abandoning it;
- on final campaign closure, no campaign-created ephemeral worktree/branch remains unless REPORT.md explains exactly why it is preserved.

## 11. Cross-codebase regression after each substantive fix

After each root fix, re-read affected consumers rather than assuming TypeScript errors/tests expose semantic impact. Re-check as relevant:

- source discovery counters/gap taxonomy/review output;
- Phase 24 eligible/excluded counts and selection ordering;
- manifest/rehearsal authority;
- replay and minimization;
- dossier/owner routing;
- campaign synthetic operator;
- triage/finding packaging;
- portfolio/change-impact/replan logic;
- project/current-state and hardening-gate assumptions;
- deterministic digests/version compatibility;
- continuity/recovery behavior;
- hygiene/worktree lifecycle if agent execution topology changed.

Fix every regression caused by this campaign. Critical/High regressions are not deferrable.

## 12. Validation ladder

Use repository-native commands and preserve exact receipts/counts in `STATE.md`/`REPORT.md`. After focused tests are green, run broad dependency cones and authoritative whole-repository gates.

Required end-state validation unless genuinely unavailable and documented as BLOCKED:

1. focused new authority/invalidation tests;
2. existing `tests/unit/phase24LocalTriage.test.ts`;
3. Phase 24–28 source/campaign suites plus response-flow binding hardening;
4. cache/currentness/provenance/portfolio/triage tests touched by Stage A;
5. focused tests for every Stage B whole-repo defect fixed;
6. hygiene classification/cleanup tests introduced by Stage C;
7. `npm run campaign:synthetic`;
8. `npm run test:owner-provenance`;
9. `npm run typecheck`;
10. `npm run hardening:check`;
11. `npm run agent:check`;
12. `npm run agent:audit`;
13. `npm run project:check`;
14. the new hygiene status/audit command, proving no unsafe cleanup candidate was silently discarded;
15. `npm run gate:local`;
16. `npm run gate:clean` / authoritative clean-gate path;
17. full Playwright test enumeration and full canonical test run;
18. repository isolated/disposable parity run if current policy still requires it;
19. `npm run gate:ci` locally if part of current authoritative closure and still offline/safe;
20. final Git/worktree hygiene audit after all workers are integrated and stopped.

Baseline comparison context from the immediately prior campaign: full Playwright validation reported 2,459 enumerated / 2,443 passed / 16 skipped / 0 failed, and the compatibility cone reported 1,874 total / 1,861 passed / 13 skipped / 0 failed. Report exact new counts rather than forcing them to match if legitimate tests were added.

Do not weaken, skip, or remove existing tests merely to make a gate pass. Any deliberate SKIP remains explicit and justified.

## 13. Fresh source census and real-source proof

Because Stage A concerns currentness authority, run a fresh bounded approved-source census using canonical read-only source tooling. Record only sanitized identities/counters permitted by policy.

Compare with planner-era last-known approved heads, but do not assume they are still current:

- `alphauslabs/blue-sdk-go` — `8883ee3d3a073352626c8c35e20e9fc5ed765373`
- `alphauslabs/blueapi` — `691422e5dc81afd263d064986fb50fcb3ea432a9`
- `alphauslabs/grpc-chunk-parser` — `66802f281698dfcf0903f0a117d4637fce3fd945`
- `mobingilabs/ouchan` — `565f00a87fb7616cc23c45d4ffeabee38a41c65f`
- `mobingilabs/ripple-api` — `27bb007ad0c798800b6bd3b29760c966422966e7`
- `mobingilabs/ripple-ui` — `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`

Prior exact source snapshot/config identities were `srcsnapshot:sha256:04ff583971865f335902f5ad` and `srcconfig:sha256:e8bdfc8f0e58d7d93a87215`. Recompute; do not reuse them as currentness proof.

A real-source regression is not accepted merely because synthetic fixtures pass. Conversely, source drift is not permission to update sibling repositories or broaden scope; classify it honestly and make Nightwatch fail closed.

## 14. Documentation and continuity closure

Keep continuity-v2 state live throughout the long run. Use durable checkpoints after validated milestones rather than one giant end-of-session commit.

The final task report must include:

- starting and final Nightwatch SHAs;
- exact commits created by this campaign;
- fresh approved-source snapshot/config identity and sanitized per-repo currentness/census summary;
- complete Stage A producer/consumer authority graph summary;
- every Stage A reproduced defect, root cause, and stale-authority path;
- Stage A hypotheses disproved and deliberately left unchanged;
- complete Stage B whole-repository audit inventory by subsystem, including explicit audited/unchanged/fixed status;
- every repository-wide defect fixed with severity, root cause, blast radius, and regression coverage;
- any Medium/Low follow-ups deliberately deferred with evidence;
- schema/version changes and compatibility decisions;
- files/subsystems changed;
- adversarial/property cases added and what each class proves;
- initial and final worktree/branch/generated-output hygiene census;
- which stale worktrees/branches/outputs were safely retired;
- any preserved ambiguous/dirty/unmerged worktree or branch and why it was not deleted;
- permanent hygiene mechanism and tests;
- focused, dependency-cone, synthetic, owner-provenance, typecheck, hardening, continuity/project-state, local/clean/CI-equivalent, and full Playwright receipts;
- safety/privacy/owner-scope confirmation;
- external CI status for the final pushed SHA when observable, clearly separated from local evidence.

Update `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, architecture/roadmap documentation, `AGENTS.md`, and package/scripts only where implemented contracts or durable agent-hygiene rules truly change. Do not churn historical documents gratuitously.

## 15. Git hard requirements

Development checkpoints and final closure follow the repository's direct-to-main policy:

- never force-push;
- never overwrite unrelated remote advances;
- inspect/reconcile before each push when remote may have moved;
- commit only intended Nightwatch files;
- use detailed handoff-quality commit messages for substantive checkpoints;
- push validated checkpoints to `origin/main`;
- at final closure fetch/reconcile again and verify local `HEAD == origin/main`;
- finish the canonical Nightwatch worktree clean;
- retire campaign-created temporary worktrees/branches that are proven merged and clean;
- preserve and report any uncertain/dirty/unmerged local worktree rather than destroying it;
- inspect hosted CI for the pushed final SHA when available; if GitHub Actions is blocked by account/platform state, record that as external and do not misreport it as a code failure.

When every completion gate is satisfied, update this file's `Status` from `ACTIVE` to `COMPLETE` and record the final task report path/final SHA. Do not mark it COMPLETE earlier.

## 16. Definition of done

This campaign is COMPLETE only when all of the following are true:

- the complete candidate/source authority dependency cone has been audited, not just initial suspect functions;
- every reproducible Critical/High stale-authority/currentness defect found in Stage A is fixed at root with regression coverage;
- stable logical candidate identity remains deliberate/documented, with incarnation/currentness represented separately if needed;
- invalidation is lossless across candidate-ID-preserving and candidate-ID-changing transitions;
- partial multi-repository source unavailability is modeled truthfully and fail closed;
- omitted/unproven snapshot-match/currentness fields cannot confer eligibility through an authority boundary;
- stale replay/dossier/manifest/selection/cache artifacts are mechanically rejected after relevant authority transitions;
- unrelated current candidates are not invalidated by another source repository disappearing;
- a fresh whole-repository hardening sweep has covered every major Nightwatch subsystem and boundary, with concrete audit evidence in REPORT.md;
- every reproducible Critical/High defect found anywhere in that whole-repo sweep is fixed at root and regression-tested;
- Medium defects are either safely fixed or precisely deferred with evidence and severity rationale;
- no safety/privacy/containment/owner-scope boundary was weakened;
- the workspace hygiene stage has inventoried current `nightwatch-isolated-*` worktrees/local swarm branches/generated output, safely retired only proven-safe residue, and preserved anything ambiguous;
- a durable dry-run-first hygiene mechanism plus agent lifecycle rule prevents the same worktree/branch accumulation from silently recurring;
- no campaign-created ephemeral worktree/branch remains without an explicit preservation reason;
- the full validation ladder passes or an external-only blocker is accurately classified without weakening local gates;
- continuity/project truth files are coherent and terminal;
- all intended commits are pushed to `origin/main`, local/remote heads match, and canonical worktree is clean;
- this execution prompt is marked COMPLETE only at that point.

Do not stop merely because the first suspected seam is safe or because Stage A is green. Continue through Stage B and Stage C. Conversely, do not invent feature work or cosmetic refactors merely to consume the time budget.

## 17. Executor final response

Return a concise but complete engineering handoff containing:

- campaign result;
- initial/final HEAD;
- commits;
- Stage A root causes fixed and major hypotheses disproved;
- Stage B whole-repo audit summary and defects fixed/deferred by severity;
- Stage C worktree/branch/output cleanup summary and permanent prevention mechanism;
- changed subsystems;
- exact test/gate counts and results;
- fresh source census/currentness result;
- safety/privacy status;
- hosted CI status;
- external blockers/deferrals;
- confirmation that `HEAD == origin/main`, canonical worktree is clean, and no campaign-created disposable worktree/branch remains without a documented preservation reason.

Then stop. Do not self-select another campaign; a fresh `next-campaign` audit is required after this one.