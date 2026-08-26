# Report — Source-Analysis Runtime Hardening

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

This is the terminal report for the authorized local/source/synthetic OpenSpec
campaign. The implementation consolidates the duplicated TypeScript runtime
loader, adds bounded exact-snapshot source-read reuse, preserves all source and
proof authorities, and closes with full local and Node20 clean qualification.
External Actions remains separately classified and is not used as green
evidence.

## Campaign routing

- OpenSpec change: `nightwatch-source-analysis-runtime-hardening-v1`
- Frozen planning source: `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/`
- Authorization: `NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY`
- Starting SHA: `bebe357313b7210161c5524e90c442137a605aab`
- Target branch: `main`
- Scope: local/source/synthetic only; no DEV/NEXT/production or data/infra
  operations.

## Initial evidence

The repository was pulled fast-forward-only from `origin/main`, the tree was
clean, and local `HEAD == origin/main` at the starting SHA. The OpenSpec
change is complete as a planning artifact and exposes 53 ordered tasks.
`hardening:check` passed before activation. Continuity/project checks were
expected to reject the stale predecessor routing and will be re-run after
activation.

## Current status

M0–M9 are complete. The validated implementation checkpoint is
`7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c`; the final local gate and
disposable Node20 gate both pass at that head; and all 53 OpenSpec tasks are
checked.

## M8 acceptance and regression checkpoint

The full serial local gate passed all nine required groups at `5b4f8db` with
receipt `receipt:sha256:4e342b026af4e6a306f293ee`. The final semantic
compatibility receipt is 1,884 total / 1,871 passed / 13 skipped / 0 failed.
Static, hardening, project-truth, continuity and audit checks passed with zero
strict errors. The isolated source-analysis parity suite passed 2/2, and the
loader suite now passes 5/5 including a 256-entry LRU eviction boundary.

The first clean semantic run after the manifest repair had four
`selfDevPortfolio` failures because the synthetic authoritative source bundle
did not include the new shared loader. `src/core/selfDev/provenanceManifest.ts`
now includes `bin/lib/typescript-runtime-loader.mjs`; the isolated portfolio
suite passed 30/30, adoption CLI passed 7/7, and the final full compatibility
receipt passed without changing any authority or privacy boundary.

The final disposable Node20 clean-checkout gate passed at `7b95cd4` with
receipt `clean-receipt:sha256:9483e8260a8e7ca718341e26` and embedded gate
receipt `receipt:sha256:1e8ac0b2c03f2f35b3eb762d`.

Performance reruns retained the approved source snapshot and normalized safe
digests. Representative current wall-time ranges were source-scan 5.34–7.13s
(12.89s baseline), source-gaps 4.73–6.10s (10.97s), eligibility-census
4.93–7.23s (10.28s), readonly-census 4.95–6.01s (11.46s), and surfaces
4.84–5.70s (10.88s). Normal runs used approximately 266–270 MB peak RSS;
one eligibility run reached 316,864 KB as host variance. All application
stderr was empty and status was 0. Normalized output digests matched the
optimized baseline; exact digest values are recorded in STATE.md.

The disposable clean-checkout qualification then passed at `76c06cb` under
Node 20: install PASS, all nine gate groups PASS, clean before/after, no
node_modules reuse, no auth or owner-finding state and sibling writes 0. Its
clean receipt is `clean-receipt:sha256:7413e2f9b981ab6918d65b56` and its
embedded gate receipt is `receipt:sha256:5446abd4166fa41f1ab89927`.

M9 regression hunting added a six-test loader suite boundary: 256 derivative
entries are retained with least-recently-used eviction, and a 129-entry module
list is rejected before hook installation or compilation. The exact-head
Actions observation for the preceding pushed implementation checkpoint
`5b4f8db` was run `32984921837`, job `98229480580`; the job completed failure
with `steps: []` and is classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not
as a code failure or green CI result. A final exact-head observation will be
recorded after the closure checkpoint is pushed.

## M3/M4 implementation evidence

