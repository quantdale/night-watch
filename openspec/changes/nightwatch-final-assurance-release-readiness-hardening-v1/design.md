# Design — Final Assurance + Release-Readiness Hardening

## Execution model

Run this campaign as a dependency-ordered whole-system qualification, not as parallel speculative feature work. Independent read-only audit tracks may run in parallel, but one integrator owns severity, remediation, validation and final truth.

### H0 — takeover and literal tracked-file audit

Before implementation edits:

- reconcile `origin/main` without force and record exact HEAD/branch/origin;
- read `AGENTS.md`, current durable docs, active task, execution prompt and this OpenSpec completely;
- create a fresh continuity-v2 task directory for this campaign and route `ACTIVE_TASK` only when execution begins;
- transition the execution prompt from `READY_FOR_EXECUTION` to `IN_PROGRESS` according to handoff v1;
- enumerate `git ls-files -z`; read/hash every regular tracked path; require reviewed count == tracked count; classify every file by subsystem/role;
- record tracked bytes/line counts and safe aggregate digests only;
- scan for TODO/FIXME/HACK/XXX/DEPRECATED, skip/only/fixme tests, ts-ignore/expect-error/eslint-disable, shell/eval/dynamic execution, unbounded I/O/collections, secret-like data, unsafe paths/symlinks, duplicate authority, stale campaign IDs, dead exports, generated-output drift and ambient-state assumptions;
- record Node/npm/platform, Playwright enumeration, current gate inventory and clean working-tree state.

Any discrepancy from the previous 1,359-file literal audit is investigated rather than normalized away.

### H1 — architecture and authority map

Construct a current authority map covering:

1. environment selection -> browser -> proxy -> network safety -> evidence recorder;
2. source snapshot -> extraction/proof -> lifecycle -> eligibility -> campaign portfolio;
3. observation -> oracle -> candidate -> replay/minimization -> triage -> dossier -> private finding;
4. local artifacts/findings/source/campaign authorities -> Control Center adapters -> snapshot coordinator -> read-only server/UI;
5. planner prompt -> handoff checker -> active task -> continuity -> project-state -> quality gate;
6. package scripts -> gate definition -> inventory -> local/ci/clean runners.

For each chain, identify the single authoritative producer, consumers, validators, persisted boundaries, currentness semantics and failure behavior. Flag any duplicate selector, fallback authority, silent normalization, stale cache acceptance or unchecked current-looking field.

### H2 — release-critical behavior matrix

Trace and test representative end-to-end journeys without real product contact:

- local fixture scenario success and expected failure;
- outbound deny path, resolved-address/CONNECT/Upgrade boundaries and redaction;
- source scan/currentness/proof-gap/eligibility/campaign plan read-only flows;
- synthetic campaign admission -> reproduction -> minimization -> triage -> dossier;
- artifact corruption and private-finding stale/malformed/unknown-state handling;
- Control Center startup, snapshot refresh, SSE notification, selected-run stability, unavailable/stale/error states and graceful shutdown;
- planner READY -> IN_PROGRESS -> COMPLETE synthetic transition and invalid-route rejection;
- project-state malformed/unknown/duplicate/competing-authority rejection;
- local and clean gate dependency ordering and failure propagation.

Add missing failure-path tests only where the audit demonstrates a material gap.

### H3 — skipped-test and validation-gap census

Enumerate every current skipped test from Playwright and any nested test runner. For each record:

- exact file/test identity;
- guard/condition;
- why the guard exists;
- whether deterministic synthetic qualification can replace it;
- whether it is release-blocking.

Allowed dispositions:

- `LEGITIMATE_ENVIRONMENT_GUARD`
- `DETERMINISTIC_SUBSTITUTE_PRESENT`
- `OBSOLETE_REMOVE`
- `CAN_RUN_IN_CERTIFICATION`
- `BLOCKING_VALIDATION_GAP`

