# Nightwatch Executor Campaign — Control Center Authority Integration + Whole-Repository Hardening

Status: ACTIVE
Planned-From: `858c2a64fb2d8544725790a2641eac907b04332a`
Target-Branch: `main`
Campaign-Class: `IMPLEMENTATION_AND_HARDENING`
Campaign-ID: `nightwatch-control-center-authority-integration-v2`
Execution-Budget: one long autonomous campaign, approximately 8–10 hours of substantive audit, implementation, adversarial testing, integration, repository-wide hardening, validation, and closure. This is a breadth-and-depth target, not permission to pad work. Do not stop after the first green focused test while mandatory workstreams remain materially unverified.

## 0. Mission

Turn the completed read-only Control Center V1 from a safe but mostly placeholder runtime into a truthful, useful local operational view over Nightwatch's existing authoritative state.

The current Control Center already has strong versioned DTOs, sanitizers, adapters, loopback HTTP/SSE boundaries, seven accessible UI views, graph fallbacks, bundle limits, and focused security tests. The missing layer is the default authority integration: `src/controlCenter/server/defaultCollector.ts` currently exposes real health/meta/readiness/safety but deliberately returns an empty run list and hard-coded UNAVAILABLE/empty campaign, source, graph, and findings responses. The UI therefore renders correctly but cannot, by default, show most of Nightwatch's actual local state.

This campaign has four mandatory outcomes:

1. **Authoritative local data integration.** Build bounded, fail-closed, read-only readers/snapshot builders over Nightwatch's existing run evidence, source intelligence, Phase 24/campaign intelligence, and owner-local finding authorities. Reuse current domain validators and pure authorities; do not invent a second truth model.
2. **Operationally truthful Control Center wiring.** Replace placeholder default-collector branches with those authorities while preserving explicit EMPTY / STALE / UNAVAILABLE / BLOCKED distinctions, source currentness, deterministic ordering, privacy boundaries, and loopback-only read-only HTTP semantics.
3. **Systemic hardening.** Audit the entire producer → persisted/local authority → reader → adapter → DTO → server → client → UI dependency cone plus adjacent repository infrastructure. Reproduce and fix every Critical/High defect found; fix bounded Medium defects when evidence and regression risk justify it. Recent Control Center files are entry points, not audit boundaries.
4. **Project-memory reconciliation and terminal validation.** Bring durable docs/state back into agreement with the landed Control Center and this successor, validate the whole repository and nested UI in canonical and clean-checkout conditions, commit/push durable checkpoints, and close continuity truthfully.

Do not add mutation controls, campaign execution buttons, product-environment contact, arbitrary file browsing, raw evidence display, or a generic shell/process endpoint. This is an authority-integration and hardening campaign, not an operator-command expansion.

## 1. Why this campaign is next

Planning audit of current `main` established the following:

- `.agent/ACTIVE_TASK.md` marks `nightwatch-control-center-readonly-v1` COMPLETE. Its M12 closure reports full local/clean qualification and a completed read-only V1.
- The completed V1 added mature projections under `src/controlCenter/adapters/**`, including run/timeline, execution graph, campaign, source, findings, readiness, safety, and metadata adapters.
- `src/controlCenter/server/defaultCollector.ts` is intentionally a safe starter, not a complete runtime integration. It currently returns:
  - real health/meta/readiness/safety;
  - `runs: []` and null run/timeline/execution graph;
  - campaign summary/coverage as UNAVAILABLE/empty;
  - source summary/surfaces as UNAVAILABLE/empty and an empty graph;
  - findings as UNAVAILABLE/empty.
