# Task State

## Identity

Task ID: nightwatch-reviewer-surface-and-intel-scale-v1
Phase: REVIEWER_SURFACE_AND_INTEL_SCALE_V1
Status: IN_PROGRESS
Starting SHA: 868761d2128d5155db454623bc2fa01622a57d33
Last validated implementation SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
Last substantive checkpoint SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
Last documentation checkpoint SHA: 96b100af42e7335ce39e2652265c458e2210522a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-reviewer-surface-and--30ec5809
Last checkpoint: M1 COMPLETE and gate-certified — gate:local PASS 11/11 (receipt:sha256:2a2896e1ce24ebc6106d3a02); next M2 reviewer projection
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 868761d2128d5155db454623bc2fa01622a57d33
LAST_VALIDATED_IMPLEMENTATION_SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
LAST_DOCUMENTATION_CHECKPOINT_SHA: 96b100af42e7335ce39e2652265c458e2210522a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REVIEWER_SURFACE_AND_INTEL_SCALE_V1_STATUS: IN_PROGRESS

## Objective

Repair DEF-FC-04 and harden task/continuity metadata against
cross-campaign drift; implement the deferred Control Center reviewer
experience over the certified FC-1 finding intelligence; measure
finding-intelligence cost at 1k/5k/10k and optimize only where measured;
add large-corpus and endurance coverage; re-certify privacy, mutation,
clean gate, regression and deterministic fresh-process evidence; and
reconcile durable documentation. No production, NEXT, DEV, or live C-12
contact.

## Current Milestone

M3 (W2) — Control Center reviewer UI, complete; M4 (finding-intelligence
scale measurement at 1k/5k/10k) is next.

## Completed Milestones

- M1 (W0): repository truth, DEF-FC-04 repaired, continuity metadata hardened
  against cross-campaign drift. `inspectActiveTaskRouting()` in
  `bin/agent-state.mjs` binds the routing block's `CAMPAIGN` and
  `SESSION WORKTREE` to the active task identity and its `STATE.md` branch,
  and scans every `session/...` occurrence in the document. The rule runs
  inside `npm run agent:check`, which the required `AGENT_CONTINUITY` gate
  group executes, so it is gate-enforced rather than advisory.
  `npx playwright test tests/unit/activeTaskRoutingBinding.test.ts` → 7 passed;
  `tests/unit/agent-state.test.ts` → 118 passed, including four end-to-end
  probes that the rule is INVOKED, not merely defined. That file is in the
  `semantic-compatibility` lane, so those probes run inside the required
  `SEMANTIC_COMPATIBILITY` gate group.
- M2 (W1): reviewer projection. `src/controlCenter/contracts/reviewer.ts`
  (epistemic-class contract), `src/controlCenter/adapters/reviewerAdapter.ts`
  (the projection), `src/controlCenter/authorities/reviewerAuthority.ts`
  (findings snapshot → real cone calls), route `/api/v1/reviewer` through the
  router, collector, server and default collector, and RS-1 hardening.
  `npx playwright test tests/unit/reviewerProjection.test.ts` → 22 passed.
- M3 (W2): the Control Center reviewer view. `ui/control-center/src/types.ts`
  (view definition + reviewer types), `api.ts` (`loadReviewer`), `App.tsx`
  (`ReviewerView`, `EpistemicBadge`, `ReviewerElementCell`). The badge renders
  the server's `epistemicClass` as TEXT, not colour alone, and the UI computes
  no class of its own. `control-center:ui:test` → 14 passed;
  `control-center:ui:browser` → 2 passed against the freshly built bundle.

## Work In Progress

M4. Finding-intelligence scale measurement at 1k / 5k / 10k.

Closed in M1:

M1. Repository truth established:

- HEAD == origin/main == `868761d2128d5155db454623bc2fa01622a57d33`,
  canonical checkout clean, single worktree before session start.
- Predecessor `nightwatch-frontier-completion-reliability-v1` is
  COMPLETE/STOP, validated implementation `8265ace`, as its records claim.
- `npm run agent:check` PASS with 2 known warnings (CHECKPOINT_ADVANCE,
  LEGACY_TASK_NOT_STRICTLY_VALIDATED).
- Owned session worktree `session/nightwatch-reviewer-surface-and--30ec5809`
  created from `868761d` and claimed; fresh `npm ci` exit 0.

DEF-FC-04 proven mechanically, not asserted:

- `git show 48c0a60:.agent/ACTIVE_TASK.md` — the `## Routing and safety`
  block was authored for `nightwatch-plan-explain-coherence-v1`:
  "IMPLEMENTATION AUTHORIZED: one focused coherence test file only", and
  names worktree `session/nightwatch-plan-explain-coherenc-faaf601a`.
