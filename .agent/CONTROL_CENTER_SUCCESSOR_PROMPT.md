# Nightwatch Control Center — Safe Successor / Active-Campaign Injection Prompt

Status: QUEUED SUCCESSOR CANDIDATE — NOT ACTIVE TASK  
Planning branch: `plan/nightwatch-control-center`  
Planning baseline: `main@755cb2e611355011c9d249142b2c2bf4f112327a`

This file exists so an active Nightwatch executor can discover the Control Center research **without replacing the current task, switching branches, cherry-picking planning commits, or corrupting continuity state**.

---

## Prompt to inject into a currently running Nightwatch agent

You have a newly researched **Nightwatch Control Center** successor campaign available on the remote planning branch `plan/nightwatch-control-center`.

### First rule: preserve current-task truth

Do **not** abandon, overwrite, or silently replace an `IN_PROGRESS` Nightwatch task merely because this successor exists.

1. Read the current repository instructions and `.agent/ACTIVE_TASK.md`.
2. If the active task is `IN_PROGRESS`, continue to its recorded `Exact Next Action` until a stable checkpoint/terminal state unless the owner has explicitly ordered an immediate campaign switch.
3. If the owner explicitly orders an immediate switch, first make the current task truthful: stop editing, reconcile the working tree, run the smallest validation needed to establish reality, update its STATE/REPORT as appropriate, commit/push the safe checkpoint according to repository policy, and only then route a new task.
4. Never claim the current campaign is COMPLETE merely to make room for this one.

### Read the planning work without changing the current branch

Fetch the planning ref safely, then inspect it with `git show`; do **not** check it out over the active working tree:

```bash
git fetch origin plan/nightwatch-control-center

git show origin/plan/nightwatch-control-center:docs/design/NIGHTWATCH_CONTROL_CENTER_RESEARCH.md

git show origin/plan/nightwatch-control-center:docs/design/NIGHTWATCH_CONTROL_CENTER_IMPLEMENTATION_PLAN.md

git show origin/plan/nightwatch-control-center:.agent/CONTROL_CENTER_SUCCESSOR_PROMPT.md
```

If repository policy requires a different safe fetch procedure, follow `AGENTS.md` and current continuity instructions instead.

### What the planning documents propose

The proposed capability is a private local **Nightwatch Control Center** with:

- Overview/readiness/safety dashboard;
- Run Explorer and event timeline;
- interactive Execution Graph;
- Campaign Intelligence views;
- Source Intelligence graph with proof/currentness/lifecycle semantics;
- sanitized owner-local Findings view;
- loopback-only read-only HTTP API;
- bounded SSE notifications;
- isolated React + React Flow frontend;
- no database in V1;
- no execution/mutation buttons/endpoints in V1;
- no DEV/NEXT/production contact;
- no raw source/secret/raw-body/artifact-browser exposure.

The research branch is **planning-only**. It is not an implementation base.

---

## When the current campaign reaches a safe terminal state

Re-evaluate whether the Control Center is still the highest-value next campaign.

Before starting it:

1. Fetch/prune safely.
2. Read current:
   - `AGENTS.md`
   - `.agent/README.md`
   - `.agent/PLANS.md`
   - `.agent/PLANNER_HANDOFF.md`
   - `.agent/ACTIVE_TASK.md`
   - `.agent/EXECUTION_PROMPT.md`
   - `docs/CURRENT_STATE.md`
   - `docs/SAFETY_MODEL.md`
   - `docs/DECISIONS.md`
   - `docs/ARCHITECTURE.md`
3. Compare live `main` against planning baseline `755cb2e611355011c9d249142b2c2bf4f112327a`.
4. Inspect every intervening commit that affects evidence, readiness, source intelligence, campaign/portfolio, triage/findings, package/runtime/gates, filesystem/network safety, or continuity.
5. Reconcile the research/plan with landed work. Do not preserve a stale design merely because it is written here.
6. Verify the actual Node 20 minor used by clean qualification before selecting Vite version; current Vite 8.1 requires Node 20.19+ or 22.12+.
7. Create a fresh implementation branch from **current live main**, not from this planning branch.
8. Create a new continuity-v2 task before substantive implementation.

Suggested implementation branch:

`campaign/nightwatch-control-center`

Suggested task ID:

`nightwatch-control-center-readonly-v1`

Suggested authorization class:

`CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY`

---

## Mandatory implementation mission

Implement the Control Center according to the reconciled current version of:

- `docs/design/NIGHTWATCH_CONTROL_CENTER_RESEARCH.md`
- `docs/design/NIGHTWATCH_CONTROL_CENTER_IMPLEMENTATION_PLAN.md`

Treat the detailed plan as a living execution plan under `.agent/PLANS.md` rules. Port it into the new task PLAN, update wrong assumptions with evidence, and record decisions.

### Architectural invariants

1. **Existing Nightwatch models remain authoritative.** The UI/API must use domain services/adapters, not parse CLI stdout or duplicate readiness/currentness/portfolio logic.
2. **Read-only first.** No HTTP endpoint/button may execute a Nightwatch campaign, spawn arbitrary commands, control a product browser, capture auth, mutate files, or contact product environments.
3. **Loopback only.** Default server binds `127.0.0.1`; wildcard/LAN binds fail closed.
4. **Whitelist versioned DTOs.** Never spread internal objects directly into API responses.
5. **No arbitrary paths.** Browser sends safe IDs; server resolves through approved stores/boundaries.
6. **No generic raw evidence/source surface.** No raw source, request/response bodies, secrets, cookies, auth strings, customer values, traces, or arbitrary console/network logs.
7. **SSE is notification-only.** GET snapshots remain state authority.
8. **No dashboard database in V1.** Existing deterministic stores remain authority.
9. **Source graphs preserve proof/currentness semantics.** Do not turn topology into implied proof.
10. **Phase 24 remains portfolio authority.** Control Center must not create a second selector/planner.
11. **Safety and oracle failures remain semantically distinct.** Do not collapse product anomalies into containment state.
12. **No external assets/telemetry.** Built UI works with zero CDN/font/analytics dependencies.

---

## Required campaign shape

Execute the detailed plan milestone-by-milestone. At minimum preserve these stages:

- M0 — live repo/continuity reconciliation and clean baseline;
- M1 — versioned DTO/sanitization contracts;
- M2 — authoritative read-only adapters;
- M3 — hardened loopback HTTP server;
- M4 — isolated frontend shell;
- M5 — Overview + Safety Center;
- M6 — Runs + timeline + Execution Graph + SSE refresh;
- M7 — Campaign Intelligence;
- M8 — bounded Source Intelligence graph;
- M9 — sanitized Findings view;
- M10 — adversarial security/privacy/accessibility hardening;
- M11 — performance/determinism qualification;
- M12 — whole-repo integration, clean qualification, docs, continuity closure.

Do not compress the campaign by skipping security/privacy/accessibility/performance/clean-checkout work after the UI appears functional.

---

## Initial validation expectations

At implementation start, establish a fresh baseline with current authoritative commands. At the planning baseline this includes the family:

```bash
npm run agent:check
npm run project:check
npm run typecheck
npm run hardening:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run gate:local
npm run gate:clean
```

Do not assume exact command inventory remains unchanged; inspect current `package.json` and gate specifications.

---

## Success condition

The successor is complete only when the owner can inspect Nightwatch locally through the Control Center and the new UI/server has **not** acquired hidden execution authority, remote exposure, raw-source/evidence leakage, a parallel state store, or a weaker safety path.

If the current active hardening campaign materially changes the relevant boundaries, update the plan first and explain the change in the new task Decision Log.