- The V1 browser qualification itself observed the resulting empty/unavailable states. That was correct for V1, but it is now the dominant functional gap.
- Existing adapters already consume authoritative domain types: `RunSummary` / `RunEvent` / `RepoSnapshotRecord`, `CampaignPlan` / `CampaignCoverageReport`, `RealSourceSurfaceDescriptor`, `SourceEvidenceJoin`, and `BugDossier`. Therefore the highest-value next step is to wire trustworthy readers/builders into those projections, not rewrite the UI or duplicate models.
- Root scripts already expose the underlying authorities (`campaign:*`, source-intelligence commands, owner-local findings, quality gates) and the repository already has artifact validation, source currentness/cache/invalidation, triage/dossier, campaign intelligence, Phase 24 authority, evidence recorder, privacy, and owner-scope machinery that must be reused rather than bypassed.
- Durable project docs predate the Control Center landing in places: `docs/CURRENT_STATE.md` still centers the Phase 28/evidence-backed response-flow successor lineage, while current `main` contains a later Control Center implementation. Reconcile this only after implementation truth is established; do not paper over code gaps with docs.
- At planning time there are no open PRs or open issues in this repository that supersede this campaign.

The architectural opportunity is therefore clear: create one narrow read-only authority facade/snapshot service that composes existing truths and feeds the existing Control Center contracts. Do not let the HTTP layer become a filesystem/domain-policy implementation.

## 2. Non-negotiable operating rules

Read and obey, in precedence order:

- `AGENTS.md`
- `.agent/PLANNER_HANDOFF.md`
- `docs/CURRENT_STATE.md`
- `docs/SAFETY_MODEL.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md` as historical/project context only
- `.agent/ACTIVE_TASK.md`
- this execution prompt
- the fresh task continuity files once created

Before implementation:

1. Fetch/prune and reconcile current `main` with `origin/main` under repository policy. Never force-push.
2. Compare live HEAD with `Planned-From`. The planner commit containing this prompt is expected to be a documentation-only descendant; inspect any other intervening changes and reconcile instead of overwriting them.
3. Run at minimum `npm run agent:check`, `npm run project:check`, `npm run typecheck`, and the focused current Control Center tests before changing semantics.
4. Create a fresh continuity-v2 task under `.agent/tasks/nightwatch-control-center-authority-integration-v2/` with `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`; route `.agent/ACTIVE_TASK.md` to it. Preserve the completed V1 task as immutable history.
5. Build an explicit producer/consumer authority map before choosing reader APIs. Record which existing module is authoritative for each surface and which files are merely serialized representations.
6. Resume through `/goal continue` semantics after any interruption: reconcile live Git/state and continue the first genuinely incomplete milestone. Do not redo landed work merely because the executor/model/session changed.

Permanent boundaries:

- NO production contact.
- NO DEV/NEXT/authenticated browser/API execution unless a separate fresh owner authorization already exists in current repository state; this campaign grants none.
- NO GCP/GKE/Kubernetes/AWS/IAM/datastore/SQL/infrastructure work; Phase 6 remains frozen.
- NO Alphaus sibling-repository writes, installs, commits, checkout rewrites, or fetches. Approved sibling reads remain fixed, local, bounded, path-confined, and read-only.
- NO external publication, issue creation, Slack/email/Drive/Notion output, or shared finding storage.
- NO raw source text, request/response bodies, customer values, cookies, authorization material, credentials, screenshots, traces, arbitrary console/network payloads, or arbitrary local paths in Control Center DTOs, DOM, logs, task files, or Git.
- NO HTTP-triggered child process, shell, CLI execution, package execution, Git command, browser action, campaign execution, file mutation, or refresh side effect. HTTP remains GET/HEAD + notification-only SSE.
- NO arbitrary filesystem browser and no caller-controlled filesystem roots/paths in HTTP query/path parameters.
- NO second Phase 24 portfolio selector, second source-intelligence truth model, second findings schema, or second run-result authority.
- Keep `127.0.0.1` loopback-only binding, strict Host/Origin/method/path/query enforcement, static-root/symlink confinement, and existing public DTO whitelist/sanitization at least as strict as V1.
- Deterministic evidence outranks heuristics. Unknown, malformed, stale, partial, or changing local state must fail closed or surface as explicit unavailable/incomplete state; never fabricate freshness or success.

