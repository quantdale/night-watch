# Nightwatch Executor Campaign — Source-Analysis Runtime Hardening + Proof-Identity Preservation

Status: ACTIVE
Planned-From: `910ff0f65aaf966aae20e4c72fe8b695e66038e4`
Target-Branch: `main`
Campaign-Class: `IMPLEMENTATION_AND_SYSTEMIC_HARDENING`
Campaign-ID: `nightwatch-source-analysis-runtime-hardening-v1`
Authorization-Class: `NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY`
Execution-Budget: `12 HOURS`
OpenSpec-Change: `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/`

## Mission

Execute the next evidence-backed Nightwatch campaign as a 12-hour local/source/synthetic hardening run. Do not invent a Phase 29 and do not broaden product authority. The campaign exists to remove duplicated TypeScript runtime-loader work and redundant source-analysis work while proving that Nightwatch's source-derived evidence, digests, contracts, eligibility decisions, safety boundaries, and fail-closed behavior remain exactly equivalent for identical inputs.

The previous repository-wide systemic optimization is terminal and MUST NOT be resumed. Its report explicitly deferred two successor candidates: (1) consolidation of the TypeScript `require.extensions[".ts"]` transpile hook duplicated across ~20 hardened bin entrypoints, and (2) per-file source-analysis/read reuse where 127 handler operations currently map to only ~26 unique handler files. This campaign is the fresh authorization for those candidates, subject to the proof bar below.

