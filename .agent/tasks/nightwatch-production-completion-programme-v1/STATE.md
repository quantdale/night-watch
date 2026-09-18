# Task State

STATE — nightwatch-production-completion-programme-v1

## Identity

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
Last substantive checkpoint SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: G6.10/G6.11 owner-approved single-branch consolidation at
`f3a31ed9` (tree byte-identical to the integrated `b14f9d74` checkpoint,
`3f8a1b3b`): local `main` was fast-forwarded to `b14f9d74`; every session
branch and stale checkpoint ref was ancestry-merged into `main` and deleted;
the live session worktree was released and removed through the session CLI;
the retired isolated clone's stale swarm refs and unreachable WIP commits
were preserved by ancestry; the stale canonical maintenance claim was
re-pointed. Only `main` remains locally and on `origin`. The earlier W1
record: implementation `b1f1aa68`, all 44 boxes of the three sibling audit
changes ticked with evidence, `gate:local` PASS at `5b624a49` (all eleven
groups, receipt `receipt:sha256:0fd9204ef3821e5acf597a1f`) and the full
offline regression 5127 passed / 18 skipped / 0 failed. The `880810ea`
certification remains the pre-wave record (gate receipt
`receipt:sha256:da8efb8334bad9b6e4d79931`, 5085 passed).
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRODUCTION_COMPLETION_PROGRAMME_V1_STATUS: IN_PROGRESS

## Objective

Execute the 21-group production completion programme specified in
`openspec/changes/nightwatch-production-completion-programme-v1/`, closing
every locally closable gap with evidence and recording every owner or
external dependency with its blocking class and next action.

## Current Milestone

Milestone ID: G16.9/G16.10/G16.11 hardening rule-engine decomposition
Milestone status: COMPLETE_LOCAL
What is being attempted: nothing further in this milestone. The rule engine is
decomposed into 11 invariant-family modules plus a mechanically authoritative
registry; behaviour preservation is measured against `9fc763b3`, not asserted;
and the new enumeration failure modes each carry a recorded probe verified to
raise its own error code. G16.12 stays OPEN behind a pre-existing
environment-caused block (see `## Blockers`). Continuation returns to the
remaining owner-gated programme groups (G16.5, G8, G9, G12, G18, G19, G21).
The preceding consolidation remains integrated at `f3a31ed9`.

## Completed Milestones

- **W1 COMPLETE_LOCAL** — truth-surface audit wave: the three sibling changes
  were applied, validated and integrated. The continuity wave binds ACTIVE
  waypoints and the session worktree to live truth; the baseline wave makes
  the archive index a strict 1:1 table and fills all 56 published Purposes;
  the validation wave enforces skip identities, reclassifies the six fixture
  smokes, binds every Playwright config by script or default runner, and
  corrects the programme's own 18→12 spec count. Every active change carries
  a continuity-v2 task record; design-system and observability are parked
  IN_PROGRESS with named owner blockers. Evidence: `gate:local` PASS at
  `6bc70522` (receipt `receipt:sha256:204417295a4935d7857cb6b2`, all eleven
  groups; SEMANTIC_COMPATIBILITY 2120/2107/13/0 with `skipPolicy.declared=13
  undeclared=0`), full regression 5127 passed / 18 skipped / 0 failed, three
  strict OpenSpec validations PASS, and `openspec validate --all` 63/0.