## 3. Workstream A — Authority inventory and reader architecture

Before wiring anything, trace each surface end to end and choose the narrowest authoritative source.

### A1. Run/evidence authority

Audit at minimum:

- `src/core/evidence/**`, especially `runRecorder.ts` and evidence types;
- `src/core/artifactValidation/**` and any run/evidence schema validators;
- `artifacts/<run-id>/` layout and all writers/readers already present;
- repository snapshot records and run-summary production;
- `src/controlCenter/adapters/runAdapter.ts`;
- `src/controlCenter/adapters/executionGraphAdapter.ts`;
- current run/timeline/graph server routes and UI consumers.

Design a fixed-root, bounded local reader/index. It must never open traces/screenshots/raw network or console payloads merely to populate the Control Center. Prefer summary/index metadata. Timeline projection may consume validated sanitized event records only and must emit only the existing whitelisted codes/fields. Detail reads must be run-ID-to-authority resolution, not path construction from arbitrary input.

### A2. Source-intelligence authority

Audit at minimum:

- `src/core/source/**` including approved scan, surface descriptors, cache, invalidation/currentness, graph/review/taxonomy/response-flow seams;
- `bin/nightwatch-intelligence.mjs` only to understand orchestration — do not shell out to it from the server;
- Phase 25–28 source tests and response-flow hardening tests;
- `src/controlCenter/adapters/sourceAdapter.ts`.

Expose `RealSourceSurfaceDescriptor[]` through reusable pure/in-process authority builders if the current orchestration is trapped inside a CLI boundary. Do not duplicate parsing/analyzer logic in Control Center. Preserve the fixed approved repository universe and current source identity. No HTTP request may trigger network access or modify sibling repos.

### A3. Campaign/Phase 24 authority

Audit at minimum:

- `src/core/campaignIntelligence/**`;
- `src/core/phase24/**` and the current Phase 24 authority/currentness/invalidation lifecycle;
- source-to-Phase24 and synthetic campaign bridges;
- `src/controlCenter/adapters/campaignAdapter.ts`.

Build Control Center campaign snapshots only from the same plan/coverage authority used by repository-native campaign commands. Preserve owner-scope freeze, source-currentness, eligibility/exclusion reasons, digests, and empty/block semantics. Never derive an alternate score/selection policy in the UI or collector.

### A4. Findings authority

Audit at minimum:

- `src/core/triage/**` dossier types/builders/validators;
- owner-local/private finding persistence and atomic/private-artifact readers;
- any current `campaign:findings` or owner-review query path;
- `src/controlCenter/adapters/findingsAdapter.ts`.

Read only the fixed owner-local findings authority (default `$HOME/.nightwatch/findings/` or the repository-native equivalent). Resolve IDs through validated manifests/indexes. Never expose file paths or raw dossier internals. A malformed, over-permissive, wrong-owner, symlinked, privacy-violating, or unsupported dossier must not become an AVAILABLE finding merely because JSON parsing succeeds.

### A5. One integration seam, not four bespoke mini-systems

Prefer a small internal Control Center authority/snapshot layer with injected readers for tests and a safe default composition for the launcher. It should own bounded snapshot assembly/currentness/error classification; adapters continue owning DTO projection. HTTP/router code should remain nearly ignorant of filesystem/domain internals.

Record in the PLAN which existing modules stay authoritative and why any new reader is necessary.

## 4. Workstream B — Bounded run and timeline integration

Implement the default run surfaces first because they exercise the local persistence boundary without requiring sibling-source scans.

Mandatory behavior:

