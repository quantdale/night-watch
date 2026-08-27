# EXECUTION PROMPT — Campaign Handoff + Project Truth Hardening

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
OpenSpec: openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/
Planned-From: 7165beeda3006ce1f64e61e7ae62fa919441fe96
Target Branch: main
Predecessor Task ID: nightwatch-variant-b-adoption-and-cli-hardening
Predecessor Status: COMPLETE

## Mission

Pull/reconcile current quantdale/night-watch main and execute the OpenSpec change nightwatch-campaign-handoff-and-project-truth-hardening-v1 end-to-end as one autonomous hardening campaign.

The purpose is to make Nightwatch's own planner→executor→task→project-truth chain as fail-closed as the product/runtime evidence systems it already hardens.

Do not merely rewrite the stale prompt and declare success. The live stale prompt is the reproduction. Build permanent machine checks, state-transition proof, strict project-state ownership, gate integration, and adversarial regressions.

Do not ask for routine confirmation. Resolve implementation details from current repository truth, tests, and this OpenSpec. Stop only for a genuine authorization boundary, an unsafe ambiguity that cannot be conservatively resolved, a remote-divergence conflict that cannot be safely reconciled, or terminal completion.

## Why this campaign exists

At planning baseline 7165beeda3006ce1f64e61e7ae62fa919441fe96:

1. .agent/ACTIVE_TASK.md is COMPLETE for nightwatch-variant-b-adoption-and-cli-hardening.
2. .agent/EXECUTION_PROMPT.md is COMPLETE for the older resolved-egress campaign.
3. bin/agent-state.mjs never reads EXECUTION_PROMPT.
4. bin/hardening-check.mjs has no execution-prompt/planner-handoff integrity check.
5. tests/unit/agent-state.test.ts explicitly proves arbitrary EXECUTION_PROMPT content is a documentation-only CHECKPOINT_ADVANCE.
6. docs/CURRENT_STATE.md's "machine-checked" v1 block contains stale/unvalidated Phase-15 fields.
7. project-state accepts NEXT_PROMOTION_AUTHORITY=SPENT but its PASS JSON currently emits nextPromotionAuthority=NONE.
8. recent closure commits demonstrate implementation-vs-documentation SHA-role confusion: a docs-only commit was temporarily recorded as the validated implementation and later reconciled.

This is a current autonomous-orchestration truth defect, not a request for feature expansion.

## Mandatory takeover

Before any implementation edit:

1. Confirm repository root and remote.
2. Read AGENTS.md.
3. Read .agent/README.md, .agent/PLANS.md, and .agent/PLANNER_HANDOFF.md.
4. Read this file completely.
5. Read .agent/ACTIVE_TASK.md and the terminal predecessor task's SPEC/PLAN/STATE/REPORT.
6. Read docs/CURRENT_STATE.md, docs/SAFETY_MODEL.md, docs/DECISIONS.md, docs/ROADMAP.md, and docs/ARCHITECTURE.md.
7. Read every file under openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/.
8. Fetch/reconcile origin/main without force. Compare takeover HEAD with Planned-From.
9. If main advanced, inspect all intervening commits and revalidate every planner finding before implementation. Do not blindly reset/rebase over remote work.
10. Create a fresh continuity-v2 task:
   .agent/tasks/nightwatch-campaign-handoff-and-project-truth-hardening-v1/
   with SPEC.md, PLAN.md, STATE.md, REPORT.md.
11. Route .agent/ACTIVE_TASK.md to the new task when beginning execution.
12. Transition this prompt to IN_PROGRESS according to the protocol you are about to harden; if the checker does not exist yet, preserve the fields exactly and add the transition as the first protocol fixture.

Do not resume or edit the completed predecessor as though it were active work.

## H0 — literal every-file audit is mandatory

The planner structurally inventoried all 1,354 tracked blobs at the pre-planning baseline, but the connector cannot honestly claim every byte was loaded.

You must close that gap locally.

Use a NUL-safe tracked-file inventory from the pulled planning checkout. The planning commit adds new OpenSpec files, so DISCOVER the live count; do not hardcode 1,354.

Requirements:

- git ls-files -z or an equivalently safe tracked manifest
- account for every tracked path
- read/hash every regular tracked file
- reviewed-count == tracked-count
- no unexplained nonregular path
- classify every path by role
- deep-read every current source/tooling/config/gate file
- historical/generated/fixtures still receive role/coupling review
- record total bytes and, where practical, line count
- store only safe aggregate audit metadata in task state/report; do not dump source bodies

Search at minimum:

- TODO / FIXME / HACK / XXX / DEPRECATED
- test.skip / describe.skip / .only / conditional skip
- ts-ignore / expect-error / eslint-disable
- eval / new Function / shell:true
- write/spawn/network capabilities in checkers
- stale campaign/task IDs
- duplicate or contradictory machine-state fields
- current-looking values inside historical docs
- EXECUTION_PROMPT consumers/bypasses
- OpenSpec route parsers/assumptions
- secret/privacy sentinels
- unsafe path traversal/symlink handling
- hidden duplicate authority or fallback logic