- **G1 COMPLETE_LOCAL** — ledger truth and the spec baseline:
  - 57 changes paired with 149 task directories; 16 divergent ledgers
    reconciled from task truth (119 boxes ticked with cited evidence, 12
    declared out-of-scope strikethroughs, 2 genuinely undone items carried
    verbatim into the programme's `## Carried forward from prior ledgers`).
  - The reconciliation diff was machine-checked: only checkbox state,
    strikethrough annotations and reasons changed; no receipt, SHA, count or
    date was altered.
  - `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS`, `LEDGER_CHANGE_WITHOUT_TASK`,
    `LEDGER_TASK_WITHOUT_CHANGE` and `LEDGER_LEGACY_CHANGE` implemented in
    `bin/lib/openspec-ledger.mjs` and consumed by `bin/agent-state.mjs`
    inside the required `AGENT_CONTINUITY` gate group; negative-probed by
    `tests/unit/productionCompletionOpenWork.test.ts`.
  - 41 historical change specs repaired to strict OpenSpec delta format
    (structural only; prose preserved); all 57 changes validate.
  - 54 terminal changes archived oldest-first; 56 capability specs published
    under `openspec/specs/`; `nightwatch-final-assurance-release-readiness-hardening-v1`
    archived with `--skip-specs` because it is terminal BLOCKED; the
    classification is recorded per change in
    `openspec/changes/archive/ARCHIVE-INDEX.md`. Archiving stopped at the
    first rebuilt-spec validation failure and resumed only after the spec was
    repaired; `--no-validate` was never used.
  - `bin/nightwatch-status.mjs` now derives
    `nightwatch.open-work-report.v1` (campaign, task status, open count net
    of declared entries, blocker and its internal/external class) through
    `src/core/readiness/openWork.ts` and the shared parser.

- **G6 COMPLETE_LOCAL** — workspace and continuity drift
  closure: `WORKSPACE_WORKTREE_METADATA` resolves every claim's task against
  `.agent/tasks/<id>/STATE.md` and raises `CLAIM_TASK_TERMINAL` /
  `CLAIM_TASK_UNKNOWN` as attention with a named owner action and no automatic
  mutation; all 31 legacy v1 records are declared `PERMANENTLY_HISTORICAL`
  append-only and `agent:check` reaches `legacy_warnings=0`; the 17 current
  non-merged branches are classified from the actual diff against
  `origin/main`, citing their unique commits, in the programme `tasks.md`.

- **G6.10/G6.11 COMPLETE_LOCAL** — owner-approved single-branch consolidation
  (2026-09-14): the owner directed that everything be merged into `main` and
  that only `main` remain locally and remotely with nothing lost. Executed:
  local `main` fast-forwarded to `b14f9d74`; 17 session branches (the live
  session branch, already contained, plus 16 with unique commits) and 2 stale
  cline checkpoint refs ancestry-merged (`git merge --no-ff -s ours`,
  tree-neutral); every branch and checkpoint ref deleted; the live session
  worktree released and removed through the session CLI (`contained=true`);
  the retired isolated clone's 36 stale remote-tracking swarm refs and 22
  unreachable WIP commits preserved by a recorded ancestry merge; the stale
  canonical maintenance claim re-pointed to this task. Every retired tip is
  an ancestor of `main` and the tree is byte-identical before and after
  (`3f8a1b3b`). Evidence: programme `tasks.md` G6 addendum 2026-09-14,
  `session:status`/`workspace:check` PASS with `attention=0`.

- **G13 COMPLETE_LOCAL** — release definition and verdict:
  `config/release-certification.v1.json` declares the ordered advance
  conditions each backed by a registered check; `src/core/releaseCertification/index.ts`
  validates the definition (an unbacked condition fails the definition
  itself), evaluates each condition from the output of the check that owns it,
  carries the three lane counts, binds evidence SHAs and reports
  `STALE_EVIDENCE`, excludes the production path as an external track with its
  own status, and renders the verdict only with its counts.
  `bin/project-state-check.mjs` refuses an advance with unmet conditions
  naming each, refuses stale evidence, guards the count-bearing presentation,
  and refuses a documentation-only commit as the implementation anchor. The
  honest live evaluation at checkpoint `88e3c3f` is 4 MET, 5 UNMET, 7
  UNAVAILABLE_CAPABILITY, recorded in `docs/RELEASE-ADVANCE-CONDITIONS.md`.
  G13.8 is a pending owner decision (safe default `OPERATIONALLY_ACCEPTED`);
  G13.10 is partial/blocked as recorded below.

## Work In Progress

G21 local closeout is integrated at `4de61d41`. This wave ticks G5.8, G5.9
and G17.2 from live evidence, records the 2026-09-14 disk re-measurement in
the census ledger and matrix §1, and migrates observe-canary,
observe-preflight, observe-gate and observe-authenticated onto
`defineOperatorCli` (sweep 38 conforming / 27 undeclared). Owner decisions
remain OPEN. `lanes:manual` stays unauthorized. Parked campaigns stay parked.

The owner-approved single-branch consolidation is integrated at `f3a31ed9`
(tree `3f8a1b3b`, identical to `b14f9d74`). All session branches, the live
session worktree, the stale checkpoint refs and the retired isolated clone
are consolidated into `main` with every retired commit an ancestor; the
canonical maintenance claim is re-pointed. See the G6.10/G6.11 milestone
above and the programme `tasks.md` 2026-09-14 addendum.

### G16.9/G16.10/G16.11 hardening rule-engine decomposition

`bin/hardening-check.mjs` held 83 rules, the registry, the probe campaign and
the entry point in 6045 lines. It is now 85 lines of orchestration over
`bin/lib/hardening/`: `kernel.mjs` (accessors, findings, helpers),
`rules/*.mjs` (83 rules in 11 invariant-family modules), `registry.mjs` (the
enumeration authority) and `probe-campaign.mjs`.

Decisions taken here, with their reasons:

- ONE MODULE PER DECLARED FAMILY WAS REJECTED. The 83 rules carry 61 distinct
  `family` values; a file each would have fragmented the engine past reading.
  The rule-level `family` metadata is untouched and still what `--list-rules`
  reports — the modules group those families by domain.
- THE GRAPH IS ACYCLIC BY CONSTRUCTION. `registry.mjs` imports every family
  module and no family module imports it. `checkRuleEngineSoundness` needs the
  registry to check it, so it RECEIVES it: `injectRegistry` marks that one
  entry and `implementation` keeps the raw module export addressable, so the
  identity check stays exact for every rule including that one.
- THE ENGINE SELF-EXCLUSION HAD TO WIDEN, AND THAT IS THE ONLY SUBJECT CHANGE.
  A rule that scans `src/` and `bin/` for a forbidden literal necessarily
  CONTAINS that literal, so eight rules each excluded `bin/hardening-check.mjs`
  by name. The bodies now live beside the kernel, so the exclusion has to name
  the engine rather than one of its files. `isRuleEngineSource()` is the single
  owner, and `RULE_ENGINE_OPEN_CODED_SELF_EXCLUSION` fails a path literal so
  the exclusion cannot go stale the next time the engine gains a module.

Behaviour preservation was MEASURED against `9fc763b3`, not asserted:
`--list-rules` byte-identical, plain run byte-identical, documentation-currency
report byte-identical, exit codes identical; 104 of 113 moved declarations
byte-identical with the 9 differences individually accounted for; reachability
1142 -> 1155 files and 6607 -> 6655 edges, which is exactly the 13 new modules,
findings=0 both. Base and decomposed `gate:local` receipts match in group
status, counts and failed locations under the same `gateDefinitionDigest`.

Probe campaign: 83 rules, 90 probes, 90 detected, 0 undetected,
`statusUnchanged=true`. HC-073/HC-074 were retargeted to where the code now
lives; HC-085..HC-089 are new and each was verified to raise its OWN error code
rather than merely a non-zero exit. A `create` op was added to the probe
vocabulary because a guard whose subject is a file's EXISTENCE cannot be
expressed as a byte edit; it refuses an existing target and restores by
deletion.

Repaired en route: probe HC-059 was anchored to the literal calendar date in
the `CURRENT_STATE` header, so it went stale the moment the document was
updated, and the campaign had been failing at head (84/85) unnoticed because
NO gate lane runs `hardening:rules`. It now anchors to the century. The
unwired campaign is recorded under `## Deferred / Follow-Up`.

### Delegated closure addendum (G21 owner items, G14.1–14.5, 14.9–14.11)

G21's remaining owner-held items are locally closed: the three documentation
surfaces state the capture sidecar fields and no-secret redaction rule, the
pre-flight before any browser/subprocess/socket/file, the six lifecycle states
with the single re-capture remedy, that `UNKNOWN_AGE` refuses, that no
automated renewal exists or is planned, and that no renewal cadence is claimed
as of the 2026-09-12 measurement because the owner-local store has an artefact
but no lifecycle record. `checkAuthenticatedCapabilitySingleEvaluator` is
implemented and probe HC-078 detects a second expiry evaluator while a
`expires:` write does not match.

G14.1–14.5 and 14.9–14.11 are locally closed: `buildReferenceGraph`,
`checkSourceReachability` and `checkModuleBarrierEnforcement` run against
`config/reference-graph.v1.json`; measured `--report-reachability` is
files=1072, edges=6238, findings=0; the retention list is probed in both
directions (HC-079/HC-080); `src/core/provenance/index.ts` is enforced
(HC-081); and nine zero-importer barrels are removed with deletions declared
under `## Declared Deletions` in `SPEC.md`. `selfDevSandbox/index.ts` is
removed rather than enforced because its test-only base override must not be
re-exported; `checkPhase8BSandboxBoundary` and `checkPhase8B01CloseoutIntegrity`
were updated accordingly and `checkC105ProvenanceAuthorityBoundary` no longer
reads the removed `prodProvenance/index.ts`. G14.12 is partial (rules and
probes registered; integration/release remain owner actions). G14.6–14.8 stay
OPEN: `src/core/dtoFramework/` and `src/core/adversarialCorpus/` are retained
with reason `G14.6 owner decision OPEN` and neither adoption nor removal is
claimed.

The `checkBinExecutionCoverage` probe HC-021 was repaired to mutate both
coverage sites (`all:true`) after concurrent group-21 test work made the
single-site mutation insufficient. Concurrent writers remained active in this
worktree throughout; one probe-campaign run raced a `.gitignore` write, and a
clean rerun passed 81/81.

## Exact Next Action

The G16.9/16.10/16.11 decomposition is integrated. G16.12 stays OPEN behind
the pre-existing sibling-source drift recorded under `## Blockers`; it is an
owner re-admission action, not agent-closable, and the gate must not be
weakened to clear it. Next agent-closable work: G16.5 (rule quantifier audit),
and the remaining G8.11, G18.13 and G19.14 items. Owner decisions stay OPEN
unless explicitly granted.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `bin/agent-state.mjs` | ledger agreement diagnostics inside AGENT_CONTINUITY | MODIFIED |
| `bin/lib/openspec-ledger.mjs` | shared ledger parser, open-work collection, agreement check | ADDED |
| `bin/lib/openspec-ledger.d.mts` | type declaration for the shared parser | ADDED |
| `bin/nightwatch-status.mjs` | derives the open-work report | MODIFIED |
| `src/core/readiness/openWork.ts` | pure open-work report model and renderers | ADDED |
| `tests/unit/productionCompletionOpenWork.test.ts` | parser/agreement/report probes | ADDED |
| `openspec/changes/*/tasks.md` | reconciled 16 divergent ledgers | MODIFIED |
| `openspec/changes/*/specs/**/spec.md` | strict-format repair (41 changes) | MODIFIED |
| `openspec/changes/archive/**` | 54 archived terminal changes and index | ADDED |
| `openspec/specs/**` | first published capability baseline (56 capabilities) | ADDED |
| `.agent/tasks/.../SPEC.md` | declared the archived tracked-file moves | MODIFIED |
| `.agent/tasks/.../STATE.md`, `REPORT.md`, `PLAN.md` | continuity and evidence | MODIFIED |
| `config/validation-universe.v1.json` | register the new bin/lib and test; digest refresh | MODIFIED |
| `docs/CURRENT_STATE.md` | live-state v2 block bound to this campaign | MODIFIED |
| `bin/workspace-integrity.mjs` | G6.1–G6.3 claim-task liveness resolution, attention findings, owner actions | MODIFIED |
| `bin/agent-continuity-protocol.mjs`, `.d.mts` | G6.7 legacy disposition parser | MODIFIED |
| `bin/agent-state.mjs` | G6.7–G6.8 legacy disposition accounting, claim warnings, legacy_warnings attribution | MODIFIED |
| `.agent/tasks/*/STATE.md` (31 legacy records) | append-only `LEGACY_V1_DISPOSITION: PERMANENTLY_HISTORICAL` declarations | MODIFIED |
| `tests/unit/workspaceIsolation.test.ts` | F-07 claim-task probes and fixture task STATE records | MODIFIED |
| `tests/unit/agent-state.test.ts` | legacy-disposition warning-count probes | MODIFIED |
| `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md` | G6 checkboxes and the branch-classification record | MODIFIED |

### G13 files

| Path | Reason | Status |
|---|---|---|
| `src/core/releaseCertification/index.ts` | ordered advance conditions registry, definition validation, pure verdict evaluation, evidence staleness, render guard | ADDED |
| `config/release-certification.v1.json` | the certification record: 16 ordered conditions with evidence bindings, advance statuses, pending-owner next status, external track, presentation surfaces | ADDED |
| `bin/project-state-check.mjs` | gathers each condition's check output, evaluates the certification, refuses an advance with unmet conditions, refuses stale evidence and a documentation-only implementation anchor, guards count-bearing surfaces, emits the verdict in the receipt | MODIFIED |
| `docs/RELEASE-ADVANCE-CONDITIONS.md` | the verdict surface and honest evaluation record (13.5, 13.9) | ADDED |
| `config/document-role.v1.json` | declares the new surface `CURRENT_TRUTH` with a length bound | MODIFIED |
| `tests/unit/projectState.test.ts` | F-12 pure probes and six project:check fixture probes (R1–R6); fixture copies the certification record and module and the agent-state module closure | MODIFIED |
| `bin/lib/typescript-runtime-loader.d.mts` | regenerated loader declaration for the new literal loader call sites (G15 contract) | MODIFIED |
| `.agent/tasks/.../PLAN.md`, `STATE.md` | G13 status and evidence | MODIFIED |

### G21 owner items and G14 files

| Path | Reason | Status |
|---|---|---|
| `README.md` | authenticated capability, sidecar, pre-flight, no-renewal and measured-cadence documentation | MODIFIED |
| `docs/SAFETY_MODEL.md` | appended F-21 lifecycle safety boundary (append-only archive) | MODIFIED |
| `docs/HOST-CAPABILITY-MATRIX.md` | authenticated storage-state host capability row with acquisition condition | MODIFIED |
| `bin/hardening-check.mjs` | `checkAuthenticatedCapabilitySingleEvaluator`, the reference graph, `checkSourceReachability`, `checkModuleBarrierEnforcement`, `--report-reachability`, worktree-aware `gitFiles` | MODIFIED |
| `config/hardening-rule-probes.v1.json` | probes HC-078–HC-081; repaired HC-021 | MODIFIED |
| `config/reference-graph.v1.json` | reasoned-retention list and enforced module barrier | ADDED |
| `src/core/selfDevPromotion/{verify,prepare,currentness,apply,approve}.ts` | import the enforced provenance barrel | MODIFIED |
| `tests/unit/selfDevProvenance.test.ts` | import the enforced provenance barrel | MODIFIED |
| `bin/selfdev-{provenance,synthetic,verify,adopt-sandbox,promote-canonical}.mjs` | load through the provenance barrel; adopt-sandbox loads the sandbox planner/storage/executor modules | MODIFIED |
| `bin/lib/typescript-runtime-loader.d.mts` | regenerated loader type map | MODIFIED |
| `src/core/selfDev/provenanceManifest.ts` | removed the deleted sandbox index from the authoritative set | MODIFIED |
| `src/controlCenter/index.ts`, `src/core/{campaignIntelligence,investigationMemory,localInvestigation,ownerLocalReproduction,prodProvenance,reproductionSurface,selfDevSandbox,systemAtlas}/index.ts` | nine zero-importer barrels resolved REMOVED (declared deletions) | DELETED |
| `.agent/tasks/.../SPEC.md` | declared the nine deletions | MODIFIED |
| `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md` | G14 evidence and open owner decision | MODIFIED |

### W1 files (truth-surface audit wave)

| Path | Reason | Status |
|---|---|---|
| `bin/agent-continuity-protocol.mjs` (+ `.d.mts`) | milestone drift, stale next action | MODIFIED |
| `bin/agent-state.mjs` (+ `.d.mts`) | live worktree resolution, archive/purpose checks | MODIFIED |
| `bin/workspace-integrity.mjs` | `listWorktreeBranches` shared helper | MODIFIED |
| `bin/lib/openspec-ledger.mjs` | active change without task is an error | MODIFIED |
| `bin/lib/openspec-archive-index.mjs` (+ `.d.mts`) | strict index parser and Purpose rule | ADDED |
| `bin/lib/validation-classification.mjs` (+ `.d.mts`) | four classification-truth rules | ADDED |
| `bin/lib/semantic-skip-policy.mjs` (+ `.d.mts`) | skip-identity policy evaluator | ADDED |
| `bin/hardening-check.mjs` | classification rules at the universe call site | MODIFIED |
| `bin/semantic-compat.mjs` | JSON skip report + policy enforcement | MODIFIED |
| `bin/lib/validation-universe.mjs` | `LOCAL_FIXTURE_SMOKE` class vocabulary | MODIFIED |
| `config/{validation-universe,validation-lane-state,semantic-compatibility}.v1.json` | reclassification, script fixes, skip allowlist, digest | MODIFIED |
| `config/reference-graph.v1.json` | (unchanged; retention consulted by the bind rule) | UNCHANGED |
| `package.json` | `auth:capture-synthetic` bind | MODIFIED |
| `tests/fixtures/*-race-child.mjs` | shared TypeScript loader | MODIFIED |
| `tests/unit/{continuityLiveWaypoint,openspecArchiveIndex,validationClassification,semanticSkipIdentity}.test.ts` | W1 probes | ADDED |
| `tests/unit/{agent-state,plannerHandoff,projectState,activeTaskRoutingBinding,productionCompletionOpenWork}.test.ts` | stricter-contract fixtures | MODIFIED |
| `openspec/changes/archive/ARCHIVE-INDEX.md` | garbage row removed | MODIFIED |
| `openspec/specs/*/spec.md` | 56 Purpose fills only | MODIFIED |
| `openspec/changes/nightwatch-production-completion-programme-v1/specs/{validation-lane-closure,authenticated-capability-lifecycle}/spec.md`, `proposal.md` | 18→12 supersession | MODIFIED |
| `.agent/tasks/*` | W1 continuity records and closures | MODIFIED |

### G21 local closeout files

| Path | Reason | Status |
|---|---|---|
| `src/auth/capabilityLifecycle.ts` | G21.8: exempt two non-consumer MANUAL_OWNER files; blocked lanes name the ten authenticated consumers | MODIFIED |
| `tests/manual/auth-capture.synthetic.ts` | G21.8 write-path: assert lifecycle sidecar and VALID local preflight of the written artefact | MODIFIED |
| `tests/manual/phase2a-canary.ts` | G21.8: unauthenticated exemption; refuses inherited storage state | MODIFIED |
| `tests/unit/authCaptureLauncher.test.ts` | G21.8 12/10/2 wiring-or-exemption probe | MODIFIED |
| `README.md`, `docs/HOST-CAPABILITY-MATRIX.md` | G21.12/21.13 dependents list: fixture smokes, synthetic capture, canary are not authenticated lanes | MODIFIED |
| `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md` | 6.6, 8.9, 21.5, 21.8, 21.12–21.14 ticked with evidence | MODIFIED |
| `.agent/ACTIVE_TASK.md`, `STATE.md`, `PLAN.md`, `EXECUTION_PROMPT.md` | session routing and closeout waypoint | MODIFIED |

### G6.10/G6.11 consolidation files (2026-09-14)

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | canonical-only routing (`SESSION WORKTREE: NONE`, `WAVE: G6_BRANCH_CONSOLIDATION`) and the consolidation waypoint | MODIFIED |
| `.agent/tasks/nightwatch-production-completion-programme-v1/STATE.md` | consolidation milestone, `Branch: main`, checkpoint and validation ledger | MODIFIED |
| `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md` | 6.4/6.10/6.11 ticked with evidence plus the 2026-09-14 addendum | MODIFIED |

## Validation Ledger

Command: `npm run gate:local` at consolidation documentation checkpoint
`264ed74b`
Result: PASS (all eleven required groups)
When: 2026-09-14
Relevant failure/output summary: receipt
`receipt:sha256:b68ef740dad5bb6594d0fdea`; SEMANTIC_COMPATIBILITY 2120 / 2107
passed / 13 skipped / 0 failed; SYNTHETIC_CAMPAIGN 1880 / 1880 with
`deepContainmentLane: PROVEN`; OWNER_PROVENANCE 91; STATIC, HARDENING,
HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY, PATCH_INTEGRITY and
WORKSPACE_INTEGRITY PASS. Tree `3f8a1b3b`, byte-identical to the integrated
`b14f9d74` checkpoint.

Command: `npm run session:check`, `npm run workspace:check`,
`npm run agent:check`, `npm run project:check`, `npm run handoff:check`,
`openspec validate --all` at consolidation documentation checkpoint `264ed74b`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: workspace verdict PASS with `attention=0`
and no `CLAIM_TASK_TERMINAL`; agent:check `strict_errors=0
legacy_warnings=0` with the 35 pre-existing ledger warnings; project:check
PASS; handoff PASS; OpenSpec 63/63. Integration verified:
`git push origin main` advanced `b14f9d74..264ed74b`,
`HEAD == origin/main`, and `git ls-remote --heads origin` reports only
`refs/heads/main`. The canonical maintenance claim was released after
integration.

Command: focused G4/G5/G17 suites in session `nightwatch-production-completion-262d9dad`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: operatorCliContract + observeAuthenticatedRunner + target-preflight + phase9b/10b + nw14 matrix 95 passed; operator-cli-sweep discovered=65 conforming=38 undeclared=27; schema:check PASS discovered=388; typecheck PASS; hardening:check PASS; agent:check strict_errors=0; ledger open 70 → 67.

Command: `npx playwright test tests/unit/authCaptureLauncher.test.ts --workers=1` in session `nightwatch-production-completion-262d9dad`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: 10 passed, including G21.8 12/10/2 MANUAL_OWNER wiring-or-exemption probe.

Command: `npm run typecheck`, `node bin/hardening-check.mjs`, `npm run agent:check`, `npm run workspace:check`, `npm run session:status`, `npm run handoff:check`, `npx playwright test tests/unit/nw14HostCapabilityMatrix.test.ts tests/unit/activeTaskRoutingBinding.test.ts --workers=1` in session `nightwatch-production-completion-262d9dad`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: hardening PASS; agent:check `strict_errors=0` with expected STALE_IMPLEMENTATION_BASELINE warning on uncommitted G21 files; workspace/session attention=0; handoff PASS; 25 matrix/routing tests passed. Programme ledger open count 77 → 70.

Command: `npm run gate:local` at implementation `5b624a49`
Result: PASS (all eleven required groups)
When: 2026-09-14
Relevant failure/output summary: final W1 checkpoint receipt
`receipt:sha256:0fd9204ef3821e5acf597a1f`; SEMANTIC_COMPATIBILITY and
SYNTHETIC_CAMPAIGN green with `skipPolicy` declared=13 undeclared=0.

Command: `npm test` at implementation `5b624a49`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: full offline regression 5127 passed / 18
skipped / 0 failed (5145 enumerated).

Command: `npm run gate:local` at implementation `6bc70522`
Result: PASS (all eleven required groups)
When: 2026-09-14
Relevant failure/output summary: W1 checkpoint receipt
`receipt:sha256:204417295a4935d7857cb6b2`; SEMANTIC_COMPATIBILITY 2120 /
2107 passed / 13 skipped / 0 failed with `skipPolicy.declared=13
undeclared=0`; SYNTHETIC_CAMPAIGN 1880 / 1880 with `deepContainmentLane:
PROVEN`; OWNER_PROVENANCE 91.

Command: `npm test` at implementation `6bc70522`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: full offline regression 5127 passed / 18
skipped / 0 failed (5145 enumerated) after the W1 changes.

Command: `openspec validate --all` at implementation `6bc70522`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: 63 items passed / 0 failed; the three W1
changes validate strictly and `openspec/specs/` holds 56 published
capabilities.

Command: `npm run agent:check`, `npm run typecheck`, `node
bin/hardening-check.mjs`, `npm run validation:universe`,
`npm run project:check`, `npm run handoff:check`, `npm run workspace:check`
at implementation `6bc70522`
Result: PASS
When: 2026-09-14
Relevant failure/output summary: `strict_errors=0`, no unclassified
validation-universe file, handoff and project truth bound to the active
programme task, and the workspace reports
`mayIntegrate=true:FAST_FORWARD_AVAILABLE` with zero attention findings.

Command: `npm run gate:local` at implementation `880810ea`
Result: PASS (all eleven required groups)
When: 2026-09-12
Relevant failure/output summary: receipt
`receipt:sha256:da8efb8334bad9b6e4d79931`; SEMANTIC_COMPATIBILITY and
SYNTHETIC_CAMPAIGN green; the group 3 topology gate, group 9 dependency
currency and group 19 configuration contract are included.

Command: `npm test` at implementation `880810ea`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: full offline regression 5085 passed / 18
skipped / 0 failed.

Command: `npm run gate:local` at implementation `98315e24`
Result: PASS (all eleven required groups)
When: 2026-09-12
Relevant failure/output summary: receipt
`receipt:sha256:5919f65e36e7dd1a4def75d4`; SEMANTIC_COMPATIBILITY 2105
passed / 13 skipped / 0 failed; SYNTHETIC_CAMPAIGN 1820 passed / 0 failed
with `deepContainmentLane: PROVEN`; OWNER_PROVENANCE 91.

Command: `npm test` at implementation `98315e24`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: full offline regression 5024 passed / 18
skipped / 0 failed.

Command: `node bin/agent-state.mjs --root .`
Result: PASS for every ledger/task/workspace check except the external
canonical-dirty error
When: 2026-09-12
Relevant failure/output summary: `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS: 0`;
`LEDGER_CHANGE_WITHOUT_TASK` only names the task-less master-plan change;
`LEDGER_TASK_WITHOUT_CHANGE` names historical v2/legacy tasks;
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE` is the concurrent artifact.

Command: `npx playwright test tests/unit/productionCompletionOpenWork.test.ts --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 11 passed, including the terminal/open
negative probe, declared-strikethrough acceptance, orphan naming, legacy
non-inference, blocker classification, deterministic derivation, and the
live `status:local` report.

Command: `npm run typecheck`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: no diagnostics.

Command: `node bin/hardening-check.mjs`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: offline structural invariants hold.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: discovered=434, unclassified=0,
digest refreshed after registering `bin/lib/openspec-ledger.mjs`
(BIN_SYNTAX) and the new suite (FULL_REGRESSION).

Command: `openspec validate --all`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 59 passed / 0 failed; `openspec list
--specs` returns 56 capabilities.

Command: `npm run project:check`
Result: FAIL (external cascade)
When: 2026-09-12
Relevant failure/output summary: `PROJECT_STATE_CHECKOUT_DIRTY` (uncommitted
G6 work) and `PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`, the latter caused
by `agent:check`'s canonical-dirty workspace error.

Command: `npx playwright test tests/unit/workspaceIsolation.test.ts --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 54 passed, including the five F-07
claim-task probes (live IN_PROGRESS pass, COMPLETE and BLOCKED attention,
unknown task, canonical maintenance owner action, text rendering).

Command: `npx playwright test tests/unit/agent-state.test.ts --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 121 passed, including the three
legacy-disposition probes (declared excluded, undeclared raises to one,
reasonless declaration does not suppress).

Command: `npm run agent:check`
Result: FAIL (external cascade only)
When: 2026-09-12
Relevant failure/output summary: `tasks=149 strict_v2=118 legacy_v1=31
legacy_declared=31 legacy_undeclared=0 strict_errors=0 legacy_warnings=0`;
both `CLAIM_TASK_TERMINAL` findings are surfaced as warnings; the only error
remains the pre-existing `WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`.

Command: `npm run hardening:check`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: offline structural invariants hold after the
workspace/continuity changes.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: digest unchanged
(`sha256:e04d813efa7aa0bbbb1fa219`); discovered=447, unclassified=0.

Command: `npm run typecheck`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: no diagnostics.

Command: `npm run workspace:check` and `npm run session:status`
Result: FAIL (expected external)
When: 2026-09-12
Relevant failure/output summary: `WORKSPACE_WORKTREE_METADATA=ATTENTION`,
`attention=2` with both `CLAIM_TASK_TERMINAL` findings and their owner actions
rendered; the only error is the external
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`.

### G13 validation

Command: `npx playwright test tests/unit/projectState.test.ts --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 81 passed, including the F-12 pure probes
(ordered/backed definition, unbacked condition, production-track exclusion,
lane counts and pending next status, one-condition advance refusal, stale
evidence refusal, render guard, live surfaces) and the project:check probes
R1–R6 (receipt verdict, advance refusal naming each condition, unbacked
definition, stale evidence, bare surface, documentation-only anchor).

Command: `npm run typecheck`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: no diagnostics.

Command: `node bin/hardening-check.mjs`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: offline structural invariants hold, including
the regenerated loader declaration and the new document role/status checks.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: discovered=447, unclassified=0, digest
unchanged (`sha256:e04d813efa7aa0bbbb1fa219`); no new test file or bin was
added, so no inventory registration or digest move was needed.

Command: `node bin/project-state-check.mjs`
Result: FAIL (external cascade only)
When: 2026-09-12
Relevant failure/output summary: `PROJECT_STATE_CHECKOUT_DIRTY` (G13 work
uncommitted by design) and `PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`
(canonical checkout externally dirty with a concurrent planning artifact);
the release verdict printed with 4/16 conditions MET, 5 UNMET, 7
UNAVAILABLE_CAPABILITY, advance not claimed, certification not refused.

Command: `node bin/bin-typecheck.mjs --write`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: regenerated
`bin/lib/typescript-runtime-loader.d.mts` for the new literal loader call
sites; the subsequent hardening rule passes.

Command: `node bin/hardening-check.mjs` (G21 owner items + G14)
Result: PASS
When: 2026-09-12
Relevant failure/output summary: offline structural invariants hold after the
single-evaluator rule, the reference graph, the barrier rule, the nine
declared barrel deletions and the provenance enforcement.

Command: `npm run hardening:rules` (full probe campaign)
Result: PASS
When: 2026-09-12
Relevant failure/output summary: rules=79 probes=81 detected=81 undetected=0
restored=75 statusUnchanged=true. The first run raced a concurrent
`.gitignore` write; the clean rerun passed. HC-021 was repaired for the
second auth-capture coverage site.

Command: `node bin/hardening-check.mjs --report-reachability`
Result: PASS (reporting)
When: 2026-09-12
Relevant failure/output summary: files=1072 parsed=1072 edges=6238
findings=0 after resolving provenance ENFORCED, nine barrels REMOVED, and the
two owner-pending subsystems retained.

Command: `npm run typecheck` (after concurrent writer settled)
Result: PASS
When: 2026-09-12
Relevant failure/output summary: no diagnostics. An earlier run failed only
on `src/controlCenter/adapters/reviewerAdapter.ts` and
`src/core/campaign/checkpoint.ts`, files not touched by this work and under
active concurrent edit; the errors disappeared without a change from this
session.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: discovered=447, unclassified=0, digest
unchanged (`sha256:e04d813efa7aa0bbbb1fa219`); no discovered file was added,
so `inventoryDigest` was not touched.

Command: `npm run workspace:check`
Result: FAIL (external cascade only)
When: 2026-09-12
Relevant failure/output summary: `WORKSPACE_DECLARED_DELETIONS=PASS` (the
nine declared removals are recognized), `WORKSPACE_INTEGRATION_READINESS=PASS`,
`WORKSPACE_HOOKS_POLICY=PASS`; the only error is the pre-existing external
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE` and the two terminal-task
claim attention findings.

Command: `npx playwright test storageState authCaptureLauncher authCaptureStages nw14HostCapabilityMatrix documentLifecycle --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 58 passed (G21 documentation and storage
state).

Command: `npx playwright test cliImplementationContract selfDevProvenance selfDevAdoptionSandbox selfDevAdoptionPlan selfDevCanonicalPromotionFlow selfDevSandboxConfinement projectState nw09ShippedReviewCapability --workers=1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: 191 passed, 1 skipped (G14 graph, provenance
enforcement, sandbox and project state).

## Decisions Made During This Task

Decision: 2026-09-14 — close only the locally evidenced remainder of the owner-gate list; leave owner decisions OPEN.
Reason: the owner declined the decision form; self-authorizing CI, reclaim, branch deletion, egress, mochi access, 9B/10B, yield wave, status naming, dtoFramework, or schema-default policy is forbidden.
Evidence/constraint: SPEC non-goals; live `session:status` attention=0; G8.7 already adopted; G21.8 10/12 consumers wired and 2 named exemptions.
Consequence: 6.6, 8.9, 21.5, 21.8, 21.12–21.14 ticked; ledger open 77 → 70; remaining owner gates stay PENDING_OWNER_DECISION.

Decision: implement all 21 groups serially in one owned session.
Reason: the programme was untracked and unplanned; C-00 forbids canonical
implementation, and each group is validated and integrated as a checkpoint.
Evidence/constraint: the OpenSpec change had no task directory, routing block
or ready handoff.
Consequence: group statuses are milestones G1–G21 of one continuity-v2 task.

Decision: repair historical spec structure rather than archive 41 changes
with `--skip-specs`.
Reason: the archive validator requires strict delta structure; skip-specs
would drop real capability requirements from the first published baseline.
Evidence/constraint: `openspec archive` failed on rebuilt specs with
"missing requirement text" and "must contain SHALL or MUST".
Consequence: 41 specs were structurally repaired (prose preserved), all
validate, and all but the BLOCKED terminal change published their specs.

Decision: carry the two genuinely undone ledger entries rather than strike
them as out of scope.
Reason: fuzz ≥20 cases and the local-model canary conditional were never
done and are not covered by the existing groups.
Evidence/constraint: task STATE records 12/12 fuzz cases and an unaddressed
canary conditional.
Consequence: `CF-1`/`CF-2` live in the programme's `tasks.md`.

## Discoveries

- Archiving a terminal change requires a strict-format spec delta; 41
  historical specs were structurally invalid under OpenSpec 1.6.0.
- `openspec archive` validates the rebuilt capability spec, so an empty
  `#### Scenario:` block fails only at archive time, not at change
  validation.
- The canonical checkout received an untracked concurrent planning artifact
  (`nightwatch-control-center-design-system-v1`) during this session; it is
  another writer's work and blocks all workspace-dependent checks.
- The baseline `legacy_warnings=41` was 31 legacy-record warnings plus 10
  inferred-anchor advisories on v2 records. Only the 31 were legacy warnings;
  the counter now attributes warnings to their record class, so declaring the
  31 records historical makes `legacy_warnings` a live signal (0 now, 1 for
  one new undeclared record).
- Of the 17 current non-merged branches, five are content-superseded (every
  changed path is byte-identical on `origin/main`: reproduction-surface-ce18,
  w7-programme-identity, w8-leakage-proof, w8-memory-proof, w9-current-source)
  and twelve hold content that differs from `main` and must be kept pending
  owner review. `session/nightwatch-repository-hardening--e7b9be89` is now
  merged (`ahead=0`) and is held by a live registered worktree.
- W1: the first enforced semantic-compat cone exposed 73 fixture failures
  caused by the stricter checks (archive index on fixture roots, the
  change↔task error on a READY successor change, copied module closures, and
  an ACTIVE/STATE milestone mismatch). The fixture trees were brought to the
  stricter contract; no check was weakened.
- W1: Playwright's JSON reporter is the reliable skip-identity source when
  directed to a file with `PLAYWRIGHT_JSON_OUTPUT_NAME` while the list
  reporter keeps the human counts on stdout.
- W1: `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS` treats BLOCKED as terminal, so an
  ownerless active change with open boxes is parked IN_PROGRESS with a named
  blocker rather than BLOCKED.

## Blockers

- **G16.12 / sibling source drift (BLOCKING, PRE-EXISTING, NOT CAUSED HERE).**
  The sibling `ripple-api` checkout has advanced past the Phase 5 pinned SHA
  (`27bb007a` -> live `4e3e200d`), so three `SEMANTIC_COMPATIBILITY` tests
  (`oracleExpectationRealSource.test.ts:63`,
  `phase12CoverageInventory.test.ts:344`, `realSourceCanary.test.ts:86`) and
  six `campaign:synthetic` C-0x tests (`c02aOpenApiAdmission.test.ts:377,403`,
  `c02bProtoSurface.test.ts:235`, `c03GrpcTopology.test.ts:372`,
  `c04FrontendGraph.test.ts:196`, `c07DerivedSemantics.test.ts:246`) fail.
  PROVEN at base `9fc763b3` with an unmodified tree before any G16.9 change:
  identical failed locations, identical counts (2120/2104/13/3), identical
  `gateDefinitionDigest`, and a base `gate:local` receipt whose group statuses
  match the decomposed checkpoint exactly. Owner action: re-derive and
  re-admit the affected real-source expectations against the current sibling
  SHA. This is NOT self-authorizable — AGENTS.md Phase 9A.1 requires fresh
  derivation evidence and re-admission, and expectations are never silently
  re-bound to a new SHA. Revisit condition: owner authorizes a re-admission
  pass, or pins the sibling checkout back to `27bb007a`.
- The remaining programme work is owner-gated: G3.11 (CI route), G5.3
  (evidence reclaim), G6.4/G6.5/G6.10 (terminal claim and branch
  dispositions), G9.1 (egress for the advisory query), G10.6/G10.13,
  G11.3, G12.3, G13.8 (status beyond `OPERATIONALLY_ACCEPTED`), G14.6
  (retained subsystems) and G17.4. Each needs a named owner action; none
  is self-authorized. G8.7 is adopted; G8.9 is N/A; G21.8 is locally
  closed; G6.6 is live-verified (`attention=0`).
- G6.4 remains open: the canonical RELEASED maintenance record naming
  `nightwatch-control-center-render-truth-v1` is cleared only by its owner
  through the session CLI. G6.5 remains other-owner: the foreign
  `nightwatch-repository-hardening--e7b9be89` worktree is no longer
  registered on this host and was not released or deleted here.
- G2/F-02 `lanes:manual` for the 12 `MANUAL_OWNER` harnesses is not
  delivered; the W1 validation change corrected the count to 12 without
  implementing the route.

## Safety Events

NONE

## Deferred / Follow-Up

- Owner/organizational decisions named by the programme remain open; each is
  implemented as a record or gate, never self-authorized.
- `nightwatch-production-observability-system-map-master-plan-v1` and
  `nightwatch-control-center-design-system-v1` are parked IN_PROGRESS with
  named owner blockers and continuity-v2 records.
- `nightwatch-autonomous-bug-hunting-programme-v1` remains IN_PROGRESS and
  parked, as recorded by its predecessor campaigns.
- `lanes:manual` (G2/F-02) remains the executable route for the 12
  `MANUAL_OWNER` harnesses under one-shot owner authorization.
- **The rule mutation campaign is wired to no gate.** `hardening:rules` is a
  declared npm script that no gate group, lane, validation-universe class or
  CI workflow selects, so nothing ever runs it. That is exactly why probe
  HC-059 could rot against a changed document and stay invisible: `gate:local`
  runs `hardening:check`, never `--probe-campaign`. Registering it as a gate
  group costs about 37 s and closes the whole dead-probe class, but it adds a
  required group to the authoritative gate definition and therefore belongs in
  its own scoped change with its own receipt, not appended to a decomposition.
  Discovered and proven 2026-09-18 at `9fc763b3`.
- **`nightwatch-session.mjs start --dry-run` mutates.** `--dry-run` is
  documented as "report the planned action without mutating" and is honoured in
  `integrate`, but `start` has no dry-run branch: it created a real worktree,
  branch and ownership record (`nightwatch-production-completion-ca1a8b00`)
  while reporting a plan. The stray registration was removed through the
  session CLI and the topology verified back to its prior shape, but the defect
  is live and it sits in the C-00 tooling the whole campaign depends on. A
  `--dry-run` that mutates can silently consume `maxWorktrees` capacity and
  trip `SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY` for the next real start.
  Discovered 2026-09-18.

## Resume Recipe

1. Read `SPEC.md` and `PLAN.md`.
2. Inspect `git status`, `git log`, and `npm run session:status`; this
   session is `nightwatch-production-completion-262d9dad`. Adopt it if
   stale (`claim --task nightwatch-production-completion-programme-v1 --adopt`).
3. If the G21 local closeout is uncommitted, finish its validation and
   integrate. Then continue agent-closable tails. Owner decisions stay OPEN
   unless the owner states a choice.
4. Never weaken a gate to make a group executable. Never self-authorize
   CI, reclaim, branch deletion, egress, mochi access, 9B/10B, yield wave,
   status naming, dtoFramework, or schema-default policy.

## Completion Snapshot

The task is IN_PROGRESS; W1 is complete and recorded, and the remaining
groups await owner decisions. Nothing in this record claims task completion,
and no live HEAD or CI value is stored here.
