# Task State

## Identity

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Title: Source-Analysis Runtime Hardening + Proof-Identity Preservation
Authorization class: NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: IN_PROGRESS
Starting SHA: bebe357313b7210161c5524e90c442137a605aab
Last validated implementation SHA: dc368eb277514c716fb05fdda7d602ae6a850e29
Last substantive checkpoint SHA: dc368eb277514c716fb05fdda7d602ae6a850e29
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: bebe357313b7210161c5524e90c442137a605aab
LAST_VALIDATED_IMPLEMENTATION_SHA: dc368eb277514c716fb05fdda7d602ae6a850e29
LAST_SUBSTANTIVE_CHECKPOINT_SHA: dc368eb277514c716fb05fdda7d602ae6a850e29
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_SOURCE_ANALYSIS_RUNTIME_HARDENING_V1_STATUS: IN_PROGRESS

## Objective

Remove measured duplicate TypeScript loader and source-analysis work while
proving exact same-input safe-output, evidence-digest, contract, census,
eligibility, and fail-closed parity. Complete the OpenSpec campaign locally
and synthetically without product, data, infrastructure, authentication,
publication, AI, or self-development authority.

## Current Milestone

Milestone ID: M5
Milestone status: IN_PROGRESS
What is being attempted: measure residual parser/token work after loader and exact-read reuse, then either admit a bounded lower-level parse cache with parity proof or document the optimization as rejected.

## Completed Milestones

- M0 — bootstrap complete: fast-forward pulled `origin/main`; live local and
  remote heads matched at `bebe357`; working tree was clean; predecessor
  systemic-optimization task remained terminal; OpenSpec status was ready with
  53/53 tasks pending; pre-edit hardening passed and baseline continuity
  failures were the expected stale predecessor route before activation.
- M1 — exhaustive audit and baseline complete: all 1,303 tracked paths were
  read and hashed; loader/source seams were enumerated; hygiene markers were
  manually reconciled; representative source-analysis CLI outputs were
  captured with empty stderr, zero exit status, deterministic digests, wall
  time and peak RSS.
- M2 — differential parity harness complete: deterministic source/Phase24/
  review projections, same-file symbol isolation, raw-marker exclusion and
  repeated CLI JSON byte checks pass. Temporary order/identity/currentness
  mutations each failed the equality assertion and were removed afterward.
- M3 — TypeScript runtime loading complete at `dc368eb`: one explicit shared
  loader owns the ES2022/CommonJS/Node10 profile, a bounded process-local
  content-addressed derivative cache, nested/error hook restoration and
  failed-derivative exclusion. All 20 equivalent bin-local hooks migrated;
  `bin/portfolio.mjs` remains the reviewed distinct compiler-fingerprint path.
  Loader tests pass 4/4, migrated CLI help/syntax checks pass, typecheck and
  hardening pass, and loader checkpoints are pushed with local/remote HEAD
  equal.
- M4 — call-scoped exact source-read reuse complete at `dc368eb`: discovery
  wraps the existing reader only after scan identity is established; positive
  content is retained only in a bounded ephemeral view keyed by snapshot,
  repo, SHA, path, digest and status. Rejected, unavailable, ambiguous and
  digest-mismatched reads fall back without cache entries. Source/read,
  response-flow, Phase24, eligibility and parity tests pass; the instrumented
  synthetic discovery reduced repeated shared-handler reads to scan plus one
  verified downstream read and retained safe-output equality.

## Work In Progress

M5 parser/token investigation. The loader and read-view wins are independently
checkpointed. The next bounded work unit is to repeat the source-census timing/
RSS methodology, inspect residual tokenizer metrics and determine whether
lower-level parse sharing can preserve per-symbol analyzer identity.

## Exact Next Action

Repeat the baseline source-census measurements after `dc368eb`, compare parser/
token metrics and memory, then make the explicit M5 parse-sharing admit/reject
decision before editing analyzers.

## Files Changed

This task activation adds only the native continuity files
`.agent/tasks/nightwatch-source-analysis-runtime-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md`
and routes `.agent/ACTIVE_TASK.md` to this task. The OpenSpec planning artifacts
are the frozen planning source and were pulled from `origin/main`.

M1 added no implementation source. M2 added the parity helper and focused unit
test. M3 added the central loader/declaration, loader tests, and migrated bin
wrappers. M4 added the call-scoped read view and focused tests. Audit
manifest/hash files remain outside Git under `/tmp` only.

## Validation Ledger

- `git pull --ff-only origin main`: PASS; fast-forwarded `910ff0f` to
  `bebe357`; no local changes were overwritten.