## Read these first

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/SAFETY_MODEL.md`
4. `docs/DECISIONS.md`
5. `docs/ROADMAP.md`
6. `docs/ARCHITECTURE.md`
7. `.agent/ACTIVE_TASK.md`
8. `.agent/tasks/nightwatch-repository-wide-systemic-optimization-v1/{SPEC,PLAN,STATE,REPORT}.md`
9. This file
10. `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/{proposal,design,tasks,audit}.md`
11. `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/specs/source-analysis-runtime-hardening/spec.md`

Repository rules are authoritative over this prompt. If live Git or tests contradict this plan, preserve the stronger evidence and update the plan rather than forcing the implementation to match stale assumptions.

## Mandatory startup and native continuity

Before implementation:

- Pull/fetch and prove the working tree is clean and `HEAD == origin/main`. If `origin/main` advanced beyond `Planned-From`, inspect every intervening diff and reconcile this campaign before editing.
- Confirm the completed optimization task remains terminal; never mutate its final records into an in-progress task.
- Create and activate a fresh native task at `.agent/tasks/nightwatch-source-analysis-runtime-hardening-v1/` with `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`, using continuity protocol v2 and this OpenSpec change as the frozen planning source. Update `.agent/ACTIVE_TASK.md` only after the new task files are internally coherent.
- Run baseline continuity/project checks before source edits.
- Do not contact DEV/NEXT/production, authenticate, inspect owner-only findings, query data stores, perform cloud/infrastructure archaeology, modify sibling Alphaus repositories, publish findings, invoke runtime AI, or exercise self-development promotion authority.

## Twelve-hour execution discipline

Treat `12 HOURS` as the intended engineering budget, not as permission to idle. Do not stop after the first green patch. Use remaining productive time for literal repository review, differential proof, adversarial testing, clean-checkout reproduction, performance remeasurement, and documentation. If all acceptance criteria are genuinely complete before the budget is exhausted, use the remaining useful budget to search for regressions and hidden coupling inside this campaign's boundaries; do not manufacture scope or wait artificially.

Suggested allocation:

- H0–H1.5 — bootstrap, literal all-file audit, fresh baselines, exact command/output inventory.
- H1.5–H4 — centralize and harden the duplicated TypeScript runtime loader; per-entrypoint parity.
- H4–H7 — bounded source-read/analyzer work reuse; exact digest/output differential harness.
- H7–H9 — adversarial invalidation, stale/currentness, error/fallback, privacy, ordering, and concurrency tests.
- H9–H10.5 — performance/RSS remeasurement and focused dependency-cone suites.
- H10.5–H12 — full local/clean gates, continuity/docs, commit/push, exact-head Actions observation and final report.

Checkpoint `STATE.md` after each major milestone and before changing subproblems.

## Workstream 1 — literal all-tracked-file audit

This is mandatory and is not satisfied by search alone.

- Generate the authoritative tracked-file list with `git ls-files -z` (and a deterministic sorted text view for the session).
- Inspect every tracked file. Classify every path into executable source, bin/CLI, test, fixture/corpus, config/workflow, UI, scenario, agent/tooling, or durable docs.
- For generated/historical data, verify role, authority and coupling rather than pretending every line is hand-authored logic.
- Record a sanitized execution audit summary in the native task REPORT/STATE. Never persist raw sibling source, credentials, customer values, owner-only findings, arbitrary private paths, or machine-specific secrets.
- Specifically reconcile: all bin entrypoints using TS runtime transpilation; all direct `readFile`/source-analysis paths; all analyzer/evidence-digest constructors; cache/currentness identities; all callers of `discoverSourceSurfaces`; source/eligibility/review/Control Center projections; gate manifests; and regression tests.
- Search for TODO/FIXME/HACK markers, dead adapters, duplicate compatibility paths, stale comments/docs, unsafe fallbacks, and hidden authority expansion. A zero-result search is evidence only for that search, not proof the repository has no debt.

## Workstream 2 — TypeScript runtime-loader consolidation

Baseline first. Enumerate every bin script that installs a `.ts` require hook or performs equivalent `typescript.transpileModule` work. Measure representative cold/warm CLI costs and capture byte-for-byte stdout/stderr/exit-code behavior.

Implement one repository-owned loader utility only if it can preserve all existing semantics:

- same TypeScript version;
- same compiler target/module/moduleResolution/esModuleInterop/skipLibCheck behavior per caller, unless a differential test proves a caller intentionally differs;
- same module resolution and exception behavior;
- same restoration of any pre-existing `.ts` hook;
- no global hook leakage after the bounded load;
- no arbitrary filesystem or process authority;
- no cache of pass/fail verdicts.

A content-addressed transpile cache is allowed only for pure compiler derivatives and only with complete invalidation over TypeScript version + compiler options + exact source bytes + any other load-bearing input. Prefer process-local memory first. If a disk derivative cache is justified, keep it under an already ignored derivative-cache boundary such as `node_modules/.cache`, write atomically, and prove an interrupted/stale cache cannot change behavior. This permission does NOT authorize a disk-backed source-surface/evidence cache.

Migrate entrypoints incrementally and validate each group. If one entrypoint has genuinely different semantics, preserve it explicitly rather than forcing false uniformity.

## Workstream 3 — source-read and analyzer work reuse

Start with the safest redundant work: repeated exact-source reads inside one `discoverSourceSurfaces` / integration invocation. Introduce only call-scoped, exact-snapshot reuse whose identity includes enough authority to prevent stale cross-source reuse (at minimum repository identity, source SHA, relative path and current content identity where available).

Then investigate per-file shared analyzer work. The admission bar is deliberately higher because analyzer observations feed evidence identities:

- Do not cache final eligibility/pass/fail verdicts.
- Do not change analyzer IDs, analyzer versions, response-flow versions, observation ordering, rejection taxonomy, source-currentness semantics, contract identities, or digest canonicalization merely to gain speed.
- Keep source text ephemeral; no raw source in returned DTOs, task files, Git artifacts or durable caches.
- If sharing a parsed/tokenized representation across symbols, key it to exact source bytes/currentness and keep symbol/hint-specific analysis separate.
- Preserve bounded budgets and fail-closed behavior. Cache miss, cache corruption or inability to establish identity must fall back to the authoritative uncached path or fail closed; it must never create a proof.

If the analyzer refactor cannot prove parity, stop at read reuse and document why the deeper optimization was rejected.

## Workstream 4 — differential proof harness

Before changing the analyzer/source path, capture a baseline from the exact same source snapshot. After each candidate implementation, compare the complete safe observable surface, not just test counts.

For identical inputs, require equality of at least:

- source inventory counters and snapshot identity;
- operations/surfaces and their deterministic ordering;
- route/request/response proof states;
- analyzer IDs/versions/statuses/rejection codes/rejection families;
- every analyzer `evidenceDigest`;
- response-flow proof identities;
- response contract IDs and response evidence digests;
- semantic contract IDs;
- source gap taxonomy and eligibility/readonly census digests;
- Phase 24 inputs, eligible/excluded counts and reasons;
- review queue/explain projections;
- CLI JSON output bytes where existing contracts make byte stability authoritative.

ANY unexplained same-input identity drift (`ev:sha256`, response/semantic ID, deterministic digest, census digest, ordering or verdict) is a hard stop. Roll back the optimization unless the drift exposes a reproduced correctness defect; a correctness change then requires explicit documentation, versioning where the contract requires it, focused adversarial proof and separate authorization if it expands authority.

## Workstream 5 — adversarial hardening

Add focused tests for the new mechanics:

- same path under different repo/source SHA/content must never alias;
- content change invalidates reuse even if mtime is unchanged;
- mtime-only change does not matter where content identity is authoritative;
- duplicate handler operations sharing one file retain symbol-specific results;
- malformed/oversized/privacy-sentinel source remains rejected;
- source unavailable/stale/ambiguous states never become proof through cache reuse;
- exception paths restore hooks/locks and leave no poisoned cache entry;
- concurrent or nested loader use either has proven deterministic semantics or is explicitly serialized/fail-closed;
- cold and warm runs produce identical stdout/stderr/exit status and public DTO/digest surfaces;
- fallback paths preserve the legacy result, not merely successful execution.

Do not weaken existing assertions or skip tests to obtain green.

## Workstream 6 — architecture/hygiene review without scope inflation

The planner census identified several large files (`src/core/campaign/orchestrator.ts`, `src/core/source/surfaces.ts`, `src/core/semanticCoverage/sourceAnalyzers.ts`, `bin/hardening-check.mjs`, `ui/control-center/src/App.tsx`) and many phase-specific Playwright configs. Treat these as review targets, not automatic refactor targets. Split/restructure only if this campaign reproduces a correctness, performance, ownership or testability defect and the change can be proven within the same safety boundary. Historical docs/corpus are intentional evidence; do not compact history for aesthetics.

## Workstream 7 — validation and CI truth

Run the narrowest focused tests after each change, then the repository-owned acceptance cone. At minimum, if still current:

- `npm run typecheck`
- `npm run hardening:check`
- `npm run project:check`
- `npm run agent:check`
- `npm run agent:audit`
- focused loader/source/analyzer/eligibility/response-flow tests
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run test:semantic-compat`
- `npm run gate:local`
- the Node20 clean gate used by current repository policy
- canonical/topology-correct isolated parity when required by the affected source-analysis cone

