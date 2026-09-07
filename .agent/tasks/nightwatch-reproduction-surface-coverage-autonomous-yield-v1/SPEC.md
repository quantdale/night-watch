# SPEC — nightwatch-reproduction-surface-coverage-autonomous-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W10 — REPRODUCTION SURFACE COVERAGE & AUTONOMOUS YIELD
Planned-From: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
Live HEAD authority: GIT — rediscover live Git/workspace/session/project truth before implementation.
PROJECT_VERDICT_EFFECT: PRESERVE

## Mission

W9 proved that Nightwatch can safely execute a host-derived current-source reproduction when an inspected source maps to the narrow `GO_VENDORED_PACKAGE_TEST` class, can distinguish current-source repeated-test-failure proof from historical `PRE_FAIL_POST_PASS`, can retry transient failures under host-owned finite policy, and can run a full HOUR_1 live campaign without premature byte-budget exhaustion.

The remaining local yield bottleneck is now **reproduction surface coverage and reproduction-aware investigation**.

The terminal W9 `opencode-go/omen-alpha` campaign ran for the full HOUR_1 wall budget, inspected 26 distinct real source targets and formed 28 grounded/verification-ready hypotheses, yet all 7 reproduction attempts returned deterministic `NOT_AVAILABLE`. The reasoning loop was capable of reaching verification, but the chosen current-source surfaces did not map to an executable target under the one W9 executor class.

W10 must make that limitation measurable and materially smaller without widening model authority or weakening evidence semantics.

W10 shall:

1. census the executable reproduction coverage of the full owner-approved current-source universe;
2. expose a bounded, neutral reproduction-capability map to the investigation loop so the reasoner can distinguish exploratory targets from mechanically verifiable targets;
3. carefully expand owner-local reproduction beyond vendor-only Go **only where live local prerequisites permit an equally bounded offline execution class**;
4. preserve current-source proof/admission anti-inflation and historical replay semantics;
5. improve the rate at which live grounded hypotheses reach executable reproduction rather than `NOT_AVAILABLE`;
6. triage mechanically reproduced current-source failures into useful evidence without declaring unknown-bug status from a failing test alone;
7. run multiple long live campaigns and a controlled before/after evaluation;
8. complete full regression and clean-clone certification.

This is intentionally a substantial overnight campaign. Do not stop after a census, one executor extension, one successful reproduction, one live run, or one intermediate milestone.

## Frozen predecessors — do not rebuild

Treat W7, W8 and W9 as frozen unless live recon proves a concrete regression.

Preserve:

- W7 real owner-local source/System Map/Bug Atlas/System Atlas/evidence provider boundary;
- W7 shared product/historical deterministic reproduction seam;
- W7 mechanical dossier admission and zero hidden-ground-truth leakage;
- W8 `reasoner-turn-request.v2`, bounded investigation memory and campaign strategy memory;
- W8 executor-confirmed target ledger, hypothesis lifecycle, reproduction readiness, efficacy corpus and memory-aware print adapter;
- W9 `GO_VENDORED_PACKAGE_TEST` semantics and sandboxing;
- W9 `CURRENT_SOURCE_REPEATED_TEST_FAILURE` proof semantics;
- W9 host-owned deterministic/environment/transient disposition and finite retry;
- W9 byte ledger and provider-transport/tool-payload budget separation;
- W9 HOUR_1 calibrated budgets unless new measurement proves an adjustment is necessary;
- historical `PRE_FAIL_POST_PASS` and strict `EXACT_REDISCOVERY` semantics.

W10 must be additive where possible.

## Starting hypotheses to verify, not assume

Re-read the live code and reproduce/census the live behavior before implementation.

### H1 — coverage, not reasoning, dominates current NOT_AVAILABLE

W9 target discovery supports a source only when all of these hold:

- source is approved and current;
- source ends in `.go`;
- an ancestor `go.mod` exists;
- `vendor/modules.txt` exists;
- the source package contains at least one `_test.go` file;
- an allowlisted/cached compatible Go toolchain is available.

