# Tasks: Campaign Handoff + Project Truth Hardening

Execution target: approximately 12 productive engineering hours.

The ranges below are a work budget, not permission to idle. Do not stop after the first green patch. If the required implementation finishes early, spend remaining useful time on adversarial transition tests, all-file findings, gate integration, deterministic repeatability, and documentation within scope. Do not invent unsafe features just to consume time.

## H0–H1.5 — takeover, literal every-file audit, baseline

- [ ] Pull/reconcile exact main and verify no unexpected remote advance before editing.
- [ ] Read AGENTS.md, .agent/README.md, .agent/PLANS.md, .agent/PLANNER_HANDOFF.md, .agent/EXECUTION_PROMPT.md, .agent/ACTIVE_TASK.md, current durable docs, and every file in this OpenSpec.
- [ ] Create fresh continuity-v2 task .agent/tasks/nightwatch-campaign-handoff-and-project-truth-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md.
- [ ] Route .agent/ACTIVE_TASK.md to the fresh task only when activation invariants are understood; preserve the predecessor as history.
- [ ] Generate a NUL-safe git ls-files manifest from the pulled planning head.
- [ ] Read/hash/account for every tracked file. reviewed-count MUST equal tracked-count; discover the live count rather than trusting the planner's pre-commit count.
- [ ] Classify every path by live runtime authority, test, gate/tooling, config, UI, corpus/fixture, generated/lock, durable docs/history, or agent-continuity role.
- [ ] Deep-read every current code/gate/config file. Historical/generated/fixture files still require role/coupling review.
- [ ] Search TODO/FIXME/HACK/XXX/DEPRECATED, skipped/only tests, ts-ignore/expect-error, unsafe eval/shell/process/network capability, stale state tokens, duplicate authority paths, secret/privacy hazards, and inconsistent campaign IDs.
- [ ] Record exact baseline SHA, branch, Node/npm versions, test enumeration, agent:check/audit, project:check, hardening, quality-gate spec/inventory, and gate status.
- [ ] Record safe timing/RSS baselines for agent:check and project:check.

Gate: no implementation source/tooling edits before the all-tracked-file ledger and baseline are in STATE.md.

## H1.5–H3 — reproduce/falsify every planner truth defect

- [ ] Reproduce the live stale-route shape in a synthetic temp repo: ACTIVE_TASK terminal campaign A, EXECUTION_PROMPT terminal unrelated campaign B.
- [ ] Prove current agent:check does not reject that mismatch before the repair.
- [ ] Prove current hardening/unified gate has no independent execution-prompt route validation.
- [ ] Reproduce a READY planning checkpoint and define what should be valid before new task activation.
- [ ] Reproduce docs/CURRENT_STATE v1 accepting an unknown/stale machine-block key.
- [ ] Reproduce or falsify the current SPENT-declaration vs NONE-PASS-output mismatch.
- [ ] Reproduce the docs-only implementation-anchor role hazard using a synthetic commit chain based on the 74e94d5 / 2ed41e1 / 7165bee pattern.
- [ ] Classify each finding REPRODUCED_DEFECT, SAFE_BY_EXISTING_GATE, or FALSE_HYPOTHESIS with executable evidence.

Gate: no protocol design is accepted until all P0 findings have executable dispositions.

## H3–H5 — handoff protocol implementation