- Discover only child run directories under the fixed Nightwatch artifacts authority. Reject symlinks, traversal, non-directories, overlong names, malformed safe IDs, and paths escaping the realpath-confined root.
- Bound directory count, per-file size, total bytes per request/snapshot, event count, line length, and JSON nesting/shape through existing or new explicit constants. Limits must be tested and reflected as deterministic truncation/unavailable semantics, never unbounded memory growth.
- List views should read the minimum metadata required, ideally validated `summary.json` only.
- Detail may add validated repository snapshot metadata; timeline may read the sanitized event stream needed by `projectTimeline`; execution graph must derive from existing safe run/campaign evidence, never raw trace/browser artifacts.
- Handle in-progress/partially-written runs safely: stat/read/stat or equivalent stable-read discipline where needed; truncated JSONL/atomic rename races must yield INCOMPLETE/UNAVAILABLE or skip a single unstable record without crashing the server or blessing bad data.
- Ordering/pagination must be deterministic. If current DTO pagination only supports a first bounded page, either implement a versioned safe cursor contract or explicitly preserve deterministic bounded truncation; never silently pretend an omitted page does not exist.
- Unknown schema versions, malformed records, oversized artifacts, duplicate/conflicting run IDs, inconsistent run IDs across files, and unsafe event fields must fail closed.
- Unit and integration tests must prove that raw event data values, notes, network URLs, request/response bodies, screenshot paths, source paths, and secrets cannot escape through list/detail/timeline/graph responses.

Do not add an endpoint that returns arbitrary artifact content.

## 5. Workstream C — Source + campaign authority integration

Wire source intelligence and campaign views in-process using existing pure authorities.

Mandatory behavior:

- The default Control Center may read only the approved local sibling-source universe already allowed by Nightwatch policy.
- Source computation must be bounded and currentness-aware. Reuse existing content/source identity, cache, invalidation, analyzer budgets, rejection taxonomy, and exact response-flow proof rules.
- Do not execute `node bin/nightwatch-intelligence.mjs ...` or any child process from HTTP or the collector. Refactor shared pure orchestration out of CLI code when necessary.
- Distinguish `EMPTY` from `UNAVAILABLE` from `STALE`. Missing one approved repo must not be misreported as a globally fresh empty inventory.
- Preserve source repo/SHA/evidence provenance internally, while public projection continues to hash/sanitize repository identities and withhold paths/symbol text.
- Campaign plan/coverage must be built from the same source snapshot/currentness and Phase 24 authority. A campaign snapshot and source snapshot from incompatible generations must not be combined as if coherent.
- Add a generation/snapshot identity internally so source summary, surfaces, graph, campaign summary, and coverage served together can be traced to one coherent authoritative generation without exposing raw source.
- Repeated identical current-source snapshots must yield byte-stable public responses.
- A source identity change must invalidate or advance the correct derived caches; no stale campaign/graph response may survive solely because a stable logical surface ID remains.
- Source graph bounds (250 nodes / 500 edges maximum and current depth limits) stay enforced.

If the normal local environment lacks approved sibling repos, the default launcher must remain healthy and explicitly report source/campaign unavailable. Synthetic integration fixtures must prove the non-empty path.

## 6. Workstream D — Owner-local findings integration

Wire findings only after the reader boundary is proven safe.

Mandatory behavior:

- Reuse the existing private/owner-local storage permission and atomicity conventions. Do not relax permissions to make the UI work.
- Read fixed schemas only. Reject unknown schema versions, malformed records, symlinks, hard-link/path escapes where relevant, oversized files, unexpected ownership/mode, and non-private roots according to existing repository policy.
- Apply the existing dossier validator before `projectFindings`; the projection's privacy checks are defense-in-depth, not the sole validator.
- Never deserialize arbitrary executable content or follow dossier-supplied paths.
- A dossier that claims persisted raw bodies, customer values, credentials, screenshots, authenticated traces, or in-scope datastore evidence must be excluded/fail closed exactly as existing privacy policy requires.
- Distinguish no findings (`EMPTY`) from inaccessible/malformed authority (`UNAVAILABLE`). One corrupt file must not crash the whole server; define and test deterministic partial-authority semantics rather than silently dropping corruption.
- Keep HTTP finding output metadata-only. No raw evidence drill-down is part of this campaign.

## 7. Workstream E — Snapshot coherence, caching, freshness, and SSE