The 20 equivalent bin-local TypeScript require hooks were migrated to
`bin/lib/typescript-runtime-loader.mjs`; the separately fingerprinted
`bin/portfolio.mjs` path was reviewed and retained. The shared loader has one
default ES2022/CommonJS/Node10 profile, an explicit alternate ES2020 profile
for profile-identity coverage, a bounded process-local LRU containing only
compiler output, exact source-content hashing, filename/profile/compiler/loader/
TypeScript-version identity, and `finally` restoration for nested and throwing
loads. No disk cache was added.

The loader suite passes 4/4. It proves exact content invalidation even with
mtime restored, ignores mtime-only changes, separates explicit profiles, and
does not retain a derivative when module execution throws. Migrated entrypoint
syntax and `--help` checks pass; typecheck, hardening, and the source parity
suite pass.

Discovery now constructs a bounded `createCallScopedSourceReadView` after the
scan inventory is available. It indexes only unique eligible records with a
non-null source SHA and content digest, verifies the first downstream read
against that digest, then retains only positive exact text in the ephemeral
view. Rejected, unavailable, ambiguous and mismatched reads call through and
are never cached. The focused source-read suite passes 4/4. Its synthetic
instrumentation found two underlying reads of the shared handler during one
discovery (scan plus first downstream read), with later joins/observations
reusing the value; no raw marker appears in safe inventory/projections.

The affected source cone (source parity, surfaces, response flow, readonly and
eligibility tests) retained the safe-output/evidence identity contract. The
read view is scoped to one call and is not serialized or exposed in discovery
DTOs.

## M5 parser/token decision

The same five `--json` source-census commands were repeated after `dc368eb`.
The inventory remained six CURRENT repositories with the original snapshot
digest `srcsnapshot:sha256:04ff583971865f335902f5ad`; normalized safe
projections matched the prior optimized baseline for source-scan, source-gaps,
eligibility-census, readonly-census and surfaces. A representative wall/RSS
run was source-scan 3.35s/266,444 KB, source-gaps 3.67s/318,044 KB,
eligibility-census 4.18s/265,640 KB, readonly-census 4.19s/387,436 KB, and
surfaces 6.40s/271,444 KB. Repeated runs showed environment variance, with
source-gaps 4.20–6.37s, eligibility 3.77–3.80s, readonly 3.56–3.67s and
surfaces 4.27s; the reported tokenizer/declaration metrics stayed at 94 PHP
files, 766 declarations, 32,027 max tokens and 242,093 max source bytes.

A V8 profile of `surfaces --json` recorded 4,409 ticks and 284 ticks in
`tokenizePhp` (6.4%). Shared parse/token work is rejected for this checkpoint:
the current tokenization is composed across the independent Phase 14 extractor,
Phase 20 analyzer and Phase 26 extended analyzer, with symbol/hint-specific
inputs and separate evidence construction. A safe cache would require a
cross-authority API change whose complete identity parity was not proven by
the current evidence. No parser authority or contract version was changed;
the independently validated loader and source-read wins remain.

## M6 adversarial hardening

The focused read-reuse fixtures now cover same-path identity separation across
repositories and source snapshots, same-mtime content changes, rejected and
unavailable fallback, a 512-entry bound, a throwing reader and a mutation
during discovery. The capacity test performed 514 authoritative reads,
retained exactly 512 entries and left one overflow read uncached; a failed
read did not create a partial entry. The mutation integration returned the
changed text to the existing stale/proof path, kept response proof non-PROVEN,
kept the Phase24 portfolio at zero eligible candidates and exposed no raw
marker in the discovery DTO.

The 45-test affected source cone passed in 17.8s: call-scoped read 6/6,
runtime loader 4/4, eligibility, source-boundary, surface, response-flow,
source-intelligence, readonly and related regression cases. The standalone
source-analysis parity harness passed 2/2 in 11.2s. Existing response-flow and
source-boundary cases cover multiple symbols, symbol ambiguity/not-found,
malformed and oversized inputs, privacy sentinels, stale snapshots and
unsupported paths. `npm run typecheck`, `npm run hardening:check` and
`git diff --check` passed.

## M7 architecture and compatibility sweep

