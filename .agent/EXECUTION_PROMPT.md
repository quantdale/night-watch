# Nightwatch Executor Campaign — Phase 24 Authority Lifecycle & Stale-Artifact Invalidation Hardening

Status: ACTIVE
Planned-From: `f582f509edf52aca8713d1d2e7270f8c0c6540fd`
Target-Branch: `main`
Campaign-Class: `HARDENING`
Campaign-ID: `phase24-authority-lifecycle-hardening`
Execution-Budget: approximately one long autonomous workday / ~10 hours of substantive audit, implementation, adversarial testing, regression validation, and closure. This is a breadth-and-depth target, not permission to pad the run. Do not stop after the first defect if later workstreams remain materially unverified.

## 0. Mission

Harden Nightwatch's source-derived Phase 24 authority lifecycle end to end so a stale, superseded, removed, ambiguously current, or partially unavailable candidate incarnation can never remain mechanically authoritative merely because its stable logical candidate identity still exists.

The central requirement is not to maximize code change. It is to prove, with adversarial tests and full-system validation, that candidate selection, source qualification, invalidation, replay planning, dossier assumptions, manifests/rehearsals, cache/currentness decisions, and downstream triage all agree on what is current and what is stale.

Treat this as a whole-system trust-boundary campaign. Audit every relevant producer and consumer, including adjacent modules whose behavior is affected even if they were not recently modified. Fix all reproducible Critical/High correctness defects found in this authority lifecycle. Add regression coverage for every fixed defect. Do not invent a defect merely to justify a change; preserve deliberate stable-identity semantics where the existing contract proves they are intentional.

## 1. Why this campaign is next

The previous response-flow proof-binding hardening campaign is COMPLETE. Its fresh approved-source census remained structurally identical to Phase 28, and it closed two real false-positive binding defects. There is no authorized reason to reopen Phase 27/28 feature expansion or to contact DEV/NEXT.

A fresh planner audit of current `main` found a higher-value cross-layer seam in Phase 24 authority/currentness semantics:

1. `Phase24CandidateDecision.candidateId` is deliberately a stable logical surface identity derived from surface/target/product/route/contract/expectation fields rather than source SHA/evidence. Existing tests explicitly expect the candidate ID to remain stable across source SHA changes. **Do not casually change this contract.** If an incarnation-specific identity is required, introduce or strengthen a separate authority/revision binding instead of silently redefining the logical candidate ID.
2. `analyzePhase24SourceSnapshot()` computes `sourceSnapshotMatches` against an explicit snapshot, but the lower-level portfolio normalization treats an omitted `sourceSnapshotMatches` as `true`. The current real-source bridge also constructs Phase 24 inputs with `sourceSnapshotMatches: true`. Audit whether every path that can confer eligibility has mechanically proved that assertion, and remove optimistic trust where the boundary is caller-controlled or ambiguous.
3. `buildPhase24CandidateInvalidationLedger()` correlates prior/current decisions by `surfaceKey`, accepts one global `sourceAvailable` boolean, and emits records whose single `candidateId` is the current candidate when present. Audit contract/route/semantic changes that change candidate IDs, partial source-repository unavailability in the six-repo approved universe, removal/reappearance, and any downstream logic that invalidates artifacts by candidate ID. A current-side-only ID must not leave prior replay/dossier/manifest artifacts looking valid.
4. Replay plans bind candidate ID + occurrence + source + semantic contract + expectation. Dossiers bind candidate IDs plus source contracts. Manifests bind portfolio digests and selected candidate snapshots. These are strong local contracts, but their cross-version lifecycle must be proven against the invalidation/currentness layer rather than assumed.
5. The repository now has a large, mature proof pipeline. A narrow unit-only patch would be insufficient. The next useful work is an adversarial end-to-end audit of authority propagation across source intelligence → Phase 24 → replay/dossier/manifest/triage, including cache and invalidation behavior.

These are audit hypotheses and concrete trust seams, not pre-decided bugs. Reproduce before changing semantics.

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
- the new campaign's continuity files once created