- `git status --short --branch` and live `git rev-parse`: PASS; clean `main`,
  local `HEAD == origin/main == bebe357`.
- `openspec status --change nightwatch-source-analysis-runtime-hardening-v1
  --json`: PASS; spec-driven artifacts complete.
- `openspec instructions apply --change
  nightwatch-source-analysis-runtime-hardening-v1 --json`: PASS; 53 total,
  0 complete, 53 remaining, state ready.
- `npm run hardening:check`: PASS; offline structural invariants hold.
- `npm run agent:check` before activation: EXPECTED FAIL with
  `STALE_IMPLEMENTATION_BASELINE` because the new OpenSpec planning artifacts
  were after the terminal predecessor checkpoint and active routing still
  pointed at that predecessor.
- `npm run agent:audit` before activation: PASS with 0 strict errors;
  historical legacy warnings are known and retained.
- `npm run project:check` before activation: EXPECTED FAIL with
  `PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED` because fresh routing was not
  yet activated.
- Toolchain baseline: Node `v22.22.1`, npm `10.9.4`, TypeScript `5.9.3`.
- Pre-activation tracked-file count: 1,299.
- Post-activation tracked-file count: 1,303.
- Complete tracked manifest: 1,303 sorted NUL-delimited Git paths; manifest
  SHA-256 `e9269825ec1d63d7ca329b3bb674faaba0c7989fa1a483631ead3b4a442e422b`.
  Per-file hash ledger SHA-256
  `4a54cc1531c86ff5b4cadd450827c65c6522f87016db78476ddb341d7195e032`.
  Total tracked bytes `14,211,727`; total tracked lines `284,308`.
- Tracked classification ledger: agent/tooling/planning 435; executable
  source 405; tests 228; fixture/corpus 112; bin CLI 49; durable docs 30;
  config/workflow 25; UI 14; scenario 1; artifact scaffold 1; other 3.
- Runtime loader census: 20 bin-local `.ts` hooks, all equivalent compiler
  profiles (ES2022, CommonJS, Node10, esModuleInterop, skipLibCheck), all
  preserving/restoring the prior hook. `bin/portfolio.mjs` was reviewed as a
  distinct fingerprinted compiler path and excluded from the hook count.
- Affected source-analysis seams: `scanSource` inventory reads; response-flow
  index reads; handler join reads; per-operation source analyzer reads;
  response declaration reads; readonly-candidate reads; and the confined
  sibling reader. Production discovery caller is the source preview in
  `bin/nightwatch-intelligence.mjs`; the Control Center source authority and
  unit/browser tests are the other integration consumers.
- Baseline source inventory: six CURRENT repositories; 1,732 considered,
  1,092 read, 1,078 admitted, 654 rejected, 12,449,877 bytes, 440
  directories, 2 budget rejections; snapshot digest
  `srcsnapshot:sha256:04ff583971865f335902f5ad`; config digest
  `srcconfig:sha256:e8bdfc8f0e58d7d93a87215`.
- Baseline representative commands (`node bin/nightwatch-intelligence.mjs
  <command>`): source-scan stdout 685,354 bytes, SHA-256
  `5e6344a66c40ecb16e8f80129482e0e7e38a07e81c2c5800172f2adaf4dfdb66`,
  12.89s, peak RSS 265,104 KB; source-gaps 29,150 bytes, SHA-256
  `63ec55885d7b7e530c73bd174c5270e85aada9c4fc8b83675b2abcc7c854550c`,
  10.97s, 261,424 KB; eligibility-census 394,890 bytes, SHA-256
  `b338dafa6a3e4047b7d11cd2071fc1523a5e6149b70caced4c1e7296ce93d452`,
  10.28s, 263,088 KB; readonly-census 18,024 bytes, SHA-256
  `bf6e6749332135f56539fe3549280e8cb7948ccadfc50ee429c899a7426e91ac`,
  11.46s, 262,220 KB; surfaces 1,829,001 bytes, SHA-256
  `d34bb0ee5e669e2849e2b121bdaeded87685bb722b84eace7b46bef4d3b9fff8`,
  10.88s, 301,564 KB. All exit 0 and stderr was empty with SHA-256
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `npm run typecheck`: PASS after the harness implementation.
- `npx playwright test tests/unit/sourceAnalysisParity.test.ts
  --project=nightwatch --workers=1`: initial 3/3 PASS with temporary mutation
  probes; after probe removal, final 2/2 PASS.
- Final parity fixture assertions: 2 operations and 2 surfaces share one
  handler file while retaining distinct response evidence/semantic IDs; the
  raw synthetic marker is absent from the serialized safe projection.