- [ ] Add a versioned machine-readable header to the canonical execution prompt.
- [ ] Implement a pure handoff parser/state validator with strict duplicate/unknown/required-field handling for its owned header.
- [ ] Implement a read-only Git/filesystem checker for route existence, tracked regular files, safe campaign ID/path, target branch, planned-from existence/ancestry, and state binding.
- [ ] Define READY_FOR_EXECUTION, IN_PROGRESS, BLOCKED, COMPLETE semantics.
- [ ] Bind READY state to the named terminal predecessor without requiring premature ACTIVE_TASK mutation.
- [ ] Bind IN_PROGRESS/BLOCKED/COMPLETE to the active continuity-v2 task.
- [ ] Bind Campaign ID to exactly one openspec/changes/<id>/ route.
- [ ] Require audit.md, proposal.md, design.md, tasks.md, and at least one specs/*/spec.md.
- [ ] Reject traversal, symlink/nonregular/untracked route components as appropriate.
- [ ] Keep output bounded and categorical; never emit source/task bodies or secrets.
- [ ] Add focused positive and negative tests.

## H5–H6.5 — SHA-role and transition hardening

- [ ] Build the planned→active→substantive→docs-closure→complete transition matrix.
- [ ] Preserve existing CHECKPOINT_ADVANCE behavior for valid planning/documentation descendants.
- [ ] Ensure planning commits do not become LAST_VALIDATED_IMPLEMENTATION_SHA.
- [ ] Ensure docs-only closure commits use LAST_DOCUMENTATION_CHECKPOINT_SHA or equivalent role, not implementation role.
- [ ] Reject source/test/config drift after the validated substantive baseline.
- [ ] Reject non-ancestor/rebased/unrelated planning bases unless a deliberate safe reconciliation rule is specified.
- [ ] Avoid widening APPROVED_CHECKPOINT_PATHS as a substitute for role correctness.
- [ ] Add deterministic Git-history fixtures for every transition.

## H6.5–H8 — project-state v2 truth boundary

- [ ] Introduce a strict successor to nightwatch.project-state.v1, preferably v2.
- [ ] Enumerate the exact owned key schema and reject unknown/duplicate keys in the machine block.
- [ ] Keep only mechanically validated/derived current facts inside the machine block.
- [ ] Move stale/unowned PHASE_15_S1_CORE_CONVERGENCE and PHASE_15_PROGRAM_STATE out of the machine block unless real derivations justify them.
- [ ] Resolve SPENT vs NONE semantics explicitly and make PASS JSON faithful to the selected contract.
- [ ] Preserve canonical catalog validator/renderer and real portfolio selector reuse.
- [ ] Preserve active task continuity dependency without creating a circular or duplicate authority.
- [ ] Add migration/update tests and update current durable block.
- [ ] Add unknown-field, output-truth, stale-field, malformed, and current-state fixtures.

## H8–H9.5 — unified gate + hardening integration

- [ ] Add a package script for handoff checking if a dedicated CLI is introduced.
- [ ] Integrate handoff truth into the authoritative quality gate without duplicate execution.
- [ ] Update config/quality-gate.v1.json / bin/quality-gate.mjs if a dedicated group is cleaner.
- [ ] Update hardening-check to enforce the new checker remains read-only, bounded, local, no-network, no mutation authority.
- [ ] Register all new tests in the appropriate semantic/quality-gate inventory.
- [ ] Prove local, CI-mode, clean-mode, and pre-DEV gate shapes reject handoff mismatch.
- [ ] Ensure old zero-step external Actions behavior is not mistaken for repository failure.

## H9.5–H10.5 — adversarial and systemic review

- [ ] Run the full adversarial matrices from design.md.
- [ ] Add repeated x3 deterministic output checks.
- [ ] Fuzz/bound malformed owned headers and machine-block key/value sizes with deterministic fixtures.
- [ ] Inspect agent-state, project-state, hardening, quality-gate, task templates, planner handoff, goal adapters, and current docs for any second unvalidated route.
- [ ] Inspect whether any CLI/script consumes EXECUTION_PROMPT without going through the new check.
- [ ] Inspect project-state consumers for assumptions about v1 or NONE/SPENT.
- [ ] Review full tracked-file audit findings and fix any in-scope Critical/High continuity/truth defects discovered.
- [ ] Defer unrelated Medium/Low cleanup with evidence instead of expanding scope.

## H10.5–H11.25 — full acceptance

Run/fix all applicable gates, including at minimum:

- [ ] npm run typecheck
- [ ] npm run hardening:check
- [ ] npm run quality-gate:spec
- [ ] npm run gate:inventory
- [ ] focused agent-state / continuity / project-state / quality-gate tests
- [ ] npm run agent:check
- [ ] npm run agent:audit
- [ ] npm run project:check
- [ ] new handoff check directly, if separately exposed
- [ ] npm run campaign:synthetic
- [ ] npm run test:semantic-compat
- [ ] npm run test:owner-provenance
- [ ] npm run gate:local
- [ ] npm run gate:clean
- [ ] git diff --check
- [ ] canonical complete Playwright enumeration and exact skip accounting
- [ ] topology-correct disposable checkout/Node20 acceptance where current gate requires it
- [ ] final timing/RSS comparison for continuity/project truth commands

No test deletion, skip addition, assertion weakening, or snapshot laundering.

## H11.25–H12 — closure, documentation, Git, CI observation

- [ ] Update .agent/README.md and .agent/PLANNER_HANDOFF.md for the handoff protocol.
- [ ] Update AGENTS.md only if a permanent rule changes.
- [ ] Update CURRENT_STATE machine block and durable ROADMAP/DECISIONS/ARCHITECTURE only where facts changed.
- [ ] Change the canonical EXECUTION_PROMPT status through the designed lifecycle and leave it terminally coherent with ACTIVE_TASK.
- [ ] Complete task REPORT with all-file ledger, reproduced defects, root causes, transition matrix, protocol/version changes, validation receipts, performance, remaining risks, and safety statement.
- [ ] Commit substantive implementation separately from docs-only closure where role semantics require it.
- [ ] Never force-push; reconcile a remote advance conservatively.
- [ ] Push final validated head to main and verify local HEAD == origin/main.
- [ ] Observe exact-head GitHub Actions once. Zero executed steps remain external non-evidence.
- [ ] End with final commit SHA and STOP.

## Completion criteria

The campaign is terminal only when:

1. The executor's local reviewed-count equals live tracked-count.
2. Every planner finding has executable disposition.
3. A stale/unrelated execution prompt can no longer pass the authoritative handoff gate.
4. READY planning state is valid without corrupting terminal predecessor task state.
5. IN_PROGRESS/BLOCKED/COMPLETE prompt and ACTIVE_TASK states are coherently bound.
6. Campaign/OpenSpec/Git baseline/branch routing is strict and fail-closed.
7. Docs-only commits cannot occupy the implementation-baseline role.
8. Every machine-block project-state key is validated/derived or rejected.
9. Project-state PASS output is semantically faithful to validated truth.
10. The unified local/clean/CI-capable gate includes the new truth boundary.
11. Full local acceptance is green with no weakened tests.
12. No forbidden product/auth/data/infra/sibling-write/publication/promotion authority was exercised.