Before substantive implementation:

- fetch/prune safely and reconcile with `origin/main` according to repository policy;
- verify the current head and compare it with `Planned-From`;
- if `main` advanced, inspect every intervening commit/diff and reconcile this campaign against landed work rather than overwriting it;
- run the required continuity/project checks;
- perform a fresh bounded live Git/source census sufficient to prove the approved source universe/currentness assumptions used by this campaign;
- create a fresh continuity-v2 task under `.agent/tasks/phase24-authority-lifecycle-hardening/` with `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`, then route `.agent/ACTIVE_TASK.md` to it.

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
- all fail-closed safety, privacy, containment, and owner-scope contracts must remain at least as strict as current `main`.

## 3. Required whole-codebase audit before fixing

Do not limit review to recently changed files. Build a producer/consumer authority graph and inspect the entire dependency cone for candidate identity, source currentness, invalidation, and stale-artifact handling.

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
- any source/snapshot/currentness adapters under change intelligence, repositories, provenance, project snapshot, campaign intelligence, or semantic coverage that feed the above

### 3.3 Downstream authority consumers

Audit all code that uses any of these as keys or authority:

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

This includes relevant modules under `src/core/campaign*`, `src/core/portfolio`, `src/core/triage`, `src/core/evidence`, `src/core/provenance`, `src/core/projectSnapshot`, `src/core/readiness`, `src/core/qualityGate`, CLI/operator adapters in `bin/`, and any synthetic campaign plumbing.

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

Record in the task report which seams were audited and which were deliberately unchanged, with rationale.

## 4. Mandatory adversarial reproduction matrix

Before selecting a repair design, create deterministic failing probes/tests for any real defect you can reproduce. Exercise the following transitions independently and in combinations. Do not settle for “digest changed”; prove whether stale authority can or cannot cross the boundary.

### 4.1 Stable logical candidate, changed source incarnation

- same surface/route/contract/expectation, source SHA changes;
- same SHA but source evidence digest changes;
- both change;
- relevant implementation files/owner evidence change while logical identity remains stable;
- currentness flips CURRENT → DRIFTED/UNKNOWN/unavailable → CURRENT.

Prove whether old replay plans, dossier assumptions, selected-candidate snapshots, and cache entries are rejected or explicitly invalidated.

### 4.2 Candidate-ID-changing transitions

Exercise changes to fields participating in candidate identity:

- route identity/template;
- request/response contract identity/digest/version;
- semantic expectation identity;
- target/product identity where structurally legal.

Because invalidation correlation is by `surfaceKey`, verify that both the **prior artifact identity** and the **current replacement identity** are represented unambiguously. A stale replay/dossier keyed by the prior candidate ID must not survive simply because the invalidation record exposes only the replacement ID.

### 4.3 Removal, reappearance, and key reuse

- candidate removed while its source repo remains available;
- candidate absent because its source repo is unavailable;
- candidate later reappears with the same surface key but different source/contract/expectation;
- candidate reappears with stable logical candidate ID but a different authority incarnation;
- duplicate/colliding surface keys and candidate IDs must still fail closed according to existing contracts.

### 4.4 Partial approved-source unavailability

The approved source universe spans multiple repositories. Reproduce at least:

- one repository unavailable while the other approved repositories remain current;
- two unavailable repositories;
- an unavailable repository that previously supplied an eligible candidate while unrelated candidates remain present;
- recovery of that repository at a new SHA/evidence digest.

Audit the current global `sourceAvailable` invalidation input. If it cannot truthfully model per-candidate/per-repository availability, replace or augment it with a mechanically bound representation. Do not misclassify “source unavailable” as “contract removed,” or vice versa.

### 4.5 Snapshot-match trust boundary

Exercise:

- explicit `sourceSnapshotMatches: false`;
- field omitted on a direct portfolio-builder call;
- field asserted `true` by an untrusted/low-level caller without an explicit snapshot comparison;
- mixed-repository portfolio inputs;
- per-repository snapshot analysis followed by aggregate portfolio selection.

