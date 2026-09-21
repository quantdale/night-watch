# EXECUTION PROMPT — Exhaustive repository audit and OpenSpec proposals

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-exhaustive-repository-audit-proposals-v1
OpenSpec: openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/
Planned-From: 34517c9ba11c97407168fe5879ee03794dfff3e3
Target Branch: main
Predecessor Task ID: nightwatch-test-infrastructure-performance-v1
Predecessor Status: COMPLETE

## Mission

Audit the complete Nightwatch repository with read-only evidence, identify and
prioritize every material correctness, security, safety, reliability,
performance, architecture, maintainability, validation, and test gap, and
capture each coherent remediation scope as an implementation-ready OpenSpec
change. This campaign is planning-only: it changes no product source, contacts
no real environment, and grants no execution authority to any generated change.

## Scope

`.agent` continuity and planning artifacts; `openspec/changes` planning
artifacts; read-only inspection of source, tests, configuration, tooling, docs,
and Git history; strict OpenSpec validation; deterministic local evidence only.

## Ordered workstreams

1. M0 — governed activation, coverage model, and existing-planning index.
2. M1 — repository topology, dependencies, configuration, build, and tooling.
3. M2 — safety, environment, policy, proxy, L6 containment, and authentication.
4. M3 — browser, API, journey, evidence, persistence, and replay.
5. M4 — source intelligence, semantic oracles, expectation lifecycle, and
   change intelligence.
6. M5 — campaign, autonomous runtime, investigation, reproduction, admission,
   and findings.
7. M6 — Control Center and reviewer/operator surfaces.
8. M7 — continuity, workspace isolation, validation, tests, and documentation
   truth.
9. M8 — adjudication, severity ranking, and finding partition.
10. M9 — implementation-ready remediation change generation.
11. M10 — completeness audit and planning-only closure.

## Constraints

LOCAL / READ-ONLY / SYNTHETIC only. No product source implementation, DEV /
NEXT / production contact, authenticated runtime, database or data-plane
access, cloud or infrastructure operation, sibling repository mutation,
external publication, issue or PR creation, force push, or history rewrite.
No implementation task of any generated change may be marked complete.

## Validation

`npm run session:status`; strict `openspec validate` for the umbrella change
and every generated remediation change; `npm run agent:check`;
`npm run workspace:check`; `npm run handoff:check`; `npm run project:check`;
`git diff --check`; planning-only diff and privacy inspection.

## Acceptance / completion gates

- Every tracked repository area is classified and inspected through a
  documented coverage model with explicit, justified omissions.
- Every material finding maps one-to-one to a strictly valid,
  implementation-ready OpenSpec change; duplicates and non-issues carry
  terminal dispositions.
- The planning diff contains only `.agent/**` and `openspec/changes/**`
  continuity/planning artifacts; product implementation files are
  byte-unchanged.
- Terminal continuity, handoff, and project truth bind to this completed
  campaign's continuity-v2 task record.

## Git / reporting

The planning checkpoint was integrated into `main` at `aa05696b` (planning
close `2afc54de`); the owned session worktree has since been released, and
canonical routing records `SESSION WORKTREE: NONE` with `Branch: main`. This
file is the terminal handoff record for the campaign. Implementation of every
generated change is deferred and requires a new owner-authorized planning
checkpoint and C-00 task.
