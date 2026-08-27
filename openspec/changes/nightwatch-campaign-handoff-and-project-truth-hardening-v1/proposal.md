# Proposal: Campaign Handoff + Project Truth Hardening

Status: PLANNED — ready for executor pickup; implementation is intentionally not started by this planning commit.
Change ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
Planning baseline: main at 7165beeda3006ce1f64e61e7ae62fa919441fe96
Target branch: main
Execution budget: approximately 12 productive engineering hours
Safety scope: LOCAL / repository-only / synthetic-only

## Why this change

Nightwatch's current ACTIVE_TASK is terminal, but its EXECUTION_PROMPT still names a different completed campaign. The continuity checker does not read the execution prompt, hardening does not validate it, and the test suite explicitly permits arbitrary prompt content as a documentation-only checkpoint.

Separately, docs/CURRENT_STATE.md contains a "machine-checked" v1 block with stale Phase-15 fields that the project-state checker ignores. The same checker accepts NEXT_PROMOTION_AUTHORITY=SPENT but emits nextPromotionAuthority=NONE on PASS.

These are not cosmetic documentation problems. They are authority-boundary problems for autonomous execution and operator truth.

## Intended outcome

Create one small, deterministic, read-only truth plane for repository-development handoff:

planner handoff
→ versioned execution-prompt route
→ active task continuity
→ narrow machine-owned project state
→ unified quality gate

The campaign SHALL make stale, malformed, cross-campaign, wrong-branch, wrong-OpenSpec, and role-confused transitions fail closed before implementation work is accepted.

## Required outcomes

The executor SHALL:

- perform a literal all-tracked-file local audit before source edits;
- reproduce every planner finding with tests/fixtures;
- define a versioned planner→executor handoff schema/state model;
- bind the prompt to exactly one campaign/OpenSpec path and the intended Git baseline/branch;
- validate planned, active, blocked, and complete transition states without making the prompt a second task authority;
- harden implementation-vs-documentation SHA-role transitions;
- upgrade or replace project-state v1 with a strict narrow schema where every machine-block key is owned;
- remove or relocate stale/unvalidated live-looking fields from the machine block;
- make project-state PASS output semantically faithful to the validated state;
- integrate the handoff check into the authoritative local/CI/clean gate path;
- add adversarial temp-repository tests for cross-file and Git transition failures;
- preserve all safety, privacy, runtime, source, and owner-authority boundaries.

## Non-goals

This change does NOT authorize:

- DEV, NEXT, production, authenticated product contact, or browsers against real environments;
- database/datastore, GCP/GKE/Kubernetes, AWS/IAM/STS, deployment, or production metadata work;
- sibling Alphaus repository writes;
- external publication, messaging, issue creation, or evidence upload;
- self-development canonical promotion or new promotion authority;
- source-proof/read-only/runtime-binding expansion;
- proxy/browser L6 expansion;
- changing campaign selection merely to manufacture more work;
- rewriting all historical task records;
- parsing every CURRENT_STATE prose sentence into machine authority;
- a generic workflow engine or agent scheduler;
- test deletion, skip addition, assertion weakening, snapshot laundering, or force-push.

## Success signal

A fresh executor can pull main and deterministically answer:

1. Which one campaign is planned?
2. Which OpenSpec owns it?
3. What commit was it planned from?
4. Is the terminal predecessor state valid?
5. Has the campaign been activated, and if so does ACTIVE_TASK match it?
6. Is the implementation baseline a substantive implementation role rather than a docs-only checkpoint?
7. Does the machine-owned project-state block contain only validated current facts?
8. Does the unified quality gate reject every adversarial mismatch?

A successful campaign may leave historical prose untouched where it is clearly historical and outside the strict machine block.

## Execution handoff

The authoritative executor instructions are .agent/EXECUTION_PROMPT.md.

Before implementation edits, create a fresh continuity-v2 task:

.agent/tasks/nightwatch-campaign-handoff-and-project-truth-hardening-v1/

with SPEC.md, PLAN.md, STATE.md, and REPORT.md, then route .agent/ACTIVE_TASK.md to it.

The predecessor task remains immutable history except for narrowly justified durable cross-references.