Any eligibility-conferring assertion must either be derived inside a trusted constructor from exact identities or be required/validated as a proven input. Avoid optimistic defaults at authority boundaries.

### 4.6 Manifest/rehearsal/replay/dossier stale-crossing tests

Construct old/new portfolio pairs and prove that an artifact created from the old authority cannot be consumed as current after each relevant transition. Include:

- old manifest vs new portfolio;
- old replay plan vs current source/contract/expectation;
- old dossier assumptions vs changed ownership/relevant files/source contract;
- old selection vs new portfolio;
- old cache result vs new source/config/currentness;
- invalidation ledger consumption if any downstream consumer currently trusts its ID lists.

If no direct consumer exists, document that fact and harden the contract so future consumers cannot misread ambiguous fields.

## 5. Repair design requirements

Choose the smallest architecture that makes the authority model explicit and mechanically checkable across all layers.

### 5.1 Preserve logical identity unless evidence requires a migration

The current tests intentionally keep `candidateId` stable across source SHA changes. Do not redefine that stable identity solely to solve currentness. Prefer an explicit incarnation/authority/revision binding if one is needed.

A good design may include concepts such as `candidateAuthorityDigest`, `candidateRevisionDigest`, explicit prior/current candidate IDs on invalidation records, exact per-source availability/currentness maps, or stronger portfolio-source bindings. Names are not prescribed; semantics are.

### 5.2 Make invalidation lossless

For every transition, the invalidation record must preserve enough identity to answer:

- what prior logical/artifact identity became stale;
- what current identity replaces it, if any;
- which exact source incarnation(s) changed or disappeared;
- which replay assumptions are invalidated;
- which dossier assumptions are invalidated;
- whether the state is removal, source unavailability, contract change, semantic change, owner change, replay change, eligibility change, or a combination;
- which stale artifact keys must be rejected.

Avoid a representation in which a changed candidate ID overwrites the prior ID needed to invalidate old artifacts.

### 5.3 Make source availability granular

If the current single boolean cannot model a multi-repository universe safely, move to exact source identity/repository-granular availability without introducing runtime/network authority. A missing source must fail closed without turning unrelated current sources stale.

### 5.4 Eliminate optimistic authority defaults

Audit every boolean or nullable field whose default means “current,” “matching,” “safe,” “proven,” or “available.” At authority boundaries, absence should not become proof. Keep convenience defaults only where the caller is demonstrably internal and the proof is derived in the same trusted function.

### 5.5 Bind downstream artifacts to the right layer

Replay plans, manifests, dossiers, selections, rehearsals, cache records, and triage outputs must bind to enough authority state that stale artifacts are mechanically rejected. Do not duplicate Phase 24 selection logic; strengthen bindings to the canonical portfolio/authority representation.

### 5.6 Version contracts deliberately

If serialized/schema-visible contracts change:

- bump the correct schema/version constants;
- update validators and deterministic digest inputs;
- provide explicit compatibility/migration behavior where the repository's existing contracts require it;
- do not silently accept old ambiguous shapes as authoritative;
- update hardening/gate inventories if the authoritative suite changes.

## 6. Adversarial and property-style test expansion

This campaign should be long because it establishes a durable proof net, not because it adds repetitive fixtures.

Build a compact deterministic transition corpus that systematically generates legal prior/current pairs across the authority axes above. Cover pairwise combinations where feasible and add hand-written cases for high-risk interactions.

Required properties include:

- deterministic output under input ordering permutations;
- no stale prior artifact remains current after an authority-relevant transition;
- unrelated candidates remain current when another repository/source becomes unavailable;
- restoration/reappearance never auto-revalidates an artifact from an older incarnation;
- currentness cannot be obtained from omitted proof fields;
- logical candidate stability does not imply source-incarnation stability;
- candidate-ID-changing transitions retain both prior and current identity in invalidation evidence;
- no duplicate invalidation identity or ambiguous mapping;
- source, replay, dossier, manifest, and selection digests change exactly when their authority inputs require them to change and remain stable under irrelevant ordering changes;
- privacy projection remains raw-source-free;
- all bounded count/size/determinism limits remain enforced.