The dashboard must remain responsive without turning reads into hidden execution.

Design and test an explicit local snapshot lifecycle:

- cache only sanitized/domain snapshots, not raw secret-bearing payloads;
- fixed maximum cache entries/bytes or one-generation replacement where practical;
- cache keys include all authority identities that affect the result;
- no time-only cache may declare stale source fresh;
- concurrent HTTP requests for the same generation must not start duplicate unbounded source scans;
- a failed refresh must not overwrite a last-known-good generation as CURRENT;
- partial/unstable file writes must not poison durable cache state;
- shutdown must cancel/finish bounded in-process reads without leaking handles;
- notification-only SSE may tell clients to refetch after an observed generation change, but the event must contain no raw payload and must not itself mutate or execute anything;
- if filesystem watching is used, it must watch only fixed allowed roots, be optional/fail-closed, have bounded watcher count, and be thoroughly closed on shutdown. Poll-on-read or digest-on-read is acceptable if simpler and safer.

Do not add background product polling, network refresh, cron, worker processes, or arbitrary filesystem watches.

## 8. Workstream F — UI truthfulness and operational usefulness

Do not redesign the UI for aesthetics. Modify it only where the newly-real data exposes correctness/usability gaps.

Required checks:

- all seven existing views correctly render non-empty authoritative synthetic data as well as loading/empty/stale/unavailable/blocked/error states;
- run selection, timeline pagination, execution graph selection, source filtering/graph selection, campaign coverage, and findings list remain keyboard-accessible;
- source/campaign generation mismatch or refresh transitions never flash stale data as current;
- advisory SSE refresh preserves the user's current view/selection where still valid and clears it safely where the selected entity disappeared;
- large bounded lists/graphs do not lock the UI; keep the existing 512 KiB built-bundle ceiling unless a measured, reviewed reason proves a narrowly larger cap is necessary;
- no external requests, CDN/fonts/telemetry, embedded content, raw paths, or secret-bearing text enter the built UI.

Add one deterministic built-server browser/E2E fixture that starts the normal server composition against injected synthetic authorities and proves **non-empty** Overview/Safety/Runs/Execution/Campaign/Source/Findings behavior. V1's empty-state smoke is not sufficient for V2.

## 9. Workstream G — mandatory whole-repository systemic audit

After focused integration is green, perform a genuine repository-wide hardening sweep. Do not restrict review to changed files.

Audit major authored subsystems and their cross-boundaries:

- environment/safety/proxy/browser containment;
- evidence/artifact validation/repository snapshots;
- campaign + campaign intelligence + Phase 24 lifecycle;
- source scan/proof/cache/invalidation/currentness;
- semantic/replay/minimization/triage/dossier pipelines;
- private artifact/finding storage;
- readiness/project state/agent continuity;
- CLI argument and path boundaries under `bin/`;
- quality-gate inventory/local/clean orchestration;
- nested Control Center frontend package and build verifier;
- `.github/workflows/**`, package scripts, generated/ignored artifact boundaries;
- concurrency, process lifecycle, filesystem race, cache invalidation, deterministic identity, privacy, error normalization, and resource exhaustion seams.

Use current changes as impact roots, then follow producer/consumer dependencies both directions. Read implementations and tests; do not claim a subsystem audited merely because a test filename exists.

Severity policy:

- reproduce/fix all Critical and High defects within repository scope;
- fix Medium defects when deterministic evidence exists and the repair is bounded/low-risk;
- record Low/speculative/design-only observations in REPORT/Deferred Work rather than adding churn;
- never weaken assertions, safety, privacy, type strictness, validation, or quality floors merely to get green.

Every repair requires a permanent regression at the narrowest authoritative layer plus affected-cone validation.

## 10. Mandatory adversarial matrix

At minimum add deterministic cases for:

### Filesystem and persistence