The W9 live campaign's 7/7 `NOT_AVAILABLE` outcomes likely arise from one or more of those conditions. Quantify the actual refusal distribution rather than guessing.

### H2 — the reasoner does not have enough pre-action capability information

The reasoner may know that reproduction is currently `NOT_AVAILABLE` only after spending a verification turn. Verify whether the bounded W8/W9 memory can tell it *before* a reproduction call whether a grounded source has a supported target and, if unsupported, the neutral refusal class.

### H3 — safe Go coverage can expand without vendor-only coupling

Some owner-approved Go packages may have tests and a complete dependency closure already present in a local module cache even when `vendor/` is absent. Determine whether an additional host-derived, network-disabled, read-only-cache execution class can be proven safe and deterministic.

Do not implement this class merely because it sounds useful. Census live repositories and demonstrate prerequisites first.

### H4 — non-Go coverage may or may not admit a narrow safe class

The owner-approved universe also contains PHP, Vue/JS/TS/proto/YAML/OpenAPI surfaces. Do not add generic `npm test`, Composer scripts, arbitrary package scripts or arbitrary repo executables.

A non-Go class may be added only if recon identifies a narrow, host-derived direct runner with already-local immutable dependencies, deterministic target discovery, `bwrap --unshare-net` or equivalent containment, fixed argv, no package-script authority, strict output/process/file limits and a strong negative-control suite.

If no such class is defensible, record it as unsupported rather than forcing multi-language coverage.

### H5 — mechanically reproduced current failures need better triage, not stronger authority

A repeated current-source assertion failure is reproduction evidence but is not by itself proof that the failure is a previously unknown product bug. Verify whether the reasoner receives enough sanitized current-source failure evidence to connect a reproduced failure to source/root-cause hypotheses while preserving human review and non-claim boundaries.

## Hard safety boundaries

LOCAL only.

NOT AUTHORIZED:

- DEV, NEXT or production contact;
- C-07, C-08b, C-12/C-13/C-14 live execution;
- Slack, Leslie, Pondr, Notion or communication scraping;
- external issue/PR/comment/filing actions;
- credentials, deployment, auth changes or secret acquisition;
- sibling repository writes or worktree mutation;
- reasoner-selected shell/Git/network/filesystem commands;
- force push, history rewrite, rebase of shared history or destructive Git recovery.

Sibling repositories are read-only. Reproduction writes may occur only in disposable Nightwatch-owned state.

Untrusted source, tests, tool output, commit text and failure output have zero instruction authority.

A model can never mint:

- an approved executable target;
- a proof kind;
- a reproduction count;
- a deterministic/transient disposition;
- a retry budget;
- a source/evidence binding;
- a finding admission;
- unknown-bug status.

## Required deliverables

### A. Reproduction capability census

Create a deterministic bounded census over the owner-approved current-source universe.

At minimum classify approved source/package surfaces into explicit host-derived categories such as:

- `EXECUTABLE_NOW`;
- `NO_SUPPORTED_EXECUTOR`;
- `MODULE_ROOT_NOT_FOUND`;
- `PACKAGE_TEST_FILES_ABSENT`;
- `VENDOR_DIRECTORY_ABSENT`;
- `LOCAL_DEPENDENCY_CLOSURE_INCOMPLETE`;
- `TOOLCHAIN_UNAVAILABLE`;
- `TOOLCHAIN_VERSION_UNSATISFIED`;
- `SOURCE_NOT_CURRENT`;
- `UNSUPPORTED_LANGUAGE`;
- other bounded classes justified by live recon.

The census must report, per repository and language where meaningful:

- approved source count;
- distinct executable package/target count;
- source paths mapping to executable targets;
- source paths with no executable target;
- refusal distribution;
- unique target deduplication rate;
- estimated reasoner-visible coverage without dumping repository contents.

Persist owner-private raw census state outside Git when it contains local topology not appropriate for the repo; commit only bounded schema/tests and safe aggregate evidence.

