# Nightwatch Executor Campaign — Source-Proof Soundness + Static Discovery Hardening

Status: ACTIVE PLANNING HANDOFF — executor may start a fresh native task; no implementation from this campaign has landed yet.
Planned-From: main at 266b5fcbb4c80125939f41df3bf9b5608654c753
Target branch: main
OpenSpec change: openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/
Intended execution budget: approximately 12 productive engineering hours
Scope: LOCAL / approved read-only source / synthetic only

## Mission

Pull the latest night-watch main branch and execute the OpenSpec change nightwatch-source-proof-soundness-and-static-discovery-hardening-v1 end to end.

Do not resume the completed nightwatch-source-analysis-runtime-hardening-v1 task. Create a fresh continuity-v2 task and make it the active task before source edits.

Your primary objective is NOT to increase proof counts. It is to prove that Nightwatch only promotes lexically real, reachable, mechanically complete source facts into response/semantic/campaign authority.

The planner found two mandatory soundness seams:

1. Extended PHP direct-return proof appears able to prove a literal response from an incomplete control-flow function with implicit fall-through.
2. Static TS/JS/Go route extraction and PHP declaration counting use raw-source regex matching that can be contaminated by comments/strings.

You must reproduce or falsify those claims through executable public-path tests. Do not accept the planner's static reasoning on faith.

## Required bootstrap

Read, in this order:

1. AGENTS.md
2. .agent/PLANNER_HANDOFF.md
3. this file
4. docs/CURRENT_STATE.md
5. docs/SAFETY_MODEL.md
6. docs/DECISIONS.md
7. docs/ROADMAP.md
8. docs/ARCHITECTURE.md where source/campaign authority is relevant
9. .agent/ACTIVE_TASK.md and the completed prior task's STATE/REPORT
10. every file in openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/

Then reconcile live Git against Planned-From. Current tests/runtime/live source outrank this prompt if the repository changed.

Create:

.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/SPEC.md
.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/PLAN.md
.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/STATE.md
.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/REPORT.md

and route .agent/ACTIVE_TASK.md to the new task as ACTIVE. Preserve continuity protocol v2 and repository checkpoint rules.

## Non-negotiable H0 all-file audit

Before implementation, literally scour the local checkout.

Use a NUL-safe git ls-files manifest. Account for EVERY tracked file, not merely src/. The final task report must record tracked count and reviewed count and they must match.

For every tracked path, classify at minimum:

- current runtime/source authority
- safety/auth/network/product boundary
- campaign/triage/portfolio/Phase-24 authority
- source parser/analyzer/currentness/cache/invalidation
- tests/gates/tooling
- UI/Control Center
- config/workflow
- corpus/fixture
- durable docs/history
- agent continuity
- generated/lock/metadata

Deep-read current executable/config/gate logic. Historical files still need role/coupling review; do not waste hours pretending every historical report is active business logic.

Search broadly for TODO/FIXME/HACK/XXX, skips/only, ts-ignore/expect-error, unsafe eval/shell, hidden network/writes, duplicate analyzers/parsers, stale compatibility bridges, fail-open error paths, source-text/privacy leakage, global mutable state and unbounded collections. Record evidence, not just query strings.

No source edit before this audit and baseline are checkpointed.

## Mandatory reproduction 1 — PHP implicit fall-through

Start with a focused test around analyzeSourceArtifact, then prove the public source-discovery consequence.

Probe:

~~~php
function readExample($mode) {
    if ($mode) {
        return ['id' => 1];
    }
}
~~~

Determine whether current code emits a mechanically-provable PHP_RETURN_ROOT_TYPE or PHP_RETURN_OBJECT_FIELDS observation and whether an otherwise exact discovered handler can therefore obtain responseProof/semanticProof PROVEN.

Controls:

- one unconditional literal return — should be provable;
- conditional early literal return + unconditional compatible fallback — should be provable if every path is covered;
- complete if/else — should be provable if every branch is exact;
- missing else/fallback — must not be a whole-handler proof;
- nested/loop/try/yield/dynamic/unknown flow — fail closed unless this campaign explicitly proves the bounded form.

If reproduced, this is a correctness defect. Fix it even if current proof/census counts fall.

Do NOT solve it by making every rejected analyzer observation globally override all proven observations. Fix completeness in the owning PHP response proof family.

## Mandatory reproduction 2 — code-like route text

Through the public synthetic source discovery path, test at least:

~~~ts
// app.get("/ghost", ghostHandler)
const documentation = 'router.get("/also-ghost", anotherHandler)';
app.get("/real", realHandler);
~~~

and Go comment/raw-string equivalents.

A comment/string route must not produce a route operation. The real route must preserve existing identity/order.

If reproduced, replace raw-regex-over-unfiltered-source matching with bounded lexical-aware discovery. Do not execute JS/Go or introduce a framework runtime.

