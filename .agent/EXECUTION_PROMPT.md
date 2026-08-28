# EXECUTION PROMPT — Final Completion and L6 Containment

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-final-completion-and-l6-containment-v1
OpenSpec: openspec/changes/nightwatch-final-completion-and-l6-containment-v1/
Planned-From: 6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20
Target Branch: main
Predecessor Task ID: nightwatch-final-assurance-release-readiness-hardening-v1
Predecessor Status: BLOCKED

## Mission

Execute the OpenSpec change `nightwatch-final-completion-and-l6-containment-v1`
end-to-end as a fresh whole-system completion campaign. Re-audit the live
repository, prove or safely falsify rootless L6 process/network containment,
repair all evidence-backed release defects, and finish with one truthful
terminal outcome.

This is not permission to expand product scope. It is permission to determine
whether the known L6 blocker can be closed safely under the existing owner
policy, while finding and repairing any current release-critical defects.

Work autonomously through the full campaign. Do not stop after the first green test or first repair. Continue through whole-repository audit, authority tracing, validation-gap analysis, dependency/install/build qualification, performance/resource review, documentation truth, full regression and release certification. Stop only for a genuine safety/authorization boundary, an unrecoverable remote-divergence conflict, a concrete external blocker required for completion, or terminal certification.

## Mandatory takeover

Before implementation edits:

1. Confirm repository root, `origin`, branch, live HEAD, Node/npm and clean
   status; fetch/reconcile `origin/main` without force.
2. Read the repository contract, agent memory, predecessor and successor task
   records, current-facing docs, packages, gates, workflows and OpenSpec.
3. Run the fresh NUL-safe every-tracked-path audit before runtime edits.
4. Reproduce and implement/prove the rootless L6 design only with synthetic
   loopback targets; preserve fail-closed authenticated OOPS if proof fails.
5. Execute the full local/clean/UI/campaign/adversarial release matrix and
   synchronize current truth before terminal closure.

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

The campaign decision is **Combined Implementation + Hardening**, tightly
bounded to release-critical evidence and the documented L6 residual. It does
not authorize broad product expansion.

Do not reopen source-proof, portfolio, DEV, self-development, infrastructure, publication, or other product scope simply to fill time. If the whole-system audit finds a P0/P1 implementation defect, fix it immediately and add a regression. If no significant defect exists, continue through final assurance/certification and stop without manufacturing work.

Priority order:

1. P0 safety/privacy/destructive/release-blocking failures.
2. P1 correctness/authority/core-workflow/reproducibility failures.
3. P2 validation, dependency/toolchain, performance/resource, operator and documentation-truth defects with demonstrated impact.
4. P3 cleanup only when directly adjacent, low-risk and evidence-backed.

## Required workstreams

Execute every successor OpenSpec milestone. In particular:

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

Reproduce the current L6 boundary before claiming release completeness. The
successor implementation uses an unprivileged Bubblewrap network namespace
with no external interface, a minimal read-only root view, an inherited
AF_UNIX control protocol, a namespace-local bounded proxy, and a process-group
supervisor. Its qualification separately proves direct DNS/TCP/UDP/HTTP/HTTPS
denial, IPv6/mapped-address denial, descendant denial, synthetic HTTP and
WebSocket relay flow, browser speculative/background traffic containment and
parent-death cleanup. Authenticated OOPS is permitted only after a fresh
`READY` capability check and fails closed if any dimension is unavailable.
Never use root, privileged firewall/network administration, system-wide
proxy/DNS/hosts mutation, TLS MITM or live external probes. If the current
host cannot reproduce the complete proof, retain the fail-closed state and
terminate certification as blocked.

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

## Terminal disposition

This prompt is COMPLETE for the successor campaign. The prior blocked result
remains historical evidence, not a current completion claim. The terminal
state is `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` at release checkpoint
`2576c5751d33bb40046246e8fcf57c7cc5c30a57`; substantive implementation is
`e278da19f5fbc62107528033716f271cbb64e1de`. Local/clean gates, canonical and
topology-correct isolated suites, UI and adversarial proofs are green. Exact
Actions run `33190456115` / job `98914301082` matched the release checkpoint
but executed zero steps with no runner, so it is external non-evidence and
not CI certification.
