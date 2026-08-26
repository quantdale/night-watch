# Report — Source-Analysis Runtime Hardening

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

This is the live handoff for the authorized OpenSpec campaign. It is not a
completion claim. The final report will replace this opening with the required
audit manifest, bottleneck evidence, implementation decisions, parity/digest
proof, adversarial results, validation ledger, performance/RSS measurements,
rejected candidates, Git/Actions truth, safety vector, and residual risks.

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

M0 bootstrap and M1 exhaustive audit are complete. M2 differential parity
harness construction, M3 loader centralization, M4 call-scoped exact-read
reuse, M5 parser/token decision and M6 adversarial hardening are complete.
The validated M8 checkpoint is `5b4f8dbec70b3912b471bfaa5edaf23781c66651`;
M9 closure is in progress.

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

The disposable Node20 clean-checkout gate is intentionally carried into M9;
the current eviction-test and continuity checkpoint must be committed before
that clean gate can qualify the exact source head.

Performance reruns retained the approved source snapshot and normalized safe
digests. Representative current wall-time ranges were source-scan 5.34–7.13s
(12.89s baseline), source-gaps 4.73–6.10s (10.97s), eligibility-census
4.93–7.23s (10.28s), readonly-census 4.95–6.01s (11.46s), and surfaces
4.84–5.70s (10.88s). Normal runs used approximately 266–270 MB peak RSS;
one eligibility run reached 316,864 KB as host variance. All application
stderr was empty and status was 0. Normalized output digests matched the
optimized baseline; exact digest values are recorded in STATE.md.

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