- `git show 0c5cb42:.agent/ACTIVE_TASK.md` — FC-1 opened. The identity
  fields were rewritten to FC-1; the routing block is byte-identical to
  48c0a60's.
- `git show 868761d:.agent/ACTIVE_TASK.md` — FC-1 closed with the same
  stale block still in place.
- FC-1's own `.agent/EXECUTION_PROMPT.md` authorized source, tests,
  schemas, contracts, CLI, reviewer surfaces, documentation, commits,
  pushes and clean-clone certification, and FC-1's `STATE.md` records
  branch `session/nightwatch-frontier-completion-r-9e1b3a60`. So an entire
  campaign ran with an active-task routing block that named a retired
  worktree and authorized almost none of what the campaign did.
- `npm run agent:check` returns PASS on that document. Continuity v2
  validates the structured fields and the cross-file status machine; the
  routing block is unstructured prose no rule reads. The routing block is
  what an agent consults to decide what it may write, so this is an
  authority defect, not a cosmetic one.

## Blockers

(none)

## Exact Next Action

Begin M4 (W3): a fresh-process harness that generates deterministic
synthetic corpora at 1,000 / 5,000 / 10,000 findings, runs the real
`findingIntel` entry points, and records CPU time, peak RSS and wall
latency per stage, so the actual quadratic threshold is located rather
than assumed.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | campaign rebind; DEF-FC-04 routing-block repair | Modified |
| `AGENTS.md` | routing-block binding rule documented under continuity v2 | Modified |
| `bin/agent-state.mjs` | `inspectActiveTaskRouting()` + live invocation | Modified |
| `bin/agent-state.d.mts` | declaration for the new export | Modified |
| `tests/unit/activeTaskRoutingBinding.test.ts` | DEF-FC-04 regression, bound to real history | Added |
| `tests/unit/agent-state.test.ts` | fixture routing block + 4 end-to-end invocation probes | Modified |
| `tests/unit/projectState.test.ts` | fixture routing block | Modified |
| `tests/unit/plannerHandoff.test.ts` | fixture routing block | Modified |
| `docs/CURRENT_STATE.md` | live-state rebind and checkpoint anchors | Modified |
| `src/controlCenter/contracts/reviewer.ts` | reviewer contract with epistemic classes | Added |
| `src/controlCenter/adapters/reviewerAdapter.ts` | the projection | Added |
| `src/controlCenter/authorities/reviewerAuthority.ts` | findings snapshot → real cone calls | Added |
| `src/controlCenter/server/{router,collector,server,defaultCollector}.ts` | `/api/v1/reviewer` | Modified |
| `bin/hardening-check.mjs` | RS-1 reviewer-surface rule | Modified |
| `config/semantic-compatibility.v1.json` | both new suites registered in a required lane | Modified |
| `tests/unit/reviewerProjection.test.ts` | M2 regression | Added |
| `ui/control-center/src/{types,api,App}.tsx?` | reviewer view | Modified |
| `ui/control-center/src/App.test.tsx` | reviewer view tests; nav count | Modified |
| `tests/browser/controlCenterBrowser.browser.ts` | reviewer coverage + view totality | Modified |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff | Modified |
| `.agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1/**` | campaign records | Added |
| `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/**` | OpenSpec change | Added |

## Validation Ledger

