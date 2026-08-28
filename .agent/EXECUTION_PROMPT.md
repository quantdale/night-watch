# EXECUTION PROMPT — Final Assurance + Release-Readiness Hardening

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: BLOCKED
Campaign ID: nightwatch-final-assurance-release-readiness-hardening-v1
OpenSpec: openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/
Planned-From: 9ecd09c0d33d05d665721080627e5d63b376c16d
Target Branch: main
Predecessor Task ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
Predecessor Status: COMPLETE

## Mission

Pull/reconcile current `quantdale/night-watch` main and execute the OpenSpec change `nightwatch-final-assurance-release-readiness-hardening-v1` end-to-end as the repository's final whole-system assurance and release-readiness campaign for the currently authorized product scope.

This is **not** permission to invent another feature phase. The repository is mature and the preceding campaign completed a literal 1,359-file audit plus full local/clean certification. The new objective is to prove or falsify project completeness across the entire live repository, find residual defects that campaign-scoped testing may have missed, repair evidence-backed P0/P1/P2 issues, and finish with a truthful project-completion certification.

Work autonomously through the full campaign. Do not stop after the first green test or first repair. Continue through whole-repository audit, authority tracing, validation-gap analysis, dependency/install/build qualification, performance/resource review, documentation truth, full regression and release certification. Stop only for a genuine safety/authorization boundary, an unrecoverable remote-divergence conflict, a concrete external blocker required for completion, or terminal certification.

## Mandatory takeover

Before implementation edits:

