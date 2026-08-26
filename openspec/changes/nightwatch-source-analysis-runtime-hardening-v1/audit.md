# Planner Deep Audit — Nightwatch Next Campaign Selection

## Audit basis

Planning baseline: `main` at `910ff0f65aaf966aae20e4c72fe8b695e66038e4`.

This planner pass used the live recursive Git trees to inventory the repository and then deep-read the load-bearing task continuity, workflow, package scripts, roadmap/current campaign lineage, operator runtime-loader path, source-surface join/evidence path and syntax-aware analyzer path. The connector can inventory every tracked path but large recursive trees/files are response-bounded, so this planning document does NOT falsely claim every byte of every large file was rendered into the planner context. The executor's first milestone therefore requires a literal local `git ls-files` content sweep of every tracked file before implementation.

## Repository map reviewed

The tracked root contains:

- `.agent/` — native continuity, planner/executor prompts and a large historical task ledger.
- `.agents/`, `.claude/`, `.opencode/`, `.kimi-code/` — goal/agent integration shims.
- `.github/workflows/hardening.yml` — one intentionally minimal offline authoritative hardening job.
- `bin/` — many operator/phase/quality-gate entrypoints, including large continuity/hardening scripts and repeated TS runtime-loader mechanics.
- `config/` — environment metadata plus versioned quality/semantic compatibility contracts.
- `corpus/` — deterministic historical/synthetic proof fixtures across many phases.
- `docs/` — very large architecture/state/decision/roadmap/safety ledgers and phase design records.
- `scenarios/` — bounded local ripple smoke scenario.
- `src/` — browser/auth/control-center/core/source/semantic/triage/proxy/state/product logic.
- `tests/` — browser, manual, smoke, fixtures and a large unit/compatibility corpus.
- `ui/control-center/` — React/Vite local control-center app and tests.
- multiple Playwright configs for bounded historical/contained modes.
- `artifacts/` — tracked placeholder only; runtime artifacts are not committed here.

## Established project truth

1. Nightwatch is private and read-only-by-default. Infrastructure/data-layer archaeology, product mutation, publication and owner-only finding movement remain out of scope by owner policy.
2. Long-running work uses native `.agent/tasks/<id>/{SPEC,PLAN,STATE,REPORT}.md` continuity v2; completed tasks are historical and must not be reopened.
3. The latest active-task record is terminal: `nightwatch-repository-wide-systemic-optimization-v1` is COMPLETE. It explicitly instructs a successor to start fresh.
4. The current `.agent/EXECUTION_PROMPT.md` before this planning commit pointed at an older already-finished read-only eligibility campaign, so replacing that stale executor routing is necessary.
5. Recent roadmap campaigns repeatedly rejected speculative proof/authority expansion when current source could not mechanically justify it. The next campaign should likewise be evidence-driven rather than named Phase 29 by default.

## Latest completed systemic optimization

The immediately preceding optimization measured and repaired major validation-loop costs while preserving exact gate counts:

- continuity checker Git process storm: ~880 Git spawns/run reduced to ~64;
- `agent:check`: ~8.4s → ~1.03s;
- `agent:audit`: ~5.8s → ~0.99s;
- warm typecheck: ~47s baseline → ~7.36s;
- phase16h CLI handoff suite: ~190.5s test time → ~9.7s;
- hardening syntax check: ~2.78s → ~0.90s;
- full local gate: ~808s component-sum baseline → ~373.8s measured run;
- semantic compatibility: ~663.6s → roughly 428–469s in two post-change runs.

It deliberately did NOT optimize the following because each needed a dedicated proof task:

- TypeScript require-hook/transpile logic duplicated across roughly twenty bin scripts; the source/census CLI spent ~35% of observed runtime in that mechanism.
- source analyzer work over ~127 handler operations mapped to only ~26 unique files, producing repeated reads/parses; those observations feed evidence digests, so a careless refactor could rewrite proof identity.

Those are the strongest explicit next-campaign candidates in current native state.

## Direct code findings

### A. Repeated TypeScript runtime transpilation is real, not hypothetical

`bin/nightwatch-intelligence.mjs` installs a temporary `require.extensions[".ts"]` handler, synchronously reads each TypeScript file, runs `typescript.transpileModule` using ES2022/CommonJS/Node10/esModuleInterop/skipLibCheck, compiles it into CommonJS, and restores the prior hook in `finally`. The prior campaign reports the same pattern across many bin scripts.

Risk: consolidating twenty hardened entrypoints can change compiler/module/error semantics if done mechanically. Opportunity: one explicit loader plus complete content-addressed invalidation can remove duplicated code and work while making hook restoration easier to test once.