Where useful, add mutation-style tests that alter one authority field at a time and assert the exact invalidation/rejection consequence. Keep the corpus bounded and fast enough for repository quality gates.

## 7. Cache and currentness audit

Perform a dedicated review of cache identity and invalidation, not just Phase 24 objects.

Prove that cached source discovery/analysis cannot be reused across:

- source SHA changes;
- source evidence/content digest changes;
- scan configuration changes;
- analyzer/response-flow schema changes;
- partial source disappearance/recovery;
- authority-schema/version changes introduced by this campaign.

Check both cache key construction and the call sites that choose to reuse cached results. If a cache entry can become stale while still validating structurally, fix it and add a regression.

## 8. Cross-codebase regression audit after each substantive fix

After each root fix, re-read affected consumers rather than assuming TypeScript errors/tests expose every semantic effect. Specifically re-check:

- source discovery counters/gap taxonomy/review output;
- Phase 24 eligible/excluded counts and selection ordering;
- manifest/rehearsal authority;
- replay and minimization;
- dossier/owner routing;
- campaign synthetic operator;
- triage/finding packaging;
- portfolio/change-impact/replan logic;
- project/current-state and hardening gate assumptions;
- deterministic digests and version compatibility.

Fix every regression caused by this campaign. Critical/High regressions are not deferrable.

## 9. Validation ladder

Use repository-native commands and preserve exact receipts/counts in `STATE.md`/`REPORT.md`. At minimum, after relevant focused tests are green, run the broad dependency cone and then authoritative whole-repository gates.

Required end-state validation unless a command is genuinely unavailable and documented as BLOCKED:

1. focused new authority/invalidation tests;
2. existing `tests/unit/phase24LocalTriage.test.ts`;
3. Phase 24–28 source/campaign suites plus response-flow binding hardening;
4. cache/currentness/provenance/portfolio/triage tests touched by the audit;
5. `npm run campaign:synthetic`;
6. `npm run test:owner-provenance`;
7. `npm run typecheck`;
8. `npm run hardening:check`;
9. `npm run agent:check`;
10. `npm run agent:audit`;
11. `npm run project:check`;
12. `npm run gate:local`;
13. `npm run gate:clean` / the repository's authoritative clean-gate path;
14. full Playwright test enumeration and full canonical test run, plus the repository's isolated/disposable parity run if current policy still requires it;
15. `npm run gate:ci` locally if it is part of the current authoritative closure and remains offline/safe.

Baseline context from the immediately prior campaign: full Playwright validation reported 2,459 enumerated / 2,443 passed / 16 skipped / 0 failed, and the compatibility cone reported 1,874 total / 1,861 passed / 13 skipped / 0 failed. Treat these as comparison context only; report the exact new counts from this campaign rather than forcing them to match if legitimate tests were added.

Do not weaken, skip, or remove existing tests merely to make the gate pass. Any deliberate SKIP must remain explicit and justified.

## 10. Fresh source census and real-source proof

Because this campaign concerns currentness authority, run a fresh bounded approved-source census during execution using the canonical read-only source tooling. Record only sanitized identities/counters permitted by policy.

Compare with the planner-era last known exact approved heads, but do not assume they are still current:

- `alphauslabs/blue-sdk-go` — `8883ee3d3a073352626c8c35e20e9fc5ed765373`
- `alphauslabs/blueapi` — `691422e5dc81afd263d064986fb50fcb3ea432a9`
- `alphauslabs/grpc-chunk-parser` — `66802f281698dfcf0903f0a117d4637fce3fd945`
- `mobingilabs/ouchan` — `565f00a87fb7616cc23c45d4ffeabee38a41c65f`
- `mobingilabs/ripple-api` — `27bb007ad0c798800b6bd3b29760c966422966e7`
- `mobingilabs/ripple-ui` — `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`

The prior exact source snapshot/config identities were `srcsnapshot:sha256:04ff583971865f335902f5ad` and `srcconfig:sha256:e8bdfc8f0e58d7d93a87215`. Recompute; do not reuse them as currentness proof.