## Mandatory reproduction 3 — fake handler declarations

Construct PHP source with one real handler function plus comment/docblock/string text containing the same function declaration spelling.

The fake text must not turn one real declaration into MULTIPLE_SYMBOLS. Two lexically real declarations must still fail closed.

Prefer existing bounded PHP tokenization where ownership/coupling remains clean. If a new lexical helper is necessary, make it small, deterministic, bounded and independently tested.

## Proof/version rules

Correctness changes may legitimately alter source-surface/analyzer/contract/census digests.

For each delta classify:

- INTENTIONAL_CORRECTNESS_DELTA
- EXPECTED_VERSION_INVALIDATION
- UNEXPLAINED_DRIFT

Unexplained drift is a blocker.

If extended real-source response semantics change, bump the appropriate version identity and prove that sourceSurfaceAnalyzerSetIdentity, caches, currentness/invalidation and downstream source census observe it.

Never bump an identity solely to make a failing parity test go away.

## Fresh census and optional coverage work

After the soundness fixes are green, rerun the entire current source proof census.

Do not aim for the old 83 response contracts / 3 eligible as a minimum. If corrected truth is lower, keep the lower truthful result.

Only if the hardened current census reveals a repeated exact static response family with:

- current positive population;
- complete bounded syntax;
- deterministic identity;
- positive + adversarial near-miss fixtures;
- currentness binding;
- no dynamic/runtime/fuzzy inference;
- explicit false-positive analysis;
- downstream compatibility through existing adapters;

may you add ONE such proof family.

If no family clears that bar, record NO_SAFE_NEW_FAMILY and spend the remaining useful budget on adversarial tests, mutation cases, bounded helper decomposition, differential tooling, hidden bypass search and clean-checkout proof.

Do not touch GET-only read-only authority, runtime-binding generalization, dynamic dispatch, owner policy, replay authority, selection rules or publication.

## 12-hour work shape

Use the OpenSpec tasks.md schedule as the primary checklist:

- H0–1.5: full tracked-file audit + baseline
- H1.5–3: reproduce/falsify all soundness probes
- H3–5.5: PHP reachability/completeness hardening
- H5–7: route/declaration lexical hardening
- H7–8.5: downstream proof/census reconciliation
- H8.5–10: adversarial depth; optional exact-family admission only if earned
- H10–11: full local + clean-checkout acceptance
- H11–12: state/report/docs/Git/exact-head CI observation

This is a productive engineering budget, not a timer. Do not idle. Do not stop after the first green fix. If all required acceptance is genuinely complete early, continue useful in-scope adversarial and coupling review; stop only when the campaign is terminal or further work would be manufactured scope.

## Validation

At minimum run and record:

- npm run typecheck
- npm run hardening:check
- npm run quality-gate:spec
- npm run gate:inventory
- focused Phase 25/26/27/28 analyzer/source/response-flow suites
- real-source extraction/currentness/admission tests
- sourceAnalysisParity tests
- npm run campaign:synthetic
- npm run campaign:source-gaps
- npm run campaign:eligibility-census
- npm run campaign:readonly-census
- npm run test:semantic-compat
- npm run test:owner-provenance
- npm run gate:local
- npm run gate:clean
- npm run agent:check
- npm run agent:audit
- npm run project:check
- git diff --check

Run the canonical complete Playwright enumeration and a fresh disposable checkout/topology acceptance consistent with current repository policy.

Capture comparable before/after source-census wall time and peak RSS. Correctness may cost some time; unbounded or severe regressions require investigation.

If Control Center source DTOs/adapters change, run its typecheck/tests/build/browser gate. If they do not change, still verify source projections consumed by it remain schema-compatible.

## Safety

Hard boundaries:

- no production/DEV/NEXT/authenticated product contact;
- no data/infra/cloud operations;
- no sibling-source writes;
- no source execution;
- no publication;
- no runtime AI authority;
- no canonical self-dev promotion;
- no force push;
- raw source/customer/credential/cookie/body/trace values never enter committed task artifacts;
- all uncertain source facts fail closed.

## Git and reporting

Commit only coherent validated checkpoints and push according to repository policy. Never force push.

REPORT.md must include:

- exact starting/final SHAs;
- exhaustive audit manifest totals;
- every planner probe and disposition;
- reproduced defects with root cause;
- implementation and versioning;
- safe before/after proof/census counts;
- intentional identity deltas;
- adversarial matrix;
- validation ledger with exact counts/skips;
- before/after timing + RSS;
- regressions fixed;
- candidates rejected and why;
- remaining risks/deferred work;
- explicit safety counters/statement;
- exact-head Actions observation.

A GitHub Actions job with steps: [] is NO_STEPS_BILLING_OR_PLATFORM_BLOCK, not green CI.

Terminal next action after complete validated push: STOP.