| Check | Result |
|---|---|
| `git rev-parse HEAD origin/main` | both `868761d`, clean |
| `npm run session:status` (canonical, pre-start) | PASS, single worktree |
| `npm run agent:check` (at `868761d`) | PASS + 2 known warnings — the DEF-FC-04 evidence |
| `npm run handoff:check` (planning artifacts staged) | PASS |
| `npm ci` (session worktree, fresh) | exit 0 |
| `node bin/nightwatch-session.mjs claim` | SESSION_CLAIMED, class OWNED_SESSION |
| `inspectActiveTaskRouting` vs `868761d` + FC-1 `STATE.md` | FOREIGN_WORKTREE_REFERENCE raised on the real drifted document |
| `inspectActiveTaskRouting` vs `48c0a60`, `0c5cb42`, `868761d` | all fail closed (CAMPAIGN_MISSING + SESSION_WORKTREE_MISSING) |
| `npx playwright test tests/unit/activeTaskRoutingBinding.test.ts` | 7 passed |
| `npx playwright test tests/unit/agent-state.test.ts` | 118 passed (114 pre-existing + 4 new invocation probes) |
| `npx playwright test tests/unit/projectState.test.ts` | 64 passed |
| `npx playwright test tests/unit/plannerHandoff.test.ts` | 12 passed |
| `npm run test:semantic-compat` | 2037 / 2024 passed / 13 skipped / 0 failed — PASS (FC-1 baseline 2033/2020/13/0) |
| `npm run gate:local` (committed tree, M1) | PASS 11/11, receipt:sha256:2a2896e1ce24ebc6106d3a02 |
| M1 integrated | origin/main 96b100a; implementation anchor 882138c |
| `npx playwright test tests/unit/reviewerProjection.test.ts` | 22 passed |
| RS-1 hardening branch probes | 6/6 fire (severity drift, authority literal, advisory-guard totality, sentinel screen, UNKNOWN pointer, final verdict authority) |
| `npm run test:semantic-compat` (M2) | 2066 / 2053 passed / 13 skipped / 0 failed — PASS, 148 files |
| `npm run control-center:ui:typecheck` | clean |
| `npm run control-center:ui:test` | 14 passed |
| `npm run control-center:ui:browser` | 2 passed (fresh build, 287,658 bytes, no external references) |
| `npm run typecheck` | clean |
| `npm run hardening:check` | PASS |
| `npm run agent:check` (repaired document) | PASS + 2 known warnings |
| `npm run project:check` | PASS once committed (dirty-tree code only, pre-commit) |

## Decisions Made During This Task

- D-REV-1: `DEF-FC-04` is allocated for the cross-campaign routing-block
  drift. `DEF-FC-01..03` were taken by FC-1 and no `DEF-FC-04` existed in
  the repository before this campaign; the identifier enters durable
  records, so the allocation is recorded rather than assumed.
- D-REV-2: the routing block is made structured (`CAMPAIGN`,
  `SESSION WORKTREE`) rather than left as prose, because a checker cannot
  bind what it cannot parse, and prose is what drifted.

## Discoveries

- The browser lane said "all seven built Control Center views" while nine
  existed: it had kept passing through two view additions because the count
  was in the test NAME, not in an assertion. It is now a totality check over
  the live navigation, and it proved itself immediately by failing on the
  overview `#` href.
- The intelligence cones emit PROSE evidence (`RECURRENT` evidence strings,
  `mechanicalEvidence`, `counterexamples`) written for the human filing
  report. Unbounded free text must not cross onto the public surface, so the
  reviewer projection derives categorical basis codes from the same results
  instead of forwarding the prose. Discovered by five test failures, not by
  reading.
- `bin/project-state-check.mjs` and `bin/planner-handoff-check.mjs` both run
  `bin/agent-state.mjs` as a subprocess, so one new continuity rule reaches
  three suites, not one: `agent-state.test.ts` (65 failures), then
  `projectState.test.ts` and `plannerHandoff.test.ts` (26). The blast radius of
  an `agent:check` addition is wider than the file it lives in.
- The first RS-1 advisory-guard rule was DEAD: two projection functions carry
  the guard, so `includes(literal)` stayed satisfied when one was deleted.
  Replaced by a totality relation — emitted `advisoryOnly: true` values must
  equal guarded inputs. Every one of the six RS-1 branches is now probed by
  deliberate mutation, because a hardening rule that cannot fail proves
  nothing.
- `project:check` requires `.agent/EXECUTION_PROMPT.md` `Status` and
  `Campaign ID` to match the active task, so the `READY_FOR_EXECUTION`
  planning-only checkpoint described in `.agent/PLANNER_HANDOFF.md` would
  fail `project:check` if committed on its own. Every campaign in the
  recorded history instead opens with the prompt and `ACTIVE_TASK.md`
  moving to `IN_PROGRESS` in the same commit. This campaign follows the
  mechanically enforced route, and the contradiction is recorded for M8.

## Safety Events

None. No production, NEXT, DEV, or live C-12 contact. No credential
access. No sibling-repository write. No force push. No history rewrite.

## Deferred / Follow-Up

- `.agent/PLANNER_HANDOFF.md`'s `READY_FOR_EXECUTION` lifecycle contradicts
  `project:check`'s execution-prompt binding rule (see Discoveries).
  Reconcile in M8 rather than mid-campaign.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-reviewer-surface-and--30ec5809`
2. `node bin/nightwatch-session.mjs claim --task nightwatch-reviewer-surface-and-intel-scale-v1 --adopt`
3. Read this `STATE.md`, then `PLAN.md` for the current milestone.
4. Continue from `## Exact Next Action`.

## Completion Snapshot

(filled at close)