The known large/hot modules were reviewed in place: `orchestrator.ts` (2,073
lines), `surfaces.ts` (867), `sourceAnalyzers.ts` (845), `hardening-check.mjs`
(1,663) and Control Center `App.tsx` (533). Each keeps a cohesive authority,
safety, or projection boundary; no campaign-scoped correctness, performance,
ownership or testability defect justified a line-count-only split. The fourteen
Playwright configurations are small inherited wrappers with intentionally
separate opt-in test matches for authenticated, real, synthetic and phase
specific paths; merging them would weaken accidental-contact isolation.

The affected operator/compatibility unit sweep passed 71/71 in 12.8s. The
synthetic campaign passed 66/66 in 21.4s, and owner-provenance passed 91/91 in
20.4s. The Control Center UI passed typecheck, 11/11 Vitest tests, production
build verification, and its loopback synthetic browser check passed 1/1 in
10.5s while reporting no external requests or page errors. Source operator
previews for contracts, gaps, source gaps, eligibility, readonly candidates,
surfaces and review queue all exited 0 with empty stderr and emitted their
existing bounded safe DTO shapes.

## M2 differential parity evidence

`tests/helpers/sourceParity.ts` provides a deterministic safe projection over
the full source-discovery and Phase 24 integration cone: inventory records and
content digests, ordered operations, surfaces, joins, analyzer diagnostics and
evidence digests, response-flow proofs, counters, gap taxonomy, Phase 24
snapshot analyses, portfolio candidates/reasons, selection rows, eligibility
census and review queue rows/digests. Advisory elapsed timings are excluded
from the equality bytes because they are explicitly non-authoritative; no
source text or runtime value is projected.

The synthetic fixture contains two GET symbols in one handler file with
different response shapes. The harness proved equal repeated runs, preserved
different response evidence and semantic identities, and omitted a raw source
marker from the serialized projection. The first development run was 3/3
passing, including temporary order, identity and currentness mutations; each
mutation produced `SOURCE_PARITY_MISMATCH`. Those temporary probes were then
removed. The final focused run is 2/2 passing.

The CLI byte check runs `contracts`, `differential`, and `mutation-score`
twice each. Every invocation returned status 0 and empty stderr; each pair
had byte-identical JSON stdout. `npm run typecheck` also passes.

## M1 audit and baseline evidence

The deterministic tracked-file manifest used `git ls-files -z`, NUL-safe path
handling, and bytewise C-locale sorting. Every one of 1,303 tracked paths was
read and hashed; the manifest SHA-256 is
`e9269825ec1d63d7ca329b3bb674faaba0c7989fa1a483631ead3b4a442e422b`, the
per-file hash ledger SHA-256 is
`4a54cc1531c86ff5b4cadd450827c65c6522f87016db78476ddb341d7195e032`, and
the total is 14,211,727 bytes / 284,308 lines. Sanitized category counts are:
agent/tooling/planning 435; executable source 405; tests 228; fixture/corpus
112; bin CLI 49; durable docs 30; config/workflow 25; UI 14; scenario 1;
artifact scaffold 1; other 3.

The affected runtime-loader census found exactly 20 `.ts` require hooks under
`bin/`. All use ES2022/CommonJS/Node10 with `esModuleInterop` and
`skipLibCheck`, and all save/restore the prior extension hook in `finally`.
`bin/portfolio.mjs` uses a distinct compiler fingerprint path and is retained
outside this duplicate-hook migration. Source discovery has one production
operator caller (`bin/nightwatch-intelligence.mjs`), one Control Center
authority adapter, and synthetic/unit/browser consumers. The exact-read cone
is the confined sibling reader, scan inventory, response-flow index, handler
joins, per-operation observations, response declarations, readonly census and
semantic expectation paths.

Hygiene counts were TODO 11, FIXME 2, HACK 3, XXX 1, DEPRECATED 30,
dead-path 4 and duplicate 1,401 matches. Manual review classified affected
duplicate hits as intentional duplicate detection/deduplication, historical
records or fixtures; no unrelated cleanup is part of this campaign.

Baseline representative source commands all exited 0 with empty stderr:

| command | stdout bytes / SHA-256 | wall | peak RSS |
| --- | --- | ---: | ---: |
| source-scan | 685,354 / `5e6344a6…4dfdb66` | 12.89s | 265,104 KB |
| source-gaps | 29,150 / `63ec5588…854550c` | 10.97s | 261,424 KB |
| eligibility-census | 394,890 / `b338dafa…e93d452` | 10.28s | 263,088 KB |
| readonly-census | 18,024 / `bf6e6749…26e91ac` | 11.46s | 262,220 KB |
| surfaces | 1,829,001 / `d34bb0ee…3b9fff8` | 10.88s | 301,564 KB |

The inventory was six CURRENT repositories with 1,732 considered, 1,092 read,
1,078 admitted and 654 rejected files; the safe snapshot/config digests were
`srcsnapshot:sha256:04ff583971865f335902f5ad` and
`srcconfig:sha256:e8bdfc8f0e58d7d93a87215`. These baseline outputs are
sanitized and remain outside Git under `/tmp`.

## Safety statement

No product environment, authentication material, owner-only findings, data
store, cloud/infrastructure system, Alphaus sibling write, external
publication, runtime model, or self-development promotion path has been used.

## Executive summary

The campaign completed the authorized mechanics-only optimization. Twenty
equivalent bin-local TypeScript hooks now delegate to one bounded,
content-addressed process-local loader. Discovery now reuses verified exact
source text only inside one call-scoped snapshot view. The full source/Phase24/
review differential harness retained safe-output, evidence-digest, contract,
ordering, currentness, eligibility and fail-closed identity. A deeper shared
parser cache was measured and explicitly rejected because its identity would
cross independent analyzer authorities.

The final implementation checkpoint is `7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c`.
The final local gate and the disposable Node20 clean gate pass at that source
head. The task is closed under continuity protocol v2; no product, data,
infrastructure, authentication, publication, runtime AI or self-development
authority was used.

## Exhaustive audit and bottleneck evidence

The M1 audit read and hashed every 1,303 tracked path. The sorted tracked
manifest digest is
`e9269825ec1d63d7ca329b3bb674faaba0c7989fa1a483631ead3b4a442e422b`; the
per-file hash ledger digest is
`4a54cc1531c86ff5b4cadd450827c65c6522f87016db78476ddb341d7195e032`; total
tracked content is 14,211,727 bytes and 284,308 lines. Sanitized classes are
agent/tooling/planning 435, executable source 405, tests 228, fixture/corpus
112, bin/CLI 49, durable docs 30, config/workflow 25, UI 14, scenario 1,
artifact scaffold 1 and other 3.

The loader census found 20 `.ts` require hooks under `bin/`, all with the same
ES2022/CommonJS/Node10, `esModuleInterop` and `skipLibCheck` profile and
finally-based restoration. `bin/portfolio.mjs` has a distinct compiler
fingerprint path and was intentionally retained. The source-read audit covered
scan inventory, response-flow indexing, handler joins, per-operation analysis,
response declarations, readonly census, semantic expectation paths and the
confined sibling reader. The production discovery caller is the local source
preview in `bin/nightwatch-intelligence.mjs`; Control Center and synthetic
tests are the other integration consumers.

The approved synthetic/source snapshot contains six CURRENT repositories:
1,732 files considered, 1,092 read, 1,078 admitted, 654 rejected and
12,449,877 bytes, with 440 directories and two budget rejections. Its safe
identities are `srcsnapshot:sha256:04ff583971865f335902f5ad` and
`srcconfig:sha256:e8bdfc8f0e58d7d93a87215`.

## Implementation decisions

`bin/lib/typescript-runtime-loader.mjs` is the sole equivalent runtime loader,
with a declaration file at `bin/lib/typescript-runtime-loader.d.mts`. Its
process-local LRU retains compiler output only, is bounded at 256 entries and
uses a key containing loader version, TypeScript version, profile name,
compiler options, absolute filename and the exact source-byte digest. It
supports the audited default profile plus an explicit ES2020 profile for
identity coverage, restores nested and pre-existing hooks in `finally`, and
remembers a derivative only after module compilation/execution succeeds. The
module-list input is bounded at 128 entries; no disk cache was justified.

`src/core/source/callScopedRead.ts` creates an ephemeral view only after the
source inventory establishes repository, SHA, path, content digest and status.
The first downstream read is checked against the inventory digest before being
retained. Rejected, unavailable, ambiguous, oversized, stale or digest-
mismatched records use the existing reader/fail-closed path and are never
cache authority. `src/core/source/surfaces.ts` supplies this view to the
response-flow, route, join and observation consumers without serializing it.

The compatibility sweep found a real hidden coupling: the new shared loader
was missing from the synthetic self-development authoritative source bundle.
`src/core/selfDev/provenanceManifest.ts` now includes it. Assertions were kept
strict; the isolated portfolio suite passed 30/30, adoption CLI passed 7/7,
and the complete compatibility manifest passed afterward.

## Parity, digest and adversarial proof

The differential harness in `tests/helpers/sourceParity.ts` compares the full
safe source-discovery, Phase24 and review surface, including inventory and
ordering, proof states, analyzer statuses/versions/reasons/evidence digests,
response-flow identities, response and semantic contract IDs, census and gap
digests, eligibility/reason rows and review projections. Advisory elapsed
timings are excluded because the existing contract marks them non-authoritative;
no source text or runtime value is projected. The final parity suite passed
2/2, repeated discovery was byte-stable, same-file symbols remained isolated,
and the raw synthetic marker was absent.

The deterministic CLI byte checks ran `contracts`, `differential` and
`mutation-score` twice each with status 0, empty stderr and identical JSON
stdout. Normalized safe-output digests matched the optimized baseline:

| projection | normalized digest |
| --- | --- |
| source-scan | `c07b2079bf0b22281b01561501c38b0160521eca64b8cfaef1184ac9f7a6b920` |
| source-gaps | `ffd3c1be9a3f43618ca4f5215cda8e57d4b42fd61c2ceaaa2a3aeb81e461f8ca` |
| eligibility-census | `604827c2addbe706cea6f7e4189d55bb6e0ed70cbdaeed189bbf24fb8e320219` |
| readonly-census | `d5b8513095487357ddbb2e92c233d0967030a744532dfb7b4758882d5d6df842` |
| surfaces | `c00b70c4ec96a49e629a5d94ca6e64a11276d0466d60f1aa69fbe6149c0502b0` |

The affected source cone passed 45/45. The call-scoped source-read suite
passed 6/6, including same-path cross-repository and cross-SHA separation,
same-mtime content mutation, rejected/unavailable fallback, a 512-entry read
bound, throwing-reader non-retention and mutation-during-discovery proof
nonmanufacture. The loader suite passed 6/6, including exact-content and
mtime-only controls, profile separation, nested/throwing hook restoration,
256-entry LRU eviction and the over-limit module-list rejection. Existing
source-boundary, response-flow, analyzer, readonly and eligibility tests cover
malformed, oversized, privacy-sentinel, stale, ambiguous, unsupported,
symbol-not-found, multiple-symbol and Phase24 exclusion behavior.

## Performance evidence

All measurements used the same local `node bin/nightwatch-intelligence.mjs`
source-census commands, empty application stderr and status 0. Timing is
reported as an observed fresh-run range rather than a promise about host
capacity; one eligibility RSS result was an explicit host-variance outlier.

| command | baseline wall / peak RSS | optimized fresh wall range / peak RSS |
| --- | ---: | ---: |
| source-scan | 12.89s / 265,104 KB | 5.34–7.13s / 266,748–270,172 KB |
| source-gaps | 10.97s / 261,424 KB | 4.73–6.10s / 263,776–267,100 KB |
| eligibility-census | 10.28s / 263,088 KB | 4.93–7.23s / normal ~267 MB; one 316,864 KB outlier |
| readonly-census | 11.46s / 262,220 KB | 4.95–6.01s / 265,500–267,420 KB |
| surfaces | 10.88s / 301,564 KB | 4.84–5.70s / 268,796–270,156 KB |

The raw byte-bearing census outputs vary only in advisory performance fields;
the normalized structural/safe identities above remain equal. Tokenizer
metrics remained 94 PHP files, 766 declarations, 32,027 maximum tokens and
242,093 maximum source bytes. The V8 profile recorded 284 of 4,409 ticks in
`tokenizePhp` (6.4%), insufficient evidence for a cross-authority parser cache.

## Compatibility and validation ledger

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS; offline structural invariants hold.
- `npm run project:check`: PASS; canonical catalog round trip, phase-8
  authority and active-task continuity pass.
- `npm run agent:check`: PASS with zero strict errors; the final complete task
  state has no unresolved continuity errors. Historical v1 task warnings are
  retained by policy.
- `npm run agent:audit`: PASS with zero strict errors; 55 strict v2 tasks and
  24 historical v1 tasks were inventoried.
- `npm run test:semantic-compat`: PASS, 1,884 total / 1,871 passed / 13
  canonical skips / 0 failed, across phases 9–26 and 141 manifest files.
- `npm run campaign:synthetic`: PASS, 66/66.
- `npm run test:owner-provenance`: PASS, 91/91.
- Affected operator/Control Center unit sweep: PASS, 71/71. Control Center UI
  typecheck PASS, Vitest PASS 11/11, build verification PASS and synthetic
  seven-view browser path PASS 1/1 with no external requests or page errors.
- Final `npm run gate:local` at `7b95cd4`: PASS, all 9/9 required groups,
  receipt `receipt:sha256:a8b426932b8c141801c0ff40`.
- Final `npm run gate:clean` at `7b95cd4`: PASS under Node 20, install and all
  9/9 groups PASS, clean before/after, no node_modules reuse, no auth or
  owner-finding state and sibling writes 0; clean receipt
  `clean-receipt:sha256:9483e8260a8e7ca718341e26`, embedded gate receipt
  `receipt:sha256:1e8ac0b2c03f2f35b3eb762d`.
- `git diff --check`: PASS on every checkpoint; final changed paths contain
  no raw sibling source, secret, owner-only finding or private runtime
  artifact.

## Regressions fixed, rejected candidates and residual risks

The only reproduced compatibility regression was the missing shared-loader
entry in the synthetic self-development source bundle. It was repaired in
`5b4f8db`, then verified by the isolated portfolio, adoption CLI and complete
semantic suites. A strict TypeScript test guard was also added after the first
eviction-test run exposed an unchecked array element; the corrected loader
suite is 6/6.

Shared parser/token state was rejected at M5: the measured tokenizer share was
6.4%, but safe reuse would cross independent Phase 14, Phase 20 and Phase 26
analyzer inputs, symbol/hint semantics and evidence construction without a
complete identity proof. The distinct `bin/portfolio.mjs` compiler path,
large cohesive authority modules and intentionally isolated Playwright
configurations were reviewed and retained. No disk source or derivative cache,
new proof family, eligibility authority, or feature-phase scope was added.

Remaining risks are limited to ordinary host timing/RSS variance, the
call-scoped view’s intentional exact-snapshot lifetime, and external Actions
availability. These do not change safe-output authority or local verdicts.

## Git and external CI truth

The campaign started from pulled head `bebe357313b7210161c5524e90c442137a605aab`.
Validated implementation checkpoints were `dc368eb` for the loader/read
implementation, `e1f2b54` for adversarial hardening, `5b4f8db` for the
self-development bundle repair, `76c06cb` for the LRU-bound clean gate and
`7b95cd4` for the terminal bounded-input tests and final gates. Normal
fast-forward pushes were used; after the final implementation push,
`HEAD == origin/main == 7b95cd459c5c2f578d4a4344e46fe7c9ae7f574c` and the
worktree was clean.

The observed Actions run for prior pushed head `5b4f8db` was run
`32984921837`, sole job `98229480580`, completed failure with `steps: []`.
It is classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not code failure and
not green CI evidence. The subsequent exact-head lookups for the newer pushed
source checkpoints returned no matching workflow row at observation time;
external CI is therefore not claimed green. Local and Node20 clean receipts
remain the authoritative validation evidence.

## Safety and closure statement

All execution stayed in this Nightwatch repository, local synthetic fixtures,
offline operator projections and disposable local checkouts. No DEV, NEXT or
production environment was contacted; no authentication or customer data was
used; no database, cloud, Kubernetes, IAM, datastore or infrastructure
operation was performed; no sibling Alphaus repository was modified; no raw
source or owner-only finding entered Git; no runtime AI or self-development
promotion authority was invoked. Native continuity v2, OpenSpec and Git
records are reconciled, all 53 OpenSpec tasks are checked, and the task is
terminal: do not resume without a fresh separately authorized campaign.
