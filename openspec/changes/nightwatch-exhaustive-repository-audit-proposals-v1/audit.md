# Exhaustive Nightwatch repository audit ledger

## Audit identity

- Campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Starting commit: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Starting tree: `9b6c1982251e2afa70877745b7787284e9f96a52`
- Tracked-path inventory SHA-256: `939fe42065e7923e9dfd56eb46bfda38c8a2bb2e40127accc8efed75ab6a77f6`
- Tracked paths: `2,593`
- Scope: Nightwatch repository only; local read-only inspection and deterministic synthetic validation
- Write boundary: this task's continuity and OpenSpec planning artifacts only
- Product implementation: not authorized

## Evidence precedence

1. Current deterministic tests and runtime evidence.
2. Current implementation and configuration.
3. Current published OpenSpec requirements and active change artifacts.
4. Active task state and plans.
5. Durable architecture, safety, decisions, roadmap, and historical handoffs.

A candidate is not a finding until current evidence establishes its failure mode, reachability, and consequence. Historical prose, TODOs, skipped tests, advisories, or suspicious patterns are leads only.

## Candidate lifecycle

`OBSERVED -> SUBSTANTIATED -> MATERIAL -> PROPOSED`

Terminal alternatives: `DUPLICATE`, `NOT_AN_ISSUE`, `NON_MATERIAL`, or `DEFERRED_EXTERNAL_EVIDENCE`.

Every candidate record must contain: stable ID, affected paths, subsystem, failure mode, trigger/reachability, consequence, existing mitigations, evidence, severity dimensions, confidence, existing-plan comparison, disposition, and owning proposal when material.

## Severity rubric

| Dimension | Questions |
|---|---|
| Safety/privacy | Can this bypass owner policy, containment, authorization, redaction, provenance, or secret/customer-data boundaries? |
| Correctness/integrity | Can it fabricate success, lose or corrupt evidence/state, misclassify a finding, or violate a deterministic contract? |
| Blast radius | Does it affect one optional tool path, one campaign, every local run, or a durable release/continuity authority? |
| Reachability | Is the trigger ordinary, adversarial but authorized, configuration-dependent, or blocked by a stronger boundary? |
| Likelihood/recurrence | Is it deterministic, race-dependent, scale-dependent, stale-state-dependent, or only theoretical? |

Severity and evidence confidence are recorded separately. Critical/High requires a credible reachable path to the claimed consequence.

## Frozen tracked-tree coverage denominator

The following top-level classes are exhaustive and mutually exclusive for the starting snapshot. Counts sum to `2,593`.

| Class | Tracked paths | Planned inspection | Status | Candidate IDs | Final disposition |
|---|---:|---|---|---|---|
| `.agent/` | 781 | continuity-v2 tasks, templates, execution handoff, historical/current authority | PENDING | — | — |
| `src/` | 626 | all runtime subsystems and trust boundaries | PENDING | — | — |
| `openspec/` | 417 | published specs, active changes, archive/deduplication, schema validity | PENDING | — | — |
| `tests/` | 410 | unit/browser/smoke/manual/helpers/fixtures, assertion strength and gaps | PENDING | — | — |
| `bin/` | 118 | CLI, gates, validators, generators, session/workspace/release tooling | PENDING | — | — |
| `corpus/` | 113 | fixture/corpus integrity, authority separation, generated/historical boundaries | PENDING | — | — |
| `docs/` | 40 | architecture, safety, decisions, roadmap, current-state and design truth | IN_PROGRESS | — | — |
| `ui/` | 32 | Control Center static UI, accessibility, responsive and interaction behavior | PENDING | — | — |
| `config/` | 26 | environment, workspace, gates, policies, registries and bounds | PENDING | — | — |
| Root and integration files | 30 | manifests, lockfile, TypeScript/Playwright configs, CI, env example, scenarios and agent integrations | PENDING | — | — |

### `src/` subsystem denominator

| Subsystem | Tracked paths | Audit wave | Status |
|---|---:|---|---|
| `src/core/` | 465 | M2/M3/M4/M5/M7 by responsibility | PENDING |
| `src/oracles/` | 54 | M4 | PENDING |
| `src/controlCenter/` | 43 | M6 | PENDING |
| `src/browser/` | 14 | M2/M3 | PENDING |
| `src/products/` | 12 | M3 | PENDING |
| `src/data/` | 11 | M3/M5 | PENDING |
| `src/api/` | 10 | M3 | PENDING |
| `src/proxy/` | 9 | M2 | PENDING |
| `src/auth/` | 6 | M2 | PENDING |
| `src/state/`, `src/mcp/` | 2 | M3/M5 | PENDING |