A real-source regression is not accepted merely because synthetic fixtures pass. Conversely, source drift is not permission to update sibling repositories or broaden scope; classify it honestly and make Nightwatch fail closed.

## 11. Documentation and continuity closure

Keep continuity-v2 state live throughout the long run. Use durable checkpoints after validated milestones rather than one giant end-of-session commit.

The final task report must include:

- starting and final Nightwatch SHAs;
- exact intervening commits created by this campaign;
- fresh approved-source snapshot/config identity and sanitized per-repo currentness/census summary;
- complete producer/consumer authority graph summary;
- each reproduced defect with root cause and exploit/stale-authority path;
- each hypothesis disproved and therefore left unchanged;
- schema/version changes and compatibility decisions;
- files/subsystems changed;
- new adversarial/property cases and what each class proves;
- focused, dependency-cone, synthetic, owner-provenance, typecheck, hardening, continuity/project-state, local/clean/CI-equivalent, and full Playwright receipts;
- safety/privacy/owner-scope confirmation;
- external CI status for the final pushed SHA when observable, clearly separated from local evidence;
- deliberate deferrals, if any, with severity and why they do not violate completion gates.

Update `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, architecture/roadmap documentation only where the implemented contract truly changes. Do not churn historical documents gratuitously.

## 12. Git hard requirements

Development checkpoints and final closure follow the repository's direct-to-main policy:

- never force-push;
- never overwrite unrelated remote advances;
- inspect/reconcile before each push when remote may have moved;
- commit only intended Nightwatch files;
- use detailed handoff-quality commit messages for substantive checkpoints;
- push validated checkpoints to `origin/main`;
- at final closure fetch/reconcile again and verify local `HEAD == origin/main`;
- finish with a clean worktree;
- inspect hosted CI for the pushed final SHA when available; if GitHub Actions is blocked by account/platform state, record that as external and do not misreport it as a code failure.

When every completion gate is satisfied, update this file's `Status` from `ACTIVE` to `COMPLETE` and record the final task report path/final SHA. Do not mark it COMPLETE earlier.

## 13. Definition of done

This campaign is COMPLETE only when all of the following are true:

- the entire candidate/source authority dependency cone has been audited, not just the initial suspect functions;
- every reproducible Critical/High stale-authority or currentness defect found by this campaign is fixed at its root and has a regression test;
- stable logical candidate identity remains deliberate and documented, with incarnation/currentness represented separately if needed;
- invalidation is lossless across candidate-ID-preserving and candidate-ID-changing transitions;
- partial multi-repository source unavailability is modeled truthfully and fail-closed;
- omitted/unproven snapshot-match/currentness fields cannot confer eligibility through an authority boundary;
- stale replay/dossier/manifest/selection/cache artifacts are mechanically rejected after every relevant authority transition;
- unrelated current candidates are not invalidated by another source repository disappearing;
- bounded deterministic privacy-safe behavior remains intact;
- the full validation ladder passes or any external-only blocker is accurately classified without weakening local gates;
- continuity/project truth files are coherent and terminal;
- all intended commits are pushed to `origin/main`, remote/local heads match, and the worktree is clean;
- this execution prompt is marked COMPLETE only at that point.

Do not stop merely because the first suspected seam is safe. If one hypothesis is disproved, continue through the remaining audit/reproduction matrix. The purpose of this long campaign is to leave Nightwatch with a mechanically demonstrated authority lifecycle, not a single opportunistic patch.

## 14. Executor final response

Return a concise but complete engineering handoff containing:

- campaign result;
- initial/final HEAD;
- commits;
- root causes fixed and major hypotheses disproved;
- changed subsystems;
- exact test/gate counts and results;
- fresh source census/currentness result;
- safety/privacy status;
- hosted CI status;
- external blockers/deferrals;
- confirmation that `HEAD == origin/main` and the worktree is clean.

Then stop. Do not self-select another campaign; a fresh `next-campaign` audit is required after this one.