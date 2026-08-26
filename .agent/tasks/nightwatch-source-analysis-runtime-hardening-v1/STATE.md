# Task State

## Identity

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Title: Source-Analysis Runtime Hardening + Proof-Identity Preservation
Authorization class: NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: COMPLETE
Starting SHA: bebe357313b7210161c5524e90c442137a605aab
Last validated implementation SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
Last substantive checkpoint SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: bebe357313b7210161c5524e90c442137a605aab
LAST_VALIDATED_IMPLEMENTATION_SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_SOURCE_ANALYSIS_RUNTIME_HARDENING_V1_STATUS: COMPLETE

## Objective

Remove measured duplicate TypeScript loader and source-analysis work while
proving exact same-input safe-output, evidence-digest, contract, census,
eligibility, and fail-closed parity. Complete the OpenSpec campaign locally
and synthetically without product, data, infrastructure, authentication,
publication, AI, or self-development authority.

## Current Milestone

COMPLETE — M9 terminal validation and synchronized Git closure.

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
- M5 — parser/token investigation complete: repeated post-optimization runs
  kept the source snapshot and tokenizer metrics stable. A V8 profile recorded
  `tokenizePhp` at 284/4,409 ticks (6.4%); the remaining parse work is spread
  across the independent Phase 14 extractor and Phase 20/26 source analyzers,
  including per-symbol/hint inputs. No shared parse cache was admitted because
  its required cross-authority API change could not yet prove exact identity
  parity; M3/M4 wins remain checkpointed.
- M6 — adversarial hardening complete at `e1f2b54`: the loader and source-read
  mechanisms now have focused collision, exact-content/mtime, bounds,
  rejection/fallback, exception, nested-load and proof-nonmanufacture tests.
  The 45-test affected cone passed, including the 6-test call-scoped read
  suite and 4-test loader suite; the mutation-during-discovery fixture kept
  response proof unproven and Phase24 eligibility at zero.
- M7 — architecture and compatibility sweep complete: the five large/hot
  targets and fourteen Playwright configurations were reviewed; cohesive
  safety/authority boundaries and intentionally isolated opt-in configs were
  retained without line-count refactors. The affected compatibility set
  passed 71/71 tests, the synthetic campaign passed 66/66, owner-provenance
  passed 91/91, the UI passed typecheck plus 11/11 Vitest tests and build
  verification, and the synthetic Control Center browser path passed 1/1.

- M8 — local acceptance and performance validation complete at `5b4f8db`:
  typecheck, hardening, project truth, continuity and audit passed with zero
  strict errors; semantic compatibility passed 1,884 total / 1,871 passed /
  13 skipped / 0 failed; the serial local gate passed all nine required groups
  with receipt `receipt:sha256:4e342b026af4e6a306f293ee`; the source parity
  harness passed 2/2 after the final implementation repair; and the final
  source-census reruns retained the approved snapshot and normalized safe
  output identities. The first clean compatibility attempt had four
  self-development portfolio failures because the synthetic authoritative
  source bundle omitted the newly shared loader; adding
  `bin/lib/typescript-runtime-loader.mjs` to `SELFDEV_AUTHORITATIVE_PATHS`
  fixed the bundle, after which the isolated portfolio suite passed 30/30,
  adoption CLI passed 7/7 and the full compatibility receipt passed.
- M8 clean-checkout qualification completed at `76c06cb`: the disposable
  Node20 installation and all nine clean gate groups passed, with receipt
  `clean-receipt:sha256:7413e2f9b981ab6918d65b56`, gate receipt
  `receipt:sha256:5446abd4166fa41f1ab89927`, clean before/after, no module
  reuse, no auth or owner-finding state and zero sibling writes.
- M9 — regression, final gate and closure complete at `7b95cd4`: the loader
  suite passed 6/6 with the LRU and module-list-bound guards; the final local
  gate passed all 9/9 groups with receipt
  `receipt:sha256:a8b426932b8c141801c0ff40`; the final Node20 clean gate passed
  with receipt `clean-receipt:sha256:9483e8260a8e7ca718341e26`; all OpenSpec
  tasks are checked; and the implementation checkpoint was pushed with
  local/remote equality.

## Work In Progress

None — the source/runtime hardening campaign, acceptance gates and native
continuity closure are complete.

## Exact Next Action

STOP — campaign complete.

## Files Changed

This task activation adds only the native continuity files
`.agent/tasks/nightwatch-source-analysis-runtime-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md`
and routes `.agent/ACTIVE_TASK.md` to this task. The OpenSpec planning artifacts
are the frozen planning source and were pulled from `origin/main`.

M1 added no implementation source. M2 added the parity helper and focused unit
test. M3 added the central loader/declaration, loader tests, and migrated bin
wrappers. M4 added the call-scoped read view and focused tests. M6 added the
adversarial call-scoped read fixtures and OpenSpec completion evidence. M7
changed no architecture source; UI build output and audit measurement files
remain outside Git/under `/tmp` only.

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
- M5 measurement: with the same `--json` source-census commands, current
  output remained safe and the snapshot digest remained
  `srcsnapshot:sha256:04ff583971865f335902f5ad`; normalized safe projections
  matched the prior optimized baseline for source-scan, source-gaps,
  eligibility-census, readonly-census and surfaces. One measured run was:
  source-scan 3.35s/266,444 KB; source-gaps 3.67s/318,044 KB;
  eligibility-census 4.18s/265,640 KB; readonly-census 4.19s/387,436 KB;
  surfaces 6.40s/271,444 KB (wall/RSS). Repeated runs showed the normal
  environment variance: source-gaps 4.20–6.37s/264,516–266,472 KB,
  eligibility 3.77–3.80s/266,908–270,448 KB, readonly 3.56–3.67s/
  266,040–271,232 KB, and surfaces 4.27s/270,204 KB. Performance metrics
  stayed at 94 PHP files tokenized, 766 declarations, max 32,027 tokens and
  max 242,093 source bytes.
- M5 parser decision: a V8 profile of `surfaces --json` recorded 4,409 ticks,
  with `tokenizePhp` at 284 ticks (6.4%). Shared parse/token work is rejected
  for this checkpoint because it would need to bridge the Phase 14 extractor,
  Phase 20 analyzer and Phase 26 extended analyzer while preserving distinct
  symbol/hint/observation inputs. No source or proof authority was changed.
- M6 focused cone: 45/45 tests passed in 17.8s, including call-scoped read
  6/6 and runtime loader 4/4; the standalone parity harness passed 2/2 in
  11.2s. `npm run hardening:check`, `npm run typecheck`, and `git diff --check`
  passed. The bounded read view recorded 514 source reads, 512 retained
  entries and one uncached overflow entry in its synthetic capacity test;
  throwing reads were not retained.
- M7 compatibility and repository sweep: the affected unit set passed 71/71
  in 12.8s; `campaign:synthetic` passed 66/66 in 21.4s; and
  `test:owner-provenance` passed 91/91 in 20.4s. Control Center UI typecheck
  passed, Vitest passed 11/11, build verification passed, and the synthetic
  seven-view browser check passed 1/1 in 10.5s. Local operator previews all
  returned status 0 with empty stderr: contracts 7,206 bytes, gaps 243,481,
  source-gaps 29,150, eligibility-census 394,890, readonly-census 18,024,
  surfaces 1,829,000 and review-queue 983,933 bytes. Their outputs were
  retained only under `/tmp` for measurement.
- M7 architecture review: `orchestrator.ts` 2,073 lines, `surfaces.ts` 867,
  `sourceAnalyzers.ts` 845, `hardening-check.mjs` 1,663 and Control Center
  `App.tsx` 533 were reviewed as cohesive authority/safety boundaries; the
  fourteen small Playwright configs were confirmed as intentional opt-in
  wrappers. No line-count-only split or config merge was justified.

- M8 final performance reruns (same commands and safe projection method):
  current source-scan repeated wall time was 5.34–7.13s versus 12.89s
  baseline; source-gaps 4.73–6.10s versus 10.97s; eligibility-census
  4.93–7.23s versus 10.28s (one normal run and one host-variance RSS outlier
  at 316,864 KB); readonly-census 4.95–6.01s versus 11.46s; and surfaces
  4.84–5.70s versus 10.88s. Current runs exited 0 with empty application
  stderr. Peak RSS stayed approximately 266–270 MB for normal runs; baseline
  values were 265,104 KB, 261,424 KB, 263,088 KB, 262,220 KB and 301,564 KB
  respectively. Normalized safe-output digests matched the optimized
  baseline: source-scan `c07b2079bf0b22281b01561501c38b0160521eca64b8cfaef1184ac9f7a6b920`,
  source-gaps `ffd3c1be9a3f43618ca4f5215cda8e57d4b42fd61c2ceaaa2a3aeb81e461f8ca`,
  eligibility `604827c2addbe706cea6f7e4189d55bb6e0ed70cbdaeed189bbf24fb8e320219`,
  readonly `d5b8513095487357ddbb2e92c233d0967030a744532dfb7b4758882d5d6df842`
  and surfaces `c00b70c4ec96a49e629a5d94ca6e64a11276d0466d60f1aa69fbe6149c0502b0`.

- M8 validation ledger additions: clean `test:semantic-compat` passed
  1,884/1,871/13/0; `gate:local` passed all 9/9 groups at `5b4f8db` with
  receipt `receipt:sha256:4e342b026af4e6a306f293ee`; the loader regression
  suite now passes 5/5 including least-recently-used eviction at 256 entries;
  and the final source-analysis parity suite passes 2/2. `agent:check`
  passes with only the expected stale-anchor warning while this checkpoint is
  being advanced and the known 24 legacy-v1 warnings; `agent:audit` reports
  zero strict errors.
- M9 regression and external-CI evidence: the loader suite passed 6/6 after
  adding the module-list bound test; the clean Node20 gate passed at `76c06cb`
  as recorded above. The exact-head Actions observation for the prior pushed
  implementation head `5b4f8db` was run `32984921837`, job `98229480580`,
  completed failure with zero steps; it is classified
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not as code validation.
- Final M9 local gate: `npm run gate:local` at `7b95cd4` passed all 9/9
  required groups with receipt `receipt:sha256:a8b426932b8c141801c0ff40`.
  The disposable Node20 clean gate at the same head passed all 9/9 groups
  with receipt `clean-receipt:sha256:9483e8260a8e7ca718341e26` and embedded
  gate receipt `receipt:sha256:1e8ac0b2c03f2f35b3eb762d`.

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
- M5-01: Do not admit shared parser state on a single-profile CPU signal when
  the safe implementation would cross independent analyzer contracts; retain
  independent loader/read optimizations and document the rejected candidate.
- M6-01: Keep the loader derivative cache and call-scoped source-read view
  bounded and fail-closed. Digest mismatches, unsupported/rejected/ambiguous
  identities, reader exceptions and capacity overflow call through without
  retaining authority; the mutation fixture must leave proof unproven and
  Phase24 eligibility excluded.
- M7-01: Retain the large/hot modules and isolated Playwright configs as
  deliberate ownership and safety boundaries. The compatibility sweep found
  no reproduced defect or measurable campaign-scoped reason to split or merge
  them; any future restructuring requires its own evidence and scope.
- M8-01: Treat the missing shared-loader file in the synthetic self-development
  source bundle as a real compatibility regression. Add the loader to the
  authoritative manifest rather than weakening the portfolio assertions;
  re-run the affected suites and the complete compatibility manifest.

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
- The representative post-optimization census stayed within the original
  source inventory identity and normalized safe-output digests. The raw CLI
  byte hashes for timing-bearing outputs varied only with advisory
  performance fields, as expected from the existing contract.
- M6 adversarial fixtures confirmed that same-path records remain separated by
  repository and snapshot SHA, content changes invalidate reuse even when
  mtime is restored, mtime-only changes reuse compiler output, and the bounded
  read view retains no failed, mismatched or overflow entry. Existing source
  boundary/response-flow suites supplied malformed, oversized, privacy,
  ambiguous, unsupported, stale and symbol-specific controls; the mutation
  integration retained zero Phase24 eligibility.
- M7 operator and UI execution remained local/synthetic: source previews
  returned the existing bounded safe DTOs, Control Center browser navigation
  covered all seven views without external requests, and no generated UI
  output entered Git.
- M8 caught and repaired a hidden source-bundle coupling: the new shared
  loader was an authoritative runtime file but was absent from the synthetic
  self-development portfolio bundle. The repaired manifest preserves the
  existing source-bundle contract; isolated portfolio, adoption CLI and full
  semantic compatibility all pass afterward.

## Blockers

None.

## Safety Events

NONE — only local Git, Nightwatch files, OpenSpec metadata, and offline
validation have been used. No sibling source, product, auth state, data,
infrastructure, publication, runtime AI, or self-development authority was
accessed.

## Deferred / Follow-Up

Shared parse/token optimization was explicitly rejected at M5 because the
measured 6.4% tokenizer share did not justify crossing independent analyzer
authorities without a complete identity proof. It may be reconsidered only by
a future bounded task with a new parity design; no follow-up authority is
created here.

## Resume Recipe

Historical task complete. Do not resume this task. A future campaign requires
a separate authorization, fresh current-source evidence and a new continuity
task.

## Completion Snapshot

COMPLETE — M0–M9 are closed; local/source/synthetic validation, disposable
Node20 qualification, canonical/isolated parity, continuity-v2 closure and
Git synchronization are complete. External CI is separately classified as a
zero-step billing/platform block, not green evidence.
