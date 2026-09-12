# Release advance conditions and verdict (F-12)

This document is the human surface of `nightwatch.release-certification.v1`.
The machine authority is `config/release-certification.v1.json` (the ordered
conditions and their evidence bindings), `src/core/releaseCertification/index.ts`
(the deterministic judgement) and `bin/project-state-check.mjs` (the evaluation
and the advance refusal). `npm run project:check` re-evaluates everything here
from the tree as it stands; nothing on this page is hand-maintained truth.

## The verdict is never presented bare

Project completion status: `OPERATIONALLY_ACCEPTED`.
`<!--status:PROJECT_COMPLETION_STATUS=OPERATIONALLY_ACCEPTED-->`

The three counts that give the status meaning are carried with it:

- lanes proven: **9** `<!--status:VALIDATION_LANE_PROVEN_COUNT=9-->`
- lanes externally blocked with a current record: **0**
  `<!--status:VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT=0-->`
- lanes never attempted: **1**
  `<!--status:VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT=1-->`
- separately, proven lanes carrying stale evidence: **1**
  `<!--status:VALIDATION_LANE_STALE_EVIDENCE_COUNT=1-->`

A surface that presents `PROJECT_COMPLETION_STATUS` without those counts fails
the render guard in `project:check`
(`PROJECT_STATE_VERDICT_PRESENTED_BARE`). The count values above are the
governed ledger's current values (`GOVERNED_STATUS_KEYS`), reconciled after the
2026-09-12 group-9 lane flip (D-133).

Owner decision 13.8 is TAKEN (2026-09-12): `PROJECT_COMPLETION_STATUS` stays
`OPERATIONALLY_ACCEPTED` until all sixteen advance conditions are MET and
exact-head CI is green at the certified checkpoint; the only advance status is
`PROJECT_COMPLETE_AND_CI_CERTIFIED`, and it is not claimed (D-129). The
certification record keeps `nextStatus.state: PENDING_OWNER_DECISION` as its
structural safe-default encoding until its owner reconciles it; it no longer
represents an open decision.

External production track: `EXTERNAL_PREREQUISITE_UNMET`. It has its own
status and is never counted among the advance conditions.

## The ordered advance conditions

Each condition is decided by the output of the named check; a condition with
no registered check fails the definition itself
(`PROJECT_STATE_RELEASE_DEFINITION_CHECK_UNBACKED`). States below are the
evaluation at the certified checkpoint
`88e3c3fb52937ff303b0944cc22cfee624bf807e` (13.9, honest result).

| # | Condition | Backing check | State at this checkpoint |
|---|---|---|---|
| 1 | `validation-lane-closure` | `validation-lane-state` | UNMET — `clean-checkout` and `exact-checkpoint-ci` carry evidence older than the baseline |
| 2 | `exact-head-ci-authority` | `ci-block-record` | MET — `CI_STATUS: EXECUTED_PASS`, run 34705274649 executed at 66df26b7 |
| 3 | `autonomous-yield-proof` | `yield-campaign-result` | UNAVAILABLE — check created by group 12, not present |
| 4 | `completion-ledger-truth` | `ledger-agreement` | MET — `strict_errors=0 legacy_undeclared=0 ledger_errors=0` |
| 5 | `operator-cli-contract` | `operator-cli-sweep` | UNMET — 63 discovered, 31 conforming, 32 undeclared |
| 6 | `documentation-currency` | `documentation-currency-rules` | MET — 0 findings |
| 7 | `workspace-continuity-drift-closure` | `workspace-claims` | UNMET — two `CLAIM_TASK_TERMINAL` findings; owner release actions 6.4/6.5 |
| 8 | `dependency-supply-chain-currency` | `dependency-advisory-lane` | MET — lane `dependency-advisory` is PROVEN from the executed 2026-09-12 bounded registry query: one low advisory (`vue@2.6.12`, GHSA-5j4c-8p2g-v4jx, CWE-1333) with an unreachable disposition, recorded in `config/dependency-currency.v1.json` (D-133) |
| 9 | `dead-architecture-closure` | `dead-architecture-closure-check` | UNAVAILABLE — check created by group 14 |
| 10 | `cli-implementation-contract` | `cli-implementation-contract` | UNMET — `bin-typecheck` lane still `REPORTING` |
| 11 | `structural-rule-soundness` | `structural-rule-registry` | MET — 76 rules, every rule has a recorded probe and an explicit quantifier |
| 12 | `schema-version-lifecycle` | `schema-version-lifecycle-check` | UNAVAILABLE — check created by group 17 |
| 13 | `ui-error-taxonomy-rendering` | `ui-error-taxonomy-check` | UNAVAILABLE — check created by group 18 |
| 14 | `configuration-contract` | `configuration-contract-check` | UNAVAILABLE — check created by group 19 |
| 15 | `accessibility-certification` | `accessibility-certification` | UNAVAILABLE — check registered, no recorded result at this checkpoint |
| 16 | `authenticated-capability-lifecycle` | `authenticated-capability-lifecycle-check` | UNAVAILABLE — check created by group 21 |