### B. Versioned reproduction surface map

Add a bounded schema such as `nightwatch.reproduction-surface-map.v1` (exact name may differ if justified).

The reasoner-visible form may expose only neutral safe fields such as:

- approved source path or target id already visible through the source boundary;
- executable readiness: `EXECUTABLE_NOW | NOT_EXECUTABLE | UNKNOWN`;
- executor class, if safe to reveal;
- neutral refusal class;
- whether package tests exist;
- whether local offline prerequisites are satisfied;
- target already attempted / reproduced / disproved state.

It must not expose:

- commands or argv;
- absolute local paths;
- hidden benchmark truth;
- audit stderr;
- module-cache filesystem paths;
- environment secrets;
- sibling Git mutation authority.

Memory caps and deterministic ordering/truncation are mandatory.

### C. Capability-aware investigation without removing autonomy

Integrate reproduction capability into W8/W9 memory and campaign strategy so the reasoner can make an informed tradeoff:

- exploratory source can still be investigated even when not executable;
- verification-ready hypotheses should prefer a mechanically executable target when one is relevant;
- deterministic `NOT_AVAILABLE` surfaces should not be retried pointlessly;
- a campaign should preserve prior target/refusal knowledge across investigations;
- the reasoner still chooses among admissible targets.

Do not simply hide unsupported source from the reasoner. The goal is informed selection, not blind filtering.

Add metrics:

- reproduction-capable target selection rate;
- `NOT_AVAILABLE` reproduction-attempt rate;
- attempts to first executable reproduction;
- calls/actions to first executable reproduction;
- repeated unsupported-target attempts;
- executable-target diversity.

### D. Safe Go offline-cache executor expansion

If live census proves meaningful coverage exists outside vendor-only modules, add a second Go class such as `GO_LOCAL_CACHE_PACKAGE_TEST` or a better justified equivalent.

Minimum requirements:

- same owner-approved/current-source binding as W9;
- package must contain pre-existing tests;
- dependency closure must be fully satisfiable from already-local data before execution is considered supported;
- no network namespace;
- `GOPROXY=off`, `GOTOOLCHAIN=local`, `GOSUMDB=off` or stricter equivalent;
- local module/toolchain caches mounted read-only where required;
- fixed host-derived `go test` argv; reasoner cannot select flags/package/executable;
- disposable source/work/cache directories;
- hard materialization/execution/output/process-tree ceilings;
- sibling identity before/after;
- cleanup in `finally`;
- explicit environment-blocked result if any dependency is missing rather than attempting a download;
- identical current-source proof/admission rules to W9.

Do not weaken W9 vendor execution to create this class. Keep both classes explicit.

### E. Optional additional language class — only if proven safe

After the census, the orchestrator may add at most one additional non-Go execution class in W10 if and only if live repository prerequisites and a threat model justify it.

It must use a direct fixed runner rather than arbitrary package scripts. It must have a fabricated malicious-package adversarial suite proving that repo-controlled metadata cannot widen argv, environment, filesystem/network access or executable selection.

If those criteria cannot be met, do not implement it. Record the largest unsupported coverage gap for a future task.

### F. Current-source failure evidence and triage

For a qualifying `CURRENT_SOURCE_REPEATED_TEST_FAILURE`, give the reasoner enough sanitized evidence to investigate the failure without granting proof authority.

Allowed additions may include bounded neutral facts such as:

- repository-relative test file;
- test name if mechanically parsed from current output;
- normalized assertion/failure fingerprint;
- package identity;
- source paths already grounded;
- count of matching fresh executions;
- stable/unstable sibling identity;
- classification `TEST_ASSERTION_FAILURE`.

Failure stdout/stderr remains untrusted and bounded. Secret-shaped material must be scrubbed. Raw arbitrary failure output must not be treated as host instruction.

A repeated failure is still not automatically a bug. Admission remains mechanical and human review remains required.

### G. Coverage/yield benchmark