- Final CLI byte assertions: `contracts`, `differential`, and `mutation-score`
  each ran twice with status 0, empty stderr and byte-identical JSON stdout.
- M3 loader validation: `npm run typecheck` PASS; loader suite 4/4 PASS;
  source parity suite 2/2 PASS; migrated bin `--help` smoke checks 13/13
  PASS; all migrated files pass `node --check`; `npm run hardening:check`
  PASS. The only `require.extensions`/`transpileModule` occurrence under
  `bin/` is the shared loader.
- M3 loader identity controls: exact content changes (with original mtime
  restored) miss; mtime-only changes hit; explicit ES2020 and ES2022 profiles
  occupy separate entries; nested and throwing modules restore the hook and do
  not retain a failed derivative.
- M4 source-read validation: `callScopedSourceRead.test.ts` 4/4 PASS;
  source cone (including source parity, response flow, surfaces, readonly and
  eligibility coverage) passed all completed tests; hardening and typecheck
  PASS. The fixture contains two repositories with the same relative path,
  same-mtime content mutation, rejected/unsupported and unavailable controls,
  and separate snapshot views without aliasing.

## Decisions Made During This Task

- The terminal predecessor is immutable history. Its active-task files are not
  rewritten; this successor owns the new work and continuity route.
- The OpenSpec change is the frozen implementation source. Its 53 ordered
  tasks will be marked only after exact evidence is recorded in this task.
- Starting and baseline validated implementation anchors use the pulled live
  Git SHA until a source-bearing milestone earns a newer validated checkpoint.
- M3-01: The loader retains only compiler output in a bounded process-local
  LRU. No ignored disk derivative cache was justified because the measured
  path is already process-bounded and persistence would add interruption,
  invalidation and privacy surface without required evidence.
- M3-02: The census found no caller with a distinct compiler profile; the
  default ES2022 profile remains unchanged. A second explicit ES2020 profile
  exists only to exercise profile identity/invalidation and future-proof the
  API; no caller was silently normalized across a known difference.
- M4-01: Source text is cached only after a post-scan reader call matches the
  inventory digest. A mismatch is returned to the authoritative caller for
  its existing stale classification and is never retained; rejected or
  ambiguous records never become cache authority.

## Discoveries

- The latest pull introduced a complete OpenSpec change and replaced the stale
  executor prompt; the prompt's planned-from SHA is an ancestor of the pulled
  head, so reconciliation is required but no conflicting implementation was
  found.
- The prior task's report explicitly deferred exactly the loader consolidation
  and census analyzer/read-reuse candidates now authorized here.
- M1 hygiene review found no safe broad cleanup candidate. TODO/FIXME/HACK/XXX/
  deprecated/dead-path markers are mostly explicit compatibility, safety,
  historical or test records. Duplicate markers in affected code denote
  runtime identity validation, deduplication, or provenance controls rather
  than duplicate source-analysis implementations.
- M2-01: Advisory elapsed timings are excluded from parity identity because
  the current discovery implementation explicitly marks them non-enumerable
  and non-authoritative; structural discovery/performance fields remain in the
  separate benchmark ledger.
- The loader migration removed all 20 duplicate bin-local hook bodies. The
  distinct `bin/portfolio.mjs` compiler fingerprint path remains outside the
  migration by design.
- The source-read fixture measured two underlying reads of the shared handler
  during one discovery (scan plus first verified analyzer/index read); later
  joins and observations hit the call-scoped value. This is an instrumented
  synthetic measurement, not a claim about an external product snapshot.

## Blockers

None.

## Safety Events

NONE — only local Git, Nightwatch files, OpenSpec metadata, and offline
validation have been used. No sibling source, product, auth state, data,
infrastructure, publication, runtime AI, or self-development authority was
accessed.

## Deferred / Follow-Up

No parse/token optimization has been admitted yet. The M5 timing and residual
cost measurement is pending; if per-symbol identity parity is not provable or
the remaining cost is not material, the candidate will be explicitly rejected
and the independent loader/read wins retained.

## Resume Recipe

Read `AGENTS.md`, `.agent/EXECUTION_PROMPT.md`, this task's `SPEC.md`,
`PLAN.md`, and `STATE.md`; inspect `git status`/diff; continue the Exact Next
Action from the first incomplete OpenSpec task. Update this state after each
milestone, design decision, significant validation, and before any context
boundary.

## Completion Snapshot

Not complete. M5 parser/token measurement and M6–M9 hardening, acceptance,
reconciliation, exact-head CI observation and final closure remain.