### `tests/` denominator

| Test class | Tracked paths | Status |
|---|---:|---|
| `tests/unit/` | 372 | PENDING |
| `tests/manual/` | 12 | PENDING |
| `tests/helpers/` | 8 | PENDING |
| `tests/browser/` | 7 | PENDING |
| `tests/smoke/` | 5 | PENDING |
| `tests/fixtures/` | 5 | PENDING |
| `tests/globalSetup.ts` | 1 | PENDING |

## Existing planning authority index

The starting tree contains 50 published capability specs and 10 non-archived OpenSpec changes. Status reported by `openspec list --json` at activation:

- Complete: `nightwatch-current-source-unknown-yield-w12-v1`, `nightwatch-certification-closure-and-validation-integrity-v1`, `nightwatch-validation-classification-and-skip-truth-v1`, `nightwatch-published-spec-baseline-integrity-v1`, `nightwatch-continuity-live-waypoint-binding-v1`.
- In progress: `nightwatch-production-completion-programme-v1`, `nightwatch-autonomous-yield-proof-w11-v1`, `nightwatch-control-center-design-system-v1`, `nightwatch-autonomous-bug-hunting-programme-v1`, `nightwatch-production-observability-system-map-master-plan-v1`.

An existing change counts as duplicate coverage only when its normative requirements and tasks close the exact observed failure mode. Status labels and title similarity are insufficient.

## Durable document read ledger

| Document | Coverage | Audit-relevant authority extracted | Status |
|---|---|---|---|
| `AGENTS.md` | complete | C-00 ownership, source precedence, owner scope freeze, task/continuity/project-state protocols, destructive/deletion policy | COMPLETE |
| `docs/SAFETY_MODEL.md` | complete (1–1,656) | fail-closed host/action/redaction rules; L0–L6 boundaries; auth/private-store/reasoner constraints; semantic/source and self-development authority partitions; historical versus current acceptance evidence | COMPLETE |
| `docs/ARCHITECTURE.md` | complete (1–2,325) | module map and run lifecycle; authority/data-flow boundaries; source/semantic/campaign/Control Center architectures; current L6 and reviewer/review-store designs; relocated inventory explicitly historical | COMPLETE |
| `docs/CURRENT_STATE.md` | machine truth, live-state, exact-head CI, current C-05/C-06/C-08/C-09/R-12 records read; remaining historical/current campaign sections pending | `OPERATIONALLY_ACCEPTED`; current project-state and live-task blocks are mechanically owned; CI non-evidence is distinct from local validation; historical counts and anchors cannot be treated as live facts | IN_PROGRESS |
| `docs/DECISIONS.md` | pending | — | PENDING |
| `docs/ROADMAP.md` | pending | — | PENDING |

No documentation inconsistency is admitted as a finding merely because historical prose differs from current machine truth. A candidate requires evidence that a current consumer trusts the stale statement or that required durable truth is internally contradictory.

## Finding ledger

No finding has been admitted yet. The empty ledger is not evidence of zero issues; subsystem inspection has not begun.

| ID | State | Severity | Confidence | Subsystem | Summary | Evidence | Existing-plan relation | Owning change |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

## Validation ledger

| Command/evidence | Result | Purpose |
|---|---|---|
| `npm run session:status` | PASS | Owned current C-00 worktree; canonical safe |
| `npm run agent:check` | PASS with pre-existing unrelated warnings | Continuity-v2 and workspace routing |
| `openspec status --change nightwatch-exhaustive-repository-audit-proposals-v1` | 4/4 complete | Umbrella change is apply-ready |
| `openspec validate nightwatch-exhaustive-repository-audit-proposals-v1 --strict` | PASS | Umbrella schema/requirements validity |
| `git ls-files` inventory | 2,593 paths; top-level counts reconcile | Frozen coverage denominator |

## Completion audit

Not yet eligible. All coverage rows except durable-context bootstrap remain PENDING, the finding ledger has not been populated, and no issue-specific remediation change exists.