1. Confirm repository root, `origin`, branch and live HEAD.
2. Read `AGENTS.md` completely.
3. Read `.agent/README.md`, `.agent/PLANS.md`, `.agent/PLANNER_HANDOFF.md`, this file, and `.agent/ACTIVE_TASK.md`.
4. Read the predecessor task `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`.
5. Read `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, and `docs/ARCHITECTURE.md` with current-vs-historical truth in mind.
6. Read every file under `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/`.
7. Fetch/reconcile `origin/main` without force. `Planned-From` is a planning baseline, not an instruction to reset current main.
8. Inspect every commit after Planned-From and confirm the OpenSpec/prompt planning commits are present and coherent.
9. Create a fresh continuity-v2 task at `.agent/tasks/nightwatch-final-assurance-release-readiness-hardening-v1/` with `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`.
10. When execution actually begins, route `.agent/ACTIVE_TASK.md` to the new task and transition this prompt to `IN_PROGRESS` under the existing handoff protocol.
11. Run `npm run handoff:check`, `npm run agent:check`, and `npm run project:check` before substantive changes.

Do not edit or resume the completed predecessor task as though it were active.

## H0 — literal every-file audit is mandatory

A connected planner cannot truthfully byte-read all repository files or execute the local suite. The predecessor executor did perform a literal sweep, but this campaign must independently refresh it at the live execution head.

Use `git ls-files -z` or an equivalently NUL-safe manifest. Requirements:

- discover the live tracked count; do not hardcode 1,359;
- account for every tracked path;
- read/hash every regular tracked file;
- require reviewed-count == tracked-count;
- classify every file by subsystem/role;
- record safe aggregate bytes/lines/digests only;
- investigate every difference from the predecessor audit;
- deep-read all current source, gate, configuration, workflow, operator, UI and authority-bearing files;
- role/coupling review historical/generated/fixture files too.

Search at minimum for TODO/FIXME/HACK/XXX/DEPRECATED, test skips/only/fixme, compiler/lint suppressions, eval/dynamic execution, shell-capable subprocesses, unbounded reads/collections, unsafe paths/symlinks, secret-like values, stale campaign IDs, duplicate authorities, fallback selectors, current-looking historical state, dead exports, generated-output drift, ambient credential/global-tool assumptions, swallowed errors, timer/listener/process leaks, and repeated expensive scans.

A grep with zero matches is not an all-file audit. Record the H0 census and remediation matrix before ordinary implementation.

## Campaign decision and priority

The planner's current decision is **Combined Implementation + Hardening**, tightly bounded to release-critical evidence. Fresh review has already earned focused work on the documented L6 process/DNS containment residual and safety-critical retry/conditional-skip qualification; this does not authorize broad product expansion.

Do not reopen source-proof, portfolio, DEV, self-development, infrastructure, publication, or other product scope simply to fill time. If the whole-system audit finds a P0/P1 implementation defect, fix it immediately and add a regression. If no significant defect exists, continue through final assurance/certification and stop without manufacturing work.

Priority order:

1. P0 safety/privacy/destructive/release-blocking failures.
2. P1 correctness/authority/core-workflow/reproducibility failures.
3. P2 validation, dependency/toolchain, performance/resource, operator and documentation-truth defects with demonstrated impact.
4. P3 cleanup only when directly adjacent, low-risk and evidence-backed.

## Required workstreams

Execute every OpenSpec milestone M0–M9. In particular:

### Architecture and authority

Trace end-to-end:

- environment -> browser -> proxy -> safety -> evidence;
- source -> proof -> lifecycle -> eligibility -> campaign;
- observation -> oracle -> candidate -> replay/minimization -> triage -> dossier -> private finding;
- artifacts/findings/source/campaign -> Control Center adapters -> snapshot coordinator -> server/UI;
- execution prompt -> handoff -> active task -> continuity -> project-state -> quality gate;
- package scripts -> gate definition -> inventory -> local/ci/clean runner.

Reject duplicate authority, silent fallback, stale-currentness acceptance and ambiguous machine truth.

### L6 process/DNS containment truth

Reproduce the current L6 boundary before claiming release completeness: browser speculative DNS remains outside L5; Bubblewrap currently reports relay incompatibility; authenticated OOPS remains disabled. Prefer an unprivileged/rootless L6 design and prove direct DNS/TCP/UDP escape denial separately from allowed synthetic proxy/relay flow. Never use root, privileged firewall/network administration, system-wide proxy/DNS/hosts mutation, TLS MITM or live external probes. If safe closure is not possible, preserve fail-closed routes and terminate full-completion certification as blocked.

Re-run the WebSocket containment smoke surface with retries disabled. The current network observer awaits `routeWebSocket`; stale retry rationale may not mask safety regressions. Deterministically qualify restricted-OOPS provenance/relay/privacy behavior in clean certification rather than silently skipping it when a local binary is absent.

### Skipped-test truth

Enumerate every skipped test by exact identity and guard. Give each one exactly one allowed disposition from the OpenSpec. No unexplained skip may remain in a COMPLETE result.

### Dependency/install/build reproducibility

Qualify root and nested UI package graphs, lockfiles, Node 20 assumptions, lifecycle scripts, fixture/legacy dependencies, generated outputs, clean UI build/test/typecheck/browser flow and independence from ambient/global state. Upgrade/remove packages only for demonstrated reasons, never version-churn for its own sake.

### Performance/resource sanity

Measure representative command wall time and peak RSS where practical. Hunt material repeated scans/parsing, process-spawn overhead, unbounded collections, lifecycle leaks and Control Center refresh amplification. Fix demonstrated regressions; avoid brittle microbenchmarks.

### Documentation/operator truth

Cross-check README, AGENTS, CURRENT_STATE, ROADMAP, ARCHITECTURE, SAFETY_MODEL, DECISIONS, OpenSpec, CLI/status outputs and machine state. Preserve history, but ensure current truth cannot be mistaken for obsolete phase state.

## Permanent constraints

- No DEV/NEXT/production contact without separate explicit authorization.
- No auth capture or credential use.
- No database/cloud/infrastructure/data-layer operations.
- No root or privileged firewall/network-administration operations; no system-wide proxy/DNS/hosts mutation or TLS MITM.
- No writes to sibling Alphaus repositories.
- No publication, external messaging, issue creation or evidence upload.
- No runtime AI authority.
- No self-development canonical promotion.
- No new proof family, selector or portfolio authority without fresh mechanical evidence and separate authorization.
- Preserve loopback/egress containment, redaction/privacy, private owner-only findings, source currentness, fail-closed ambiguity and all hardening guards.
- Never weaken tests/assertions/validators/proof thresholds to make the suite green.

## Required validation and release certification

At minimum, after repairs and before closure:

- clean dependency install on supported Node 20;
- `npm run typecheck`;
- Control Center UI typecheck/test/build/browser qualification;
- `npm run hardening:check`;
- `npm run handoff:check`;
- `npm run project:check`;
- `npm run quality-gate:spec`;
- `npm run gate:inventory`;
- `npm run test:semantic-compat`;
- `npm run test:owner-provenance`;
- `npm run campaign:synthetic`;
- every new focused regression;
- complete canonical Playwright suite serially;
- topology-correct isolated complete suite with exact pass/fail and skip-identity parity;
- `npm run gate:local`;
- `npm run gate:clean`;
- `git diff --check`, secret/debug/generated-output hygiene, clean worktree;
- representative local fixture, CLI and Control Center smoke journeys.

GitHub Actions: observe at most one exact-head run if available. CI certification requires real required steps to execute and pass. A zero-step billing/platform result remains external non-evidence; do not churn the workflow or retry-loop it.

## Terminal outcomes

Choose exactly one and support it with receipts:

- `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`
- `PROJECT_COMPLETE_AND_CI_CERTIFIED`
- `PROJECT_NOT_COMPLETE_BLOCKED`

A COMPLETE outcome is forbidden while any P0/P1 defect, blocking P2, unexplained skipped test, safety-critical retry masking, required local/clean gate failure, safety/privacy regression, false L6/process-isolation claim, or known release-blocking defect remains.

When terminal, update task state/plan/report, OpenSpec checklist, current project docs, this prompt and ACTIVE_TASK coherently. Preserve substantive implementation SHA roles across documentation-only closure. Commit validated checkpoints, push without force, and verify local HEAD == `origin/main`.

The objective is not to consume 12 hours artificially. The objective is to remain productive for up to roughly 12 hours if the repository justifies it, automatically progressing from audit -> repairs -> hardening -> regression hunting -> certification -> documentation truth -> final cleanup, and stopping only when further work is speculative, low-value, separately authorized, or externally blocked.

## Terminal execution disposition

This campaign reached terminal `PROJECT_NOT_COMPLETE_BLOCKED`. The repair
checkpoint `72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b` passed the available local
synthetic, UI, canonical and topology-correct isolated qualification, with
exact skip parity. Completion remains blocked because L6 process/DNS
containment is unproven: Bubblewrap's parent relay is incompatible and browser
speculative DNS remains outside L5. Authenticated OOPS therefore remains
fail-closed. A fresh owner authorization and safe rootless proof are required
before reopening this campaign; no real environment, product endpoint,
database, cloud/infrastructure system, sibling repository or credential may be
contacted.

The one exact-head Actions observation for pushed head
`9f0f2d7c267d12a2ddd14c50eb5b916f0e9fc0d9` was run `33139304292` / job
`98746329861`, which completed with `failure` and `steps=[]`. It is
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK` external non-evidence; no retry was made.