Record before/after wall time and peak RSS with the same methodology and report variance honestly. Performance improvement is not accepted if verification strength or output identity weakens.

GitHub Actions is currently known to fail before runner steps because of an external billing/spending-limit/platform condition. At final pushed HEAD, observe the exact-head run once. If the job again has zero/null steps, record `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` (or the repository's current equivalent), do not call it green, do not treat it as a code failure, and do not churn workflow code or repeatedly retry. If steps actually execute, require the real result.

## Completion gates

The campaign is complete only when all of the following are true:

1. Every tracked file was included in the local all-file audit and the relevant execution paths were deeply reviewed.
2. The TS-loader duplication is either consolidated with per-entrypoint differential proof or explicitly rejected with measured evidence.
3. Safe source-read/analyzer reuse is implemented where admitted; any deeper candidate that cannot preserve proof identity is rejected rather than forced.
4. Same-input safe outputs and cryptographic/deterministic identities are unchanged unless a separately justified correctness defect was proven and handled under the proper version/authority rules.
5. New cache/hook/fallback mechanics have adversarial regression protection.
6. Measured runtime/RSS evidence demonstrates the outcome honestly; no benchmark-only hacks.
7. Required local/clean gates are green and exact test counts/results are recorded.
8. Native continuity v2 task records are complete, docs are reconciled only where truth changed, and the tree is clean.
9. Commit/push uses normal fast-forward Git policy; never force-push. Verify local `HEAD == origin/main` after push.
10. Exact-head Actions truth is recorded without overstating externally blocked CI.

## Final report requirements

The task REPORT must contain: executive summary; exhaustive audit scope and file-count manifest; bottlenecks with evidence; implementation decisions; files/subsystems changed; before/after timings and RSS; full parity/digest proof results; adversarial tests; validation ledger; regressions fixed; candidates rejected and why; remaining risks; deferred opportunities; final Git anchors; exact-head CI observation; and an explicit statement that no forbidden product/data/infra/auth/publication authority was used.
