# Planner Deep Audit — Campaign Handoff + Project Truth Hardening

## Audit basis

Planning baseline: main at 7165beeda3006ce1f64e61e7ae62fa919441fe96.

The live recursive Git tree is non-truncated and contains 1,354 tracked blobs totaling 14,852,327 bytes before this planning checkpoint. Top-level distribution includes 444 files under .agent/, 412 under src/, 237 under tests/, 112 under corpus/, 51 under bin/, 30 under docs/, 20 under openspec/, 14 under ui/, and the remaining root/config/workflow/scenario files. By extension, the repository is dominated by 699 TypeScript files, 506 Markdown files, 73 JSON files, and 52 MJS files.

The GitHub connector can enumerate the complete tree and inspect targeted file bodies/history, but it cannot truthfully render every byte of all 1,354 files into one bounded planner context. This audit therefore makes two explicit claims only:

1. every tracked path was inventoried structurally at the planning baseline; and
2. current authority-bearing systems, recent implementation history, durable state, gates, representative tests, and the fresh defect seams below were deep-read.

The executor H0 gate requires a literal local NUL-safe git ls-files content sweep after pulling this planning commit. It must record reviewed-count == tracked-count before implementation. That closes the gap between complete tree inventory and complete local byte-level review without pretending the connector performed work it cannot perform.

## Current repository truth

Nightwatch is a private local autonomous bug-hunting and evidence-triage framework with strict read-only-by-default, fail-closed safety semantics.

Current durable state is mature:

- Phase 8 canonical-promotion research is terminal; both safe variants are adopted, the synthetic portfolio is EXHAUSTED, and no standing promotion authority exists.
- Source-analysis runtime hardening is complete.
- Source-proof soundness/static-discovery hardening is complete; the stricter analyzer removed 40 unsound response proofs and left 3 Phase-24 eligible surfaces.
- Durable-artifact / Control Center truth hardening is complete.
- Resolved-address egress hardening is complete for the owned proxy boundary.
- Known browser-process speculative-DNS / true L6 containment residuals remain explicitly outside current authorization.
- Recent exact-head GitHub Actions failures have repeatedly executed zero job steps because of an external billing/platform condition; workflow churn is not evidence-backed work.
- There are no open issues or pull requests in the repository at planning time.

Current source intelligence after soundness hardening remains approximately:

- 128 operations
- 127 route proofs
- 43 response/semantic-contract surfaces
- 118 proven / 10 rejected handler joins
- 47 mutation-capable operations
- 5 proven read-only operations
- 3 Phase-24 eligible / 125 excluded
- 0 currentness failures in the terminal campaign census

Those counts do not justify another speculative source-authority expansion.

## Architecture and risk surface reviewed

The planner reviewed current layout, recent diffs, package/gate wiring, continuity machinery, project-state machinery, source proof history, proxy hardening history, Control Center closure, self-development closure, and representative test/gate contracts.

High-coupling live areas include:

- src/core/campaign/ — 15 files / about 350 KB; orchestrator.ts about 120 KB
- src/core/semanticCoverage/ — 18 files / about 299 KB
- src/core/source/ — 16 files / about 277 KB
- src/core/triage/ — 24 files / about 293 KB
- src/core/portfolio/ — 13 files / about 174 KB
- src/core/selfDev/ — 17 files / about 162 KB
- src/controlCenter/** — contracts/adapters/authorities/server with recent truth hardening
- src/proxy/** — recently hardened hostname/address/socket authority
- bin/hardening-check.mjs — large repository policy authority
- bin/agent-state.mjs — continuity/Git-role authority
- bin/project-state-check.mjs — project-memory truth authority
- config/quality-gate.v1.json + bin/quality-gate.mjs — executable acceptance authority

Large files are not automatic refactor targets. The next campaign is selected from reproduced truth inconsistencies, not line count.

## P0 finding A — execution prompt is outside continuity validation

At the live baseline:

- .agent/ACTIVE_TASK.md is terminal COMPLETE for nightwatch-variant-b-adoption-and-cli-hardening.
- .agent/EXECUTION_PROMPT.md is also terminal COMPLETE, but for a different, older campaign: nightwatch-resolved-egress-and-containment-truth-hardening-v1.
- .agent/PLANNER_HANDOFF.md tells fresh /goal sessions to read the execution prompt when present.

Yet bin/agent-state.mjs does not read .agent/EXECUTION_PROMPT.md. It validates ACTIVE_TASK, the routed task files, Git anchors, history, and secret-like content, but the planner-to-executor route is not part of the protocol.

bin/hardening-check.mjs likewise has no EXECUTION_PROMPT or PLANNER_HANDOFF validation. The unified quality gate invokes agent:check / agent:audit, but therefore inherits this blind spot.

The test suite makes the gap explicit: tests/unit/agent-state.test.ts has a test named "planning execution prompt is a documentation-only checkpoint" that writes arbitrary prompt content and proves it remains CHECKPOINT_ADVANCE. That classification is useful for SHA-role semantics, but content/routing integrity is completely unconstrained.

Impact: a stale or unrelated execution prompt can coexist with a green task-continuity state and be consumed by a fresh autonomous executor. This is a direct orchestration correctness defect.

Disposition: mandatory reproduction and repair.

## P0 finding B — planner handoff has no machine state model

.agent/PLANNER_HANDOFF.md requires an execution prompt to contain Status, Planned-From, target branch, one campaign, scope, workstreams, constraints, validation, gates, and Git/reporting requirements.

There is no versioned parser or validator for those requirements. No current check binds:

- prompt campaign ID to an existing OpenSpec change
- prompt status to a known handoff-state vocabulary
- Planned-From to a real ancestor/current planning baseline
- target branch to main
- predecessor task identity/status to the active terminal task
- an ACTIVE execution prompt to the actual ACTIVE_TASK task ID
- terminal prompt state to terminal task state
- a prompt to one and only one OpenSpec route
- the planned transition to exact repository state

Impact: the most important cross-session routing document is prose-governed while task internals are protocol-governed.

Disposition: introduce one narrow, versioned, read-only handoff-integrity protocol. It validates routing/currentness only; it must not become product, task, OpenSpec semantic, or promotion authority.

## P0 finding C — the machine-checked project-state block contains unchecked live-looking fields

docs/CURRENT_STATE.md currently labels a fenced section:

"Project-state v1 (machine-checked truth block)"

The block contains, among other validated values:

- CANONICAL_CATALOG_ENTRY_COUNT: 2
- NEXT_PORTFOLIO_MEMBER: EXHAUSTED
- NEXT_PROMOTION_AUTHORITY: SPENT

It also contains:

- PHASE_15_S1_CORE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN
- PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED

Nightwatch is far beyond that historical Phase-15 transition. bin/project-state-check.mjs does not validate or reject those extra keys. The parser accepts them and the checker simply ignores them.

Impact: a block advertised as machine-checked can contain stale live-looking values that receive no machine check. Humans and agents can reasonably over-trust the label.

Disposition: upgrade/simplify project-state ownership so every field inside the machine-owned block is either validated/derived or rejected. Historical/unowned facts belong outside the machine block.

## P1 finding D — project-state PASS output does not preserve declared promotion-state truth

Current docs declare NEXT_PROMOTION_AUTHORITY: SPENT.

bin/project-state-check.mjs accepts either NONE or SPENT, but on success its JSON output hardcodes:

nextPromotionAuthority: NONE

This may have been intended to express "no standing authority remains," but it is not an exact projection of the declared field and the output key does not communicate normalization.

Impact: a truth checker can return PASS while projecting a different value from the checked source. The distinction between authorization lifecycle state (SPENT) and effective next authority (NONE) is semantically important.

Disposition: make the v2 contract explicit. Either project the checked value exactly, or split lifecycle state from effective authority with unambiguous names and derive both mechanically. Do not silently normalize under one ambiguous key.

## P1 finding E — recent closure history demonstrates SHA-role fragility

Recent history contains a concrete anchor-reconciliation sequence:

- 544e90e... changed substantive project-state checker behavior.
- 74e94d5... was a documentation-only task/ACTIVE_TASK update.
- 2ed41e1... then set "Last validated implementation SHA" to 74e94d5..., making a docs-only commit occupy an implementation role.
- 7165bee... subsequently reconciled the completed-task anchors back to 544e90e....

bin/agent-state.mjs now has useful implementation/documentation role checks, but the surrounding planner/executor/closure workflow still allowed contradictory durable states to land and require cleanup commits.

Disposition: keep existing role classification, add adversarial transition tests around planning checkpoints, activation, substantive implementation, docs-only closure, and terminal handoff. Never make a planning/doc-only commit the implementation baseline.

## P1 finding F — project-state v1 is phase-specific while presented as current global truth

The checker is explicitly Phase-8B.1-R1.1 code. It hardcodes Phase-8 status, R1 task path, catalog semantics, and portfolio projection, while docs/CURRENT_STATE.md now spans many later systems.

This is not wrong by itself: narrow authority is safer than a giant reimplementation. The defect is boundary labeling and extensibility. Extra fields have already accumulated inside the supposedly checked block.

Disposition: project-state v2 should remain deliberately narrow. It should own a strict schema of mechanically derivable current facts and reject unknown fields. It must not attempt to parse all CURRENT_STATE prose or become a second roadmap/task authority.

## Confirmed strong boundaries retained

The audit found no reason to reopen these recently hardened areas:

- proxy hostname/address/socket authority
- source lexical and PHP path-completeness fixes
- exact source currentness and cache identity
- Phase-24 selection authority
- Control Center read-only loopback boundary
- owner-only finding storage
- Phase-6 cloud/data freeze
- zero external publication
- no standing self-development promotion authority
- CI zero-step external-block classification

No new DEV/NEXT/production, auth, database, cloud, infrastructure, sibling-write, publication, AI-runtime, or canonical-promotion work is authorized.

## Candidate ranking

### P0 — planner→executor handoff protocol and stale-route rejection

Highest value because a stale route can send a fresh autonomous agent into the wrong completed campaign even while task continuity is green.

### P0 — strict machine-owned project-state v2

Highest adjacent value because the current "machine-checked" block demonstrably contains unchecked stale fields and ambiguous promotion-state projection.

### P1 — SHA-role/transition hardening

Keep the existing implementation/documentation distinction, but prove complete planned→active→implementation→closure transitions and docs-only descendants.

### P1 — quality-gate integration and adversarial fixtures

A new checker is useless if it is optional. The authoritative gate must exercise handoff truth with deterministic local fixtures and fail closed on mismatch.

### Rejected — another source-proof expansion

The last campaign intentionally reduced unsound proof and found no safe new family. No fresh exact family justifies reopening it.

### Rejected — proxy/L6 expansion

Actual browser-process DNS / L6 containment remains a documented residual but requires a separate authorization/design decision around OS/container/network-namespace authority.

### Rejected — self-development promotion work

Portfolio is EXHAUSTED and standing promotion authority is absent. The count-3/future-adoption path is not a current need.

### Rejected — workflow churn for current Actions failures

Recent failures execute zero steps under an external billing/platform block. There is no repository failure to fix from those runs.

### Rejected — giant-file decomposition / lint-only campaign

Potential hygiene work exists, but no reproduced Critical/High defect makes it the next campaign.

## Why this is the next campaign

Nightwatch has hardened many internal proof and runtime boundaries, but its own autonomous development handoff remains less formal than the systems it tests. The live stale execution prompt and partially checked project-state block are reproducible repository-truth defects at the exact current head.

The next campaign should therefore make the planner→executor→task→project-truth chain fail closed before another long autonomous run can be misrouted or over-trust stale machine-state prose.