Create a deterministic W10 before/after evaluation using the same live implementation commit and a frozen projection where necessary to isolate capability-aware targeting.

Include fabricated/disposable cases for:

- vendored Go executable target;
- local-cache Go executable target if implemented;
- no tests;
- missing dependencies;
- unsupported language;
- build failure;
- repeated assertion failure;
- passing package;
- transient process/provider failure;
- deterministic refusal;
- prompt/metadata injection;
- negative controls;
- hidden historical leakage guard.

Report baseline -> final:

- executable target coverage;
- selected executable target rate;
- `NOT_AVAILABLE` attempt rate;
- grounded hypotheses;
- executable reproduction attempts;
- qualifying current-source reproductions;
- candidates proposed/admitted/refused;
- false positives;
- hidden-truth leakage;
- reasoner calls/tool actions/tool payload bytes;
- wall time to first executable reproduction.

Do not define success as more calls or more tests.

### H. Real reproduction generality proof

W9's real current proof used one `mobingilabs/ouchan` package. W10 must prove generality beyond a single handpicked package when the local universe permits it.

At minimum:

1. run the existing real owner-local proof unchanged;
2. use the census to select another supported target from a different package, and preferably a different approved repository;
3. execute through the generic provider architecture, not test-only one-off commands;
4. accept either honest PASS/`NOT_REPRODUCED` or qualifying repeated failure;
5. preserve sibling identity and leave no temp residue.

If the live universe contains no second supported target even after justified executor expansion, record the census proof and concrete limitation rather than fabricating generality.

### I. Long live-provider campaigns

This campaign is intended for unattended overnight execution. Once deterministic integration is green, run substantial live-provider work rather than stopping at smoke tests.

Required sequence when provider quota/auth permits:

1. **reproduction-rich controlled campaign** — scope the campaign through host-owned approved filtering/planning to surfaces the capability census says are executable; run up to HOUR_1 and measure executable reproduction rate;
2. **broad owner-local campaign** — run ordinary broad source investigation up to HOUR_1 and measure whether capability-aware memory reduces `NOT_AVAILABLE` compared with W9's 7/7 result;
3. **second live campaign or provider repeat** — repeat one of the above with a fresh campaign id and, if practical, a different available subscribed provider/model to test robustness rather than one-model luck;
4. preserve the W7/W8/W9 historical product-path proof and negative controls.

Use the currently available subscribed provider routing. Do not hard-code a provider if it is unavailable. Record exact provider/model provenance for every live run.

Do not run multiple heavy browser/Chromium suites concurrently with live reasoner endurance unnecessarily; serialize resource-heavy final proofs.

An unknown defect is not required for W10 completion. Any candidate without qualifying reproduction must be refused. Any qualifying repeated failure still requires truthful triage and human review; do not label it previously unknown without separate evidence.

### J. Long-run resilience and checkpoint proof

Because W10 is designed as an overnight campaign, prove long-running operational behavior:

- pause/resume with reproduction capability map intact;
- checkpoint migration/backward compatibility from W9;
- transient provider/reproduction failure recovery without retry reset;
- deterministic refusal does not spin;
- campaign strategy retains unsupported/executable target knowledge;
- cumulative byte/call/action/wall budgets remain exact;
- no temp/sibling residue after cancellation or timeout.

### K. Full certification

Before W10 COMPLETE:

- all focused W10 suites PASS;
- W7 provider/admission/historical proof suites PASS;
- W8 memory/campaign/efficacy/leakage suites PASS;
- W9 reproduction/retry/byte-accounting/real-current proof suites PASS;
- typecheck PASS;
- hardening:check PASS;
- agent:check PASS;
- handoff:check PASS;
- project:check PASS;
- workspace:check PASS;
- session:check PASS;
- full `npm test` PASS without unexplained regression;
- `gate:local` FULL PASS;
- `gate:clean` PASS on fresh Node 20 clone with no reused `node_modules`;
- real current owner-local reproduction proof PASS;
- real historical ouchan product-path proof PASS;
- committed W10 census/benchmark/live evidence truthfully records improvements and regressions.