No unexplained skipped test may remain at terminal certification.

### H4 — dependency, install, build and packaging reproducibility

Audit both root and nested UI package graphs:

- package/lockfile agreement;
- supported Node baseline and any version-sensitive loaders;
- root vs nested TypeScript/toolchain duplication;
- lifecycle-script assumptions and `npm ci --ignore-scripts` compatibility;
- legacy/fixture-only dependency isolation;
- unused direct dependencies when mechanically provable;
- build outputs ignored/generated correctly;
- clean UI typecheck/test/build/browser qualification;
- absence of reliance on global npm packages, writable sibling repos, cached node_modules, host credentials or prebuilt assets.

Do not perform dependency upgrades solely because a newer version exists. Upgrade/remove only for a demonstrated security, compatibility, reproducibility or maintenance reason and requalify the full cone.

### H5 — performance and resource hardening

Benchmark a bounded representative set on the same machine before and after changes:

- `agent:check`
- `project:check`
- `hardening:check`
- `test:semantic-compat`
- `campaign:synthetic`
- `gate:local`
- Control Center snapshot/read refresh path with synthetic fixtures

Record wall time and peak RSS where available. Inspect repeated full-tree scans, repeated JSON/Markdown parsing, redundant gate executions, avoidable process spawning, unbounded arrays/maps/queues, timer/listener cleanup and Control Center refresh amplification. Fix only material regressions or unbounded behavior. Prefer algorithmic/boundedness fixes over micro-optimization.

### H6 — documentation and operator truth

Cross-check README, AGENTS, CURRENT_STATE, ROADMAP, ARCHITECTURE, SAFETY_MODEL, DECISIONS, current OpenSpec portfolio, CLI help/status output and machine-owned truth.

Requirements:

- current summaries cannot contradict machine state;
- historical phase sections are visibly historical;
- commands documented as authoritative actually exist and use current semantics;
- completion language distinguishes local/clean certification from external CI;
- no stale READY/IN_PROGRESS route remains after closure;
- no plan is duplicated as a second authority.

### H7 — repair loop

Severity:

- P0 Critical: safety escape, secret/private-evidence leak, destructive write, data loss, wrong-environment contact, release-blocking crash in a core local path.
- P1 High: incorrect authority/selection, core workflow failure, reproducibility failure, serious stale-truth acceptance, severe resource regression, missing required release validation.
- P2 Medium: justified maintainability/validation/performance/operator defects with real impact.
- P3 Low: nonessential cleanup; perform only when low-risk and directly adjacent.

For each P0-P2 record subsystem/files/problem/root cause/impact/remediation/dependencies/reproduction/regression/acceptance. Fix P0/P1 before unrelated work. After every repair rerun the narrow cone, then the affected compatibility cone.

### H8 — release certification

Required final matrix, where applicable:

1. clean dependency install from a fresh disposable clone under supported Node 20;
2. root typecheck;
3. Control Center UI typecheck, tests and build;
4. hardening checker;
5. handoff checker;
6. project-state checker;
7. quality-gate spec and inventory;
8. semantic compatibility;
9. owner provenance;
10. synthetic campaign;
11. focused regressions added by this campaign;
12. complete canonical Playwright suite serially;
13. topology-correct isolated complete suite with exact skip parity;
14. local unified gate;
15. clean Node20 unified gate;
16. `git diff --check`, secret/debug/generated-output hygiene and clean tree;
17. major CLI/control-center smoke journeys;
18. one exact-head GitHub Actions observation only if workflow execution is available.

External CI acceptance requires the required job to execute its actual steps and pass. `steps=[]` is external non-evidence.

## Exit rule

Stop only when all P0/P1 findings are closed, P2 release-impacting items are closed or explicitly accepted as non-blocking, all required local/clean gates pass, skipped tests have explicit dispositions, docs agree with machine truth, and remaining work is speculative/out-of-scope/externally blocked.