- artifact/finding root missing, unreadable, wrong type, symlinked, replaced during read;
- child symlink/path traversal/encoded traversal/very long identifier;
- oversized file, too many runs/files/events, overlong JSONL line;
- partial JSON, truncated final JSONL line, duplicate/conflicting IDs, unknown schema version;
- TOCTOU replacement between discovery and open/read;
- malformed Unicode/control characters and secret-like sentinel strings.

### Coherence/currentness

- run appears/disappears during pagination;
- source repo unavailable → available, current → stale → current, SHA/evidence change with stable surface ID;
- campaign generated from generation A cannot be paired with source generation B;
- failed refresh after last-known-good generation;
- concurrent identical reads, concurrent refresh + request, shutdown during refresh;
- cache invalidation after source/artifact/finding identity changes.

### Privacy and authority

- raw source path/symbol/text sentinel;
- credential/cookie/auth-header/customer-value/raw-body sentinel;
- unsafe dossier privacy flags;
- arbitrary path passed as run/finding/source ID;
- query attempting to turn a read endpoint into execution/refresh/mutation;
- HTTP method/Host/Origin/path/query attacks from V1 remain green;
- no child process/shell/browser/product-network call can be reached from any Control Center route.

### Determinism and limits

- repeated snapshot byte equality;
- deterministic ordering under input permutation;
- pagination/cursor boundaries if implemented;
- graph node/edge/depth caps;
- cache/resource caps;
- UI large-bounded fixture and reconnect behavior.

Use synthetic data only.

## 11. Validation strategy

Validation is milestone-scoped first, then integrated. Exact commands may be refined in the living PLAN after inventory, but closure must include all applicable authoritative gates.

Minimum focused checks during implementation:

```bash
npm run typecheck
npm run hardening:check
npx playwright test tests/unit/controlCenterContracts.test.ts tests/unit/controlCenterAdapters.test.ts tests/unit/controlCenterServer.test.ts --project=nightwatch --workers=1
npm run control-center:ui:typecheck
npm run control-center:ui:test
npm run control-center:ui:build
```

Add dedicated V2 reader/snapshot/integration tests rather than bloating one server test indefinitely. Run their exact focused commands after each workstream.

Before terminal closure:

```bash
npm run agent:check
npm run agent:audit
npm run project:check
npm run typecheck
npm run hardening:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run campaign:synthetic
npm run test:owner-provenance
npm run gate:local
npm run gate:clean
npm test -- --workers=1
git diff --check
```

Also require:

- nested Control Center typecheck/test/build under the Node version used by the clean gate;
- built loopback browser verification against synthetic non-empty authority data, with console/page errors captured and accessibility checked;
- built asset scan proving no external references/embedded content and bundle-size policy compliance;
- privacy scan of changed source/tests/task/docs for raw source, paths, secrets, customer values, or accidental real evidence;
- final dependency-cone review for all changed public contracts/readers/cache semantics;
- canonical vs disposable clean-checkout test enumeration/skip identity comparison when the repository's established topology requires it.

Do not claim external CI green unless GitHub actually executed the required steps. If the standing Actions billing/platform condition still produces `steps=[]` or no run, inspect it once, record the exact truth, and do not retry-loop.

## 12. Project-memory reconciliation

After code and tests establish the new truth, update durable documentation narrowly and accurately:

- `README.md`: document how to start the Control Center and what authorities it reads, including explicit unavailable behavior and permanent read-only/loopback boundary.
- `docs/CURRENT_STATE.md`: reconcile the landed Control Center V1 and this V2 authority-integration state without creating duplicate live-SHA authority fields forbidden by `project:check`.
- `docs/ROADMAP.md`: append a concise evidence-backed Control Center V1/V2 successor record rather than rewriting historical Phase 0–28 narrative.
- `docs/ARCHITECTURE.md` and `docs/SAFETY_MODEL.md` only if implementation adds a durable authority/snapshot boundary that is not already documented.
- `docs/DECISIONS.md` only for genuinely new durable architecture/safety decisions.

The completed `nightwatch-control-center-readonly-v1` task remains historical and must not be rewritten into V2.