### B. Source-surface discovery rereads exact handler/reference files

`src/core/source/surfaces.ts` resolves operations one by one. During join resolution it calls the sibling-source reader for the handler path and again for referenced request/response paths, then performs declaration/static-schema checks. Multiple operations can point to the same file.

Risk: memoization that is keyed only by path can cross repository/source/currentness identities. Opportunity: a call-scoped exact-snapshot read view can remove duplicate I/O without changing proof semantics.

### C. Analyzer output is cryptographically load-bearing

`src/core/semanticCoverage/sourceAnalyzers.ts` emits bounded structural observations with analyzer ID/version, proof/rejection status, shape and `evidenceDigest`. `sourceSurfaceAnalyzerSetIdentity()` also binds analyzer/response-flow versions.

`src/core/source/surfaces.ts` filters proven observations, sorts structural shapes by evidence digest, and incorporates those shapes/flow identities into response evidence, response-contract IDs and semantic-contract IDs.

Consequence: parser sharing is not an ordinary internal refactor. Same-input output/order drift can rewrite `ev:sha256` and downstream contract/census identities. The next campaign must create a differential parity harness before touching this layer.

### D. CI failure is currently external pre-runner truth

Current exact-head Actions run `32971770050` for `910ff0f...` completed failure about four seconds after creation. Its only job (`98186935154`) has no returned steps and no downloadable job log. The durable roadmap has already documented the underlying recurring condition on earlier runs: GitHub reports that the job was not started because account payments/spending-limit conditions block execution. Later phases classify zero-step runs as `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`.

Consequence: do not burn this campaign changing `.github/workflows/hardening.yml` to chase an external no-runner condition. Observe exact-head CI once at closure; only actually executed steps are code evidence.

## Structural hotspots reviewed

These sizes/roles deserve attention during the exhaustive local sweep but are NOT automatic refactor scope:

- `src/core/campaign/orchestrator.ts` — ~120 KB, highly coupled campaign authority.
- `src/core/source/surfaces.ts` — ~61 KB, source joins/proof/census bridge.
- `src/core/semanticCoverage/sourceAnalyzers.ts` — ~52 KB, evidence-generating analyzers.
- `bin/hardening-check.mjs` — ~116 KB, repository hardening authority.
- `bin/agent-state.mjs` — ~41 KB, continuity/Git authority.
- `ui/control-center/src/App.tsx` — ~54 KB.
- several test files in the 30–65 KB range.
- durable docs between roughly 90–197 KB each.

Large size alone is not a defect. Many of these files encode hardened historical compatibility/safety contracts. Any split must be justified by reproduced performance, correctness, ownership or testability evidence.

## Candidate ranking

### P0 — shared TS runtime loader + parity tests

Why now: explicitly deferred, measured cost, repeated code across hardened entrypoints, lower proof-identity risk than analyzer redesign.

Acceptance: per-caller cold/warm stdout/stderr/exit/module parity, error/hook restoration tests, complete cache invalidation and measurable runtime win.

### P0 — call-scoped exact source-read reuse

Why now: direct repeated reads in the current source-discovery implementation; exact snapshot identities already exist.

Acceptance: read count reduction plus complete source/census/digest parity and adversarial cross-SHA/repo/path tests.

### P1 — shared parse/token representation across symbols

Why later in same campaign: potentially larger CPU win, but evidence digests make it high risk.

Admission: only after the differential harness and P0 work. Reject if residual cost is small or parity cannot be made exact.

### P2 — giant-file/config decomposition

Why not primary: no Critical/High defect or measured bottleneck currently ties line count to failure. Review during all-file sweep; defer unless evidence changes.

### Rejected — disk-backed cross-process source-surface cache

Reason: previous architecture review already rejected it as a new persistence authority. This campaign does not reopen that decision.

### Rejected — semantic compatibility worker parallelism

Reason: the workers=1 shape is part of a versioned deterministic compatibility contract. A change would be a safety/contract decision, not a mechanical optimization.

### Rejected — workflow churn for current zero-step Actions failures

Reason: available evidence points to pre-runner billing/platform blockage, not a failing repository command.

## Why this is the next campaign

The latest roadmap says any successor must begin with fresh evidence rather than preselected coverage targets. The latest systemic task then supplies exactly such measured successor evidence: loader duplication and source-analysis redundancy. This campaign attacks those mechanics without pretending current source justifies new semantic/read-only/Phase24 authority.

The expected product is not merely a faster command. It is a stronger engineering property: Nightwatch can reuse pure work while proving that its source-to-evidence-to-contract-to-eligibility chain is invariant under that reuse.