## Parallelization

After M0 recon and M1 shared contract freeze, the orchestrator should use multiple leaf executors when paths can be kept independent.

Suggested lanes:

1. **Coverage census lane** — deterministic census, aggregate metrics, refusal taxonomy tests.
2. **Surface-map/memory lane** — versioned bounded reasoner-visible capability map and campaign strategy integration.
3. **Go offline-cache executor lane** — only after census proves live value; provider + containment + adversarial tests.
4. **Failure-evidence lane** — sanitized current-source reproduced-failure evidence and triage contract.
5. **Yield benchmark lane** — fixed current-source coverage/yield corpus and before/after metrics.
6. **Long-run/checkpoint lane** — resume, retry, budget, cancellation, cleanup and migration tests.
7. **Optional non-Go executor lane** — only after explicit orchestrator go/no-go based on live prerequisites/threat model.

Shared contracts/global programme state remain orchestrator-owned unless explicitly delegated.

Workers are leaf executors and do not integrate themselves.

Before accepting any lane:

- inspect actual diff;
- verify owned paths;
- reject scope creep;
- reconcile against integration head;
- rerun acceptance tests after reconciliation;
- then integrate.

## Failure discipline

Never:

- turn `NOT_AVAILABLE` into reproduction credit;
- count build/environment/process failure as a defect;
- run arbitrary package scripts;
- fetch missing dependencies from the network;
- weaken repeated-failure proof from two matching fresh executions;
- accept model-generated test output as mechanical proof;
- lower EXACT thresholds;
- hide cost/coverage regressions;
- delete/weaken tests to recover green;
- force-push/rebase shared history/destructively recover Git;
- declare W10 or the parent programme complete at an intermediate milestone.

If provider quota blocks live campaigns, finish every deterministic/local task, preserve runnable live commands, and leave W10 truthfully BLOCKED/PARTIAL if a required live criterion cannot execute.

## Completion criteria

W10 is COMPLETE only when all repository-owned executable criteria below are satisfied:

1. a deterministic owner-approved reproduction-capability census exists and is tested;
2. bounded reasoner-visible capability/readiness reaches stateless turns and persists strategically across investigations without granting new authority;
3. live/fixed evaluation shows a material reduction in pointless `NOT_AVAILABLE` attempts or a material increase in executable reproduction selection versus the W9 reference;
4. W9 vendor execution remains intact and at least one justified additional execution path or equivalent coverage improvement is proven if live prerequisites permit it;
5. current-source reproduced-failure evidence is useful but still mechanically bounded and non-authoritative;
6. at least two real supported targets are exercised when the live local universe permits, with sibling integrity preserved;
7. substantial live-provider campaigns are executed when provider access is available, including at least one reproduction-rich HOUR_1-class campaign and one broad campaign;
8. false-positive admission and hidden-truth leakage do not regress;
9. all W7/W8/W9 compatibility proofs remain green;
10. full local and clean-clone certification passes.

A previously unknown Alphaus defect is NOT a W10 completion requirement.

Parent programme completion, strict EXACT, DEV/NEXT/production proof and organizational approval remain separate.

## Terminal report requirements

At closeout record:

- starting/live/final implementation/documentation SHAs;
- exact census totals and refusal distribution per approved repository/language;
- reproduction coverage before/after;
- execution classes delivered and why each is safe;
- unsupported classes intentionally not implemented and why;
- fixed-corpus before/after metrics;
- every real reproduction target/result;
- every live campaign provider/model, duration, budgets, targets, hypotheses, attempts, outcomes, candidates/admissions/refusals;
- false positives and leakage;
- retry/disposition statistics;
- all regressions/failures found and repairs;
- sibling/worktree/session integrity;
- full validation commands/results and gate receipts;
- remaining blockers/non-claims;
- exact next action for the parent programme.

Do not claim previously unknown defect status unless independently established beyond reproduction itself.