Summary at this checkpoint: 4 of 16 conditions MET, 5 UNMET, and 7 awaiting the
programme group that creates their check. The advance is not claimed
(`PROJECT_COMPLETION_STATUS` is `OPERATIONALLY_ACCEPTED`, not
`PROJECT_COMPLETE_AND_CI_CERTIFIED`), so the unmet conditions do not fail
`project:check`; setting an advance status now would fail it naming every
unmet condition (`PROJECT_STATE_ADVANCE_CONDITION_UNMET`).

## The production path is an external track

C-12 → C-14 and P4 are excluded from the advance conditions by construction.
They are reported with their own status (`EXTERNAL_PREREQUISITE_UNMET` while
`POSITIVE_DEPLOYMENT_FACTS: 0`), so another organization's decision about
`mochi` access or observer identity cannot make the project permanently
incompletable while remaining visible.

The G10.6/G10.13 path is now taken (2026-09-12): the authorized read-only
`mochi` access is unavailable — no `mochi` checkout and no
`services/{env}/{appproxy,serviceproxy}/ingress.yaml` exists under the sibling
root — so C-13 and C-14 are recorded terminal in `docs/ROADMAP.md` and here,
with that reason (D-134). No deployment fact is claimed:
`POSITIVE_DEPLOYMENT_FACTS` stays 0 and the machine external track continues to
report `EXTERNAL_PREREQUISITE_UNMET` for the remaining stages, not
`AWAITING_AUTHORIZATION`.

## Evidence binding and `STALE_EVIDENCE`

Every condition binds the SHA at which its evidence was earned. Evidence that
strictly precedes the certified checkpoint is reported `STALE_EVIDENCE`: the
condition does not count as met and the certification is refused. Advancing
the baseline therefore voids the prior observation until it is re-earned at
the new baseline. A `null` binding means no evidence has been earned yet.
The `8bad862e…` bindings above were earned at the session head that produced
the recorded evaluations; the integration commit will advance the certified
checkpoint past them, so the session owner re-binds each condition it still
claims after integration. Until then the verdict reports the certification
refused, which is the intended consequence, not a gate failure: unmet and
stale conditions fail `project:check` only when an advance status is claimed.

## A documentation-only descendant is not the implementation anchor

A documentation-only commit remains a checkpoint advance. It is never
relabelled as an implementation commit, and `project:check` refuses a
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` whose commit touches only approved
checkpoint paths (`PROJECT_STATE_IMPLEMENTATION_ANCHOR_DOCUMENTATION_ONLY`).

## Owner decision (13.8)

Taken 2026-09-12 (D-129). The status stays `OPERATIONALLY_ACCEPTED` until all
sixteen ordered conditions are MET and exact-head CI is green at the certified
checkpoint; `PROJECT_COMPLETE_AND_CI_CERTIFIED` remains the only advance status
and is not claimed. No new status name was added and none is needed: the
owner's decision applies the existing advance status under a stricter
precondition, so the gate and the certified condition set are unchanged.

## Integration and gate status (13.10)

The full offline regression, `gate:local`, `gate:clean` and `gate:topology`,
the UI and browser lanes, reconciliation of project truth, and the
fast-forward integration are the session owner's action. At this checkpoint
the session worktree is uncommitted by design and the canonical checkout is
externally dirty with a concurrent planning artifact, so `project:check`
reports `PROJECT_STATE_CHECKOUT_DIRTY` and
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; those are environmental, not
certification failures. See the group 13 record in
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`.