A grep with zero matches is not an all-file audit.

Record baseline:

- exact Git SHA/branch/origin
- Node/npm
- complete Playwright enumeration
- agent:check
- agent:audit
- project:check
- hardening:check
- quality-gate:spec
- gate:inventory
- representative gate:local state if feasible before edits
- cold/warm wall time and peak RSS for agent:check/project:check

No implementation before H0 is recorded.

## Reproduce before repair

### Reproduction A — stale unrelated prompt passes current continuity

Create a temp Git fixture where:

- ACTIVE_TASK = COMPLETE task A
- task A continuity-v2 is valid
- EXECUTION_PROMPT = COMPLETE campaign B
- campaign B differs from A

Run current agent-state and the applicable gate path.

Expected pre-fix finding: current continuity does not reject the unrelated prompt.

Do not fake this by testing only a parser you have already changed.

### Reproduction B — valid planned state

Create the desired positive planning transition:

- predecessor A COMPLETE
- new campaign B OpenSpec tracked
- prompt B READY_FOR_EXECUTION
- Planned-From valid ancestor
- target main
- ACTIVE_TASK still predecessor A

This MUST be a valid state. A planner should not need to mutate ACTIVE_TASK prematurely.

### Reproduction C — OpenSpec route failures

Cover:

- wrong campaign/path
- missing audit/proposal/design/tasks/spec
- untracked path
- traversal
- duplicate route fields
- nonregular/symlink where unsafe
- unsupported protocol version
- malformed/unknown state

### Reproduction D — project-state unchecked field

Use current v1 behavior to prove or falsify that a stale/unknown key inside the machine block passes.

Include the live stale Phase-15 field shape.

### Reproduction E — promotion-state projection truth

Use a SPENT fixture and inspect successful project-state output.

If the checker validates SPENT and emits NONE under the same semantic key, record the defect exactly. If current code has advanced and this no longer reproduces, record FALSE_HYPOTHESIS and preserve the regression that proves it.

### Reproduction F — SHA role chain

Build a synthetic commit chain mirroring:

substantive implementation
→ docs-only closure/update
→ docs-only anchor update

Prove which states current agent-state accepts/rejects and specifically guard against a docs-only commit occupying LAST_VALIDATED_IMPLEMENTATION_SHA.

## Implement one narrow handoff truth protocol

Create a versioned parser/state validator for the owned header in this file.

Required semantics:

READY_FOR_EXECUTION:
- prompt names one campaign
- one matching tracked OpenSpec exists
- Planned-From is a real ancestor
- Target Branch main
- ACTIVE_TASK is the named terminal predecessor
- no implementation authority is implied

IN_PROGRESS:
- ACTIVE_TASK is the new campaign task
- status matches
- continuity-v2 passes
- OpenSpec and Git route remain valid

BLOCKED:
- ACTIVE_TASK is the same campaign and BLOCKED under continuity-v2
- blocker semantics remain owned by continuity-v2

COMPLETE:
- ACTIVE_TASK is the same campaign and terminal COMPLETE
- task continuity/report/plan closure pass
- canonical prompt cannot still route to an unrelated campaign

The prompt checker validates route/state/currentness. It does NOT become milestone, source, product, or promotion authority.

## Implement strict project-state truth ownership

The current project-state v1 block is too permissive for its label.

Create a strict successor, preferably nightwatch.project-state.v2.

Requirements:

- explicit owned key schema
- unknown machine-block keys fail
- duplicate keys fail
- every field inside the machine block is validated or mechanically derived
- historical/unowned phase fields move outside the block
- retain real catalog validator/renderer
- retain real portfolio selector
- retain continuity dependency
- no arbitrary prose parsing

Resolve SPENT/NONE semantics explicitly.

Preferred conceptual model:

- authorization lifecycle can be SPENT
- effective NEXT promotion authority can be NONE

You may use different names, but do not validate SPENT and then silently report NONE under an ambiguous same-name output.

Do not invent a current Phase-15 derivation just to keep stale Phase-15 fields in the machine block.

## Preserve SHA role correctness

Keep existing distinction:

- substantive implementation baseline
- documentation/checkpoint descendants
- live Git HEAD

Strengthen it through transition tests, not a broader allowlist.

A planning commit can advance documentation/current HEAD while the prior substantive implementation baseline remains the validated implementation for the terminal predecessor.

When the new task produces actual source/test/tooling changes, record the new substantive baseline.

When closure docs advance later, keep that baseline and advance only the documentation checkpoint.

Reject:

- docs-only SHA as implementation role
- non-ancestor anchors
- source/test/config drift hidden as checkpoint advance
- COMPLETE state over stale substantive work

## Gate integration

The new handoff truth must be authoritative, not optional.

Choose one clean integration:

A. make agent:check invoke/own the handoff check and let existing AGENT_CONTINUITY gate cover it exactly once; or
B. add a dedicated required HANDOFF_TRUTH group before project/agent truth.

Whichever you choose:

- no duplicate execution
- quality-gate spec and inventory updated
- hardening enforces read-only/no-network/no-write boundaries
- local/ci/clean/predev modes receive correct behavior
- exact diagnostic surfaces are bounded

Do not add a checker that the main gate never runs.

## Adversarial requirements

At minimum execute the complete matrix in OpenSpec design.md.

Add permanent tests for:

- stale completed A vs completed prompt B
- READY B over terminal predecessor A
- IN_PROGRESS/BLOCKED/COMPLETE mismatch
- wrong/missing/untracked OpenSpec
- path traversal
- malformed/duplicate/unknown fields
- unsupported version/status
- wrong branch
- nonexistent/non-ancestor Planned-From
- docs-only planning checkpoint
- docs-only implementation-role misuse
- source drift after validated baseline
- strict project-state unknown key
- stale Phase-15 machine key
- SPENT/NONE truth
- current two-entry catalog / EXHAUSTED portfolio
- deterministic x3 output
- bounded oversized metadata
- secret/sentinel metadata rejection where the owned protocol admits free text

## Systemic in-scope follow-through

After the primary fixes are green, use the remaining work budget to inspect:

- bin/agent-state.mjs
- bin/agent-continuity-protocol.mjs
- bin/project-state-check.mjs
- bin/hardening-check.mjs
- bin/quality-gate*.mjs
- config/quality-gate.v1.json
- tests/unit/agent-state.test.ts
- tests/unit/projectState.test.ts
- all quality-gate tests/inventory
- .agent templates
- .agent/README.md
- .agent/PLANS.md
- .agent/PLANNER_HANDOFF.md
- goal adapters under .agents/.claude/.kimi-code/.opencode
- docs/CURRENT_STATE.md and durable truth docs
- any current CLI that reads EXECUTION_PROMPT or project-state output

Fix in-scope Critical/High truth/continuity defects you reproduce. Record Medium/Low unrelated cleanup as deferred.

Do NOT drift into source proof, product functionality, UI feature work, proxy L6 changes, or promotion research.

## Validation

Run/fix, at minimum:

- npm run typecheck
- npm run hardening:check
- npm run quality-gate:spec
- npm run gate:inventory
- focused agent-state/continuity/project-state/handoff/quality-gate tests
- npm run agent:check
- npm run agent:audit
- npm run project:check
- direct handoff check if exposed
- npm run campaign:synthetic
- npm run test:semantic-compat
- npm run test:owner-provenance
- npm run gate:local
- npm run gate:clean
- git diff --check

Also:

- complete Playwright test enumeration; no unexplained skip changes
- canonical full acceptance when required by the repository gate
- disposable Node20/clean-checkout reproduction
- before/after wall-time/RSS for continuity and project checks
- x3 deterministic focused protocol runs

Never delete tests, add skips, weaken assertions, or bless a stale snapshot.

## 12-hour productive work shape

H0–H1.5:
- takeover
- create/activate continuity task
- literal every-file audit
- baseline receipts

H1.5–H3:
- reproduce all planner findings
- freeze transition semantics from evidence

H3–H5:
- handoff protocol/parser/checker
- OpenSpec/Git route validation

H5–H6.5:
- SHA-role transition matrix
- closure/currentness hardening

H6.5–H8:
- strict project-state v2
- stale field cleanup
- SPENT/NONE semantic repair

H8–H9.5:
- quality-gate/hardening integration
- test inventory

H9.5–H10.5:
- adversarial/fuzz/boundedness/systemic review

H10.5–H11.25:
- full local/clean/Node20 acceptance
- performance and deterministic repeats

H11.25–H12:
- durable docs/report
- terminal prompt/task transition
- commit/push
- exact-head CI observation once

This is a productive budget, not an instruction to idle. If all requirements are genuinely complete early, stop. If in-scope Critical/High defects remain, prioritize correctness and leave truthful INCOMPLETE/BLOCKED state rather than faking completion.

## Safety hard boundaries

Throughout the campaign:

- DEV contacts: 0
- NEXT contacts: 0
- production contacts: 0
- authenticated product/browser contacts: 0
- database/datastore operations: 0
- GCP/GKE/Kubernetes operations: 0
- AWS/IAM/STS operations: 0
- sibling Alphaus writes: 0
- external publication/messages/issues: 0
- self-development canonical promotions: 0
- new promotion authority: 0
- runtime AI authority: 0
- raw private evidence persistence: 0

All tests use synthetic temporary repositories/data only.

## Git / continuity / closure

- work on main per repository policy
- never force-push
- inspect remote divergence before push
- keep task STATE updated at milestone boundaries
- preserve predecessor history
- commit coherent validated checkpoints
- do not label docs-only checkpoints as substantive implementation
- final ACTIVE_TASK and EXECUTION_PROMPT states must agree under the new protocol
- final project-state machine block must pass the strict successor checker
- push final validated head
- fetch/reconcile and verify local HEAD == origin/main
- observe exact-head Actions once
- zero-step Actions remains external non-evidence
- finish with the exact final SHA and STOP