## 13. Completion gates

The campaign is DONE only when all of the following are true:

1. The normal Control Center launcher uses real bounded local authorities for runs, source intelligence, campaign intelligence, and owner-local findings when those authorities exist.
2. No default runtime surface is a hard-coded placeholder merely because V1 deferred its wiring. Explicit UNAVAILABLE remains correct only when the underlying authority is actually unavailable.
3. Run list/detail/timeline/execution graph are sourced from validated fixed-root artifacts with bounded reads, deterministic ordering, race handling, and no raw-evidence leakage.
4. Source summary/surfaces/graph are sourced from the existing approved local source-intelligence authority with exact currentness and no CLI shell-out/network/mutation.
5. Campaign summary/coverage are generated from the existing Phase 24/campaign intelligence authority and a coherent source generation; no parallel selector or optimistic currentness shortcut exists.
6. Findings are sourced only from validated private owner-local dossiers and remain metadata-only; unsafe/corrupt storage cannot become public DTO data.
7. Snapshot/cache/SSE semantics are bounded, coherent, deterministic, currentness-safe, concurrency-safe, and cleanly shut down.
8. All existing V1 Host/Origin/method/path/static/SSE/privacy/accessibility protections remain green.
9. A deterministic synthetic non-empty end-to-end browser test proves every major view against the built loopback server; empty/unavailable tests also remain green.
10. The mandatory whole-repository audit is recorded with coverage, reproduced defects, fixes, regressions, and deliberately unchanged seams. No unresolved Critical/High regression remains.
11. Durable docs and continuity files match implementation truth and pass `agent:check`, `agent:audit`, and `project:check`.
12. Required focused, affected-cone, unified local, clean-checkout, canonical full-regression, nested UI, browser/accessibility, privacy, and diff checks pass, or an external platform limitation is recorded without mislabeling it green.
13. Final `HEAD == origin/main`, worktree clean, no leaked agent worktrees/generated output, and all durable checkpoint commits pushed without force.

If fresh audit evidence proves one planned wiring path is unsafe or no authoritative reader exists, do not fake completion. Build the narrow missing reusable authority/validator if it is within the permanent boundaries; otherwise mark that surface truthfully UNAVAILABLE and document the concrete blocker while completing every other safe workstream.

## 14. Git, checkpoints, and reporting

- Commit validated substantive milestones often enough that interruption loses at most one small unit of work.
- Before every push: scoped tests, `git diff --check`, diff/privacy review, reconcile `origin/main`, then normal push only.
- Never force-push, reset away uncertain work, or delete other-agent worktrees/branches without proving ownership and merge state.
- Keep `STATE.md` concise and current after each milestone; put durable history/results in `REPORT.md`.
- Final REPORT must include: starting SHA, substantive implementation anchor(s), files/subsystems changed, authoritative readers selected, cache/currentness model, adversarial cases, defects found/fixed by severity, full validation ledger with counts/receipts, privacy/safety review, external CI truth, deferred work, and final continuity status.
- Commit messages for major checkpoints should describe the actual system change and validation, not generic “update” messages.
- End only after pushing validated final state and verifying local HEAD equals `origin/main` with a clean worktree.

## 15. Executor directive

Execute this campaign autonomously from current repository truth. Do not return a prompt for somebody else to paste. Do not stop at planning, at the first successful reader, or at the first green focused suite. Continue through all mandatory workstreams, systemic audit, repairs, full validation, documentation, continuity closure, commit, and push.

Use repository-native continuation semantics and remain model/harness agnostic. On interruption or a fresh session, `/goal continue` must resume the first genuinely incomplete milestone from `.agent/ACTIVE_TASK.md` + task `STATE.md` + this prompt, after reconciling live Git.

If every completion gate is genuinely satisfied, close the task truthfully. If a permanent safety/owner boundary blocks a requirement, preserve that boundary, record the blocker precisely, and finish all independent safe work rather than weakening policy.