# Phase 25 Report

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Status: COMPLETE
Repository: `quantdale/night-watch`
Branch: `main`
Starting SHA: `7beb18689cf2cd50d1d5383b34f51c2789cd0a54`
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Terminal handoff

Phase 25 is complete as `COMPLETE_LOCAL_SOURCE_EXPANSION`. The campaign stayed
LOCAL / READ-ONLY SOURCE / SYNTHETIC ONLY. Implementation checkpoints were
committed directly to `main`; no feature branch, pull request, Alphaus write,
DEV launcher, auth-state read, product request, database/cloud operation,
publication, or raw private persistence occurred.

## M1 checkpoint evidence

M1 hardened `src/core/source/siblingSource.ts` so approved source reads use
structural containment, component-by-component symlink rejection,
`O_NOFOLLOW`, regular-file checks, and bounded reads. Git currentness now
supports exact loose refs, exact packed refs, detached HEAD, and safe in-root
`.git` indirection; malformed, ambiguous, symlinked, or unsafe shapes fail
closed.

Validation: the Phase 25 source-boundary matrix passed 7/7; the Phase 23
quality-gate compatibility tests plus Phase 25 matrix passed 13/13;
`npm run typecheck`, `npm run hardening:check`, and
`npm run quality-gate:spec` passed; `git diff --check` passed. Phase 25 was
registered in the authoritative semantic compatibility range 9–25.

## M2 checkpoint evidence

M2 added the data-only scan contract
(`nightwatch.real-source-scan-config.v1`) and the deterministic inventory
(`nightwatch.real-source-snapshot-inventory.v1`). The scanner accepts fixed
relative roots/extensions/analyzer identifiers, enforces file and total-byte
budgets, records exact current HEAD identity, rejects stale expected SHAs,
and hashes the text read after no-follow metadata enumeration. Inventory DTOs
contain only safe paths, language/size/status metadata, opaque content
digests, rejection codes, counters, and deterministic snapshot identity.

Validation: the combined M1/M2 boundary and inventory suite passed 10/10;
typecheck, hardening, quality-gate specification, and diff checks passed.
The authoritative compatibility inventory now contains 130 files across
Phase 9–25.

## M3 checkpoint evidence

M3 repaired the existing TypeScript validation-range analyzer so inclusive
and exclusive boundary semantics follow the actual outward guard operators;
reversed bounds, reversed operators, ambiguous names, and unsupported guards
remain rejected. Contract drift now uses explicit shape-aware comparison for
field sets, types, enums, ranges, defaults, ordering, pagination, aggregation,
presence, and mapping instead of serialized JSON length. Historical drift
vocabulary remains compatible while new incompatible and rederivation states
are explicit.

Validation: the Phase 20 semantic-coverage cone plus Phase 25 analyzer suite
passed 19/19; typecheck, hardening, and whitespace checks passed.

## M4 checkpoint evidence

M4 added fixed-pattern route/operation discovery for approved YAML, TypeScript,
JavaScript, Go, and OpenAPI shapes; exact runtime correlation; evidence-backed
read-only/mutation classification; ephemeral existing-analyzer-backed handler
contract extraction; safe component provenance; and a versioned surface
descriptor that converts directly to existing Phase 24 candidate inputs. The
synthetic route matrix proved one exact runtime-bound read-only candidate and
one mutation candidate excluded by existing Phase 24 authority. Source-only
and dynamic/unsupported surfaces remain visible without qualification.

Validation: the Phase 25 surface suite passed 2/2; quality-gate specification
passed with compatibility range 9–25 and 132 registered files; typecheck and
hardening passed. Safe handler symbols are structural identities only; the
test asserts that source bodies/literal values do not enter discovery output.

The next unit is exact cross-file joins and an additive source evidence graph;
no DEV or external source/product system was contacted.

## M5/M6 checkpoint evidence

M5 made the join boundary explicit. Each surface now carries deterministic
safe join records for route→handler and optional handler→request/response
schema references. A join is proven only when an exact allowlisted path is
current and, for symbols, exactly one declaration matches. Missing and
multiply-defined symbols are excluded with distinct states; source text and
literal values remain ephemeral.

M6 extended the existing Phase20 lifecycle graph rather than creating a
parallel dependency graph. When supplied, the graph records repository → file
→ operation → handler → request/response/semantic contract → Phase24 candidate
→ runtime/replay/dossier lineage with stable reason codes and stale
invalidation edges. With no Phase25 surfaces the historical graph output is
unchanged. The surface test proves graph determinism under shuffled input and
privacy-safe output.

Validation: the Phase20 + Phase25 focused cone passed 22/22; typecheck,
hardening, and whitespace checks passed. The full Phase9–25 compatibility
repair run passed 1840 tests with 1 canonical skip and 0 failures before the
M5/M6-only additive graph/join changes; it will be rerun at the next shared
compatibility checkpoint.

## M7–M11 implementation evidence

M7 now feeds discovered descriptors directly into the existing Phase24 source
snapshot adapter, candidate portfolio builder, and deterministic selector.
There is no Phase25 portfolio or replay planner. Runtime correlation remains
explicit (`RUNTIME_BOUND_EXACT`, `SOURCE_ONLY`, `AMBIGUOUS`, or source-version
mismatch), and every descriptor preserves unresolved deployment equivalence.

M8 compares two bounded inventories and stable surface identities for added,
removed, changed, and unchanged files, operations, handlers, request/response
contracts, semantic contracts, and lifecycle stages. Candidate state is
delegated to the Phase24 invalidation ledger. A relevant same-SHA content
change now invalidates replay and dossier assumptions even when semantic shape
is unchanged; an unrelated admitted file leaves candidate records current.

M9 added the fixed approved source universe, source-scan/surfaces/review-queue/
explain-surface local operator commands, exact component/repository provenance,
and explainable review factors. The real local smoke inspected only the
approved `mobingilabs/ripple-api` snapshot: SHA
`27bb007ad0c798800b6bd3b29760c966422966e7`, 96 files considered, 95 admitted,
1 privacy rejection, 1,742,807 inspected bytes, and 0 external contacts. It
found 128 bounded operations after truncating 95 additional route operations;
0 were Phase24-eligible, with exclusions retained as diagnostic output.

M10 added global duplicate-route rejection, a data-driven adversarial matrix,
privacy-safe unsupported-source visibility, and an in-memory bounded cache.
The cache key includes repository/source SHA, actual snapshot digest, scan
config, extractor version, and analyzer-set identity; dirty same-SHA content
cannot hit a stale extraction. M11 added the offline source → extraction →
Phase24 → semantic/replay/dossier → no-contact rehearsal campaign.

Focused evidence: Phase20/24/25 source cone 25/25 passed; adversarial,
invalidation, operator, and synthetic source campaign tests passed; the
synthetic campaign passed 29/29; typecheck and hardening passed; gate inventory
reported 141 unique authoritative files and 0 duplicate executions.

The first full compatibility attempt after these additions reported 1,847
tests with 1,844 passed, 1 canonical skip, and 2 failures only in existing
self-development CLI missing-artifact tests. Those tests observed the expected
`SELFDEV_AUTHORITATIVE_SOURCE_DIRTY` guard because this implementation was
still uncommitted. The required clean post-commit rerun is now PASS.

## Clean checkpoint validation

The implementation was committed directly to `main` in two fast-forward
checkpoints:

- `4c6d50d1f66477384dad85cdb91f88b38a1a7369` — source surfaces, direct
  Phase24 bridge, graph lineage, invalidation, review, cache, corpus, and
  synthetic campaign;
- `042300c7c59fd8218afabc761e31691139d0c657` — hardening-clean parser match
  repair.

Both were pushed to `origin/main`. The final continuity implementation repair
`f5356f3d94973b5ffc95c60623bf027a2864bfb5` was then committed directly to
`main` to classify the root README as an approved durable checkpoint path;
subsequent task/documentation closure records the known anchors without
predicting its own commit SHA. The clean compatibility receipt is PASS:
Phase 9–25, 135 registered
files, 1,847 total tests, 1,846 passed, 1 canonical skip, and 0 failures.
`npm run typecheck`, `npm run hardening:check`, and `npm run project:check`
also pass at this checkpoint.

## Safety

At bootstrap: DEV 0, NEXT 0, production 0, auth-state reads 0, product
mutations 0, database/datastore/cloud/infra operations 0, Alphaus writes 0,
publications/messages 0, raw private persistence 0, AI calls 0.

## Final measured metrics

### Git and topology

- Starting SHA: `7beb18689cf2cd50d1d5383b34f51c2789cd0a54`.
- Implementation checkpoints: `ac093ff3`, `5416469`, `683b0b8`, `4c6d50d`,
  `042300c`; validated continuity implementation checkpoint:
  `f5356f3d94973b5ffc95c60623bf027a2864bfb5`; continuity/compatibility
  checkpoint: `3e69c857dd5409675b6c2d8d13b59cfc87232576`.
- Branch: `main`; upstream: `origin/main`; final local and remote heads are
  required to remain identical and the worktree clean.
- No feature/development branch, merge, force-push, or pull request was used.

### Source access and extraction

- Approved universe: 6 repositories; inspected: 1 real repository plus
  synthetic fixtures. Real smoke: `mobingilabs/ripple-api`, SHA
  `27bb007ad0c798800b6bd3b29760c966422966e7`, root `src`.
- Inventory: 96 files considered/read, 95 admitted, 1 rejected for
  `SOURCE_PRIVACY_REJECTED`; 1,750,958 bytes read; 15 directories visited;
  symlink/path/budget rejections 0. Languages: PHP 95, YAML 1.
- Snapshot digest:
  `srcsnapshot:sha256:4193221edbe54844e49653cb`; config digest:
  `srcconfig:sha256:b4580bf77894fc8aaaa59a5b`; extractor:
  `nightwatch.real-source-scan-extractor.v1`.
- Analyzer/route metrics: 127 analyzer invocations, 128 bounded operations,
  127 route proofs, 0 ambiguous routes, 47 mutation-capable operations, 5
  proven read-only operations, 76 method-only read operations, 127 request
  contracts, 25 response contracts, and 25 semantic contracts. Dynamic or
  unproven cases remained excluded.
- Cross-file joins: 128 attempted, 118 proven, 10 rejected (10 unresolved
  handlers); cross-repository joins attempted/proven: 0/0. Deployment
  equivalence remained unresolved by policy.
- Portfolio bridge: 128 source surfaces considered, 3 Phase24-eligible
  existing-runtime-bound surfaces, 125 excluded; no fabricated target or new
  execution authority. Lifecycle distribution: 103 DISCOVERED, 22
  MECHANICALLY_PROVEN, 3 PROJECTABLE. Runtime binding: 5 exact, 123 source-only
  across the discovered surfaces. Component routing: 127 exact, 1 repository
  only, 0 human-owner inference.
- Source change intelligence: synthetic unrelated-file change preserved the
  candidate current; relevant same-SHA handler evidence changed and
  invalidated replay/dossier assumptions. Semantic shape was unchanged in that
  repair case. Replay invalidations: 1 synthetic relevant case; dossier
  invalidations: 1; runtime/differential invalidations: 0 in the bounded
  matrix.

### Review, cache, corpus, and determinism

- Review queue: 128 rows, 3 eligible/selected, 125 excluded; top safe IDs
  were `surface:sha256:9c1cd2677f4597be05ff62d7`,
  `surface:sha256:b670b243d8e828d9dd6ffbd1`, and
  `surface:sha256:166699278d953ecd63f3c6ed`.
- Cache: exact-content hit/miss, config/analyzer miss, corruption, dirty
  same-SHA invalidation, and bounded eviction cases passed; no raw source was
  cached. Performance counters are deterministic and bounded.
- Adversarial coverage: data-driven Phase25 route/access/privacy/cache and
  proof-soundness families passed with 0 false positives, 0 privacy
  regressions, and 0 determinism mismatches. The focused Phase25 source
  campaign passed 29/29; all quality-gate groups passed.

### Tests and gates

- Phase 9–25 semantic compatibility: 1,847 total / 1,846 passed / 1 canonical
  skip / 0 failed; 135 registered compatibility files.
- Gate inventory: 141 unique authoritative files / 0 duplicate executions.
- Owner provenance: 91 passed / 0 failed. Synthetic campaign: 29 passed / 0
  failed. Typecheck: PASS. Hardening: PASS. Agent continuity: 0 strict v2
  errors. Project truth: PASS.
- Local gate at `bae4d39577730ce9a031ecedd5112317f8db423b`: PASS, receipt
  `receipt:sha256:3341294c4e3ba07e02fd68cf`, gate definition
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`.
- Node20 clean checkout at `bae4d39577730ce9a031ecedd5112317f8db423b`:
  PASS, `npm ci --ignore-scripts`, clean before/after, no node_modules reuse,
  no auth/findings state, sibling writes 0, clean receipt
  `clean-receipt:sha256:2d3290a0bb2a62b9c8c469b3`, gate receipt
  `receipt:sha256:ffe8578b987391306d863d96`.
- Canonical full Playwright: 2,407 enumerated / 2,403 passed / 4 skipped /
  0 failed. Isolated topology-correct full Playwright: 2,407 / 2,403 / 4 /
  0. Skip identities matched exactly: three unavailable OOPS-binary tests
  and the foreign-UID sandbox test.

### External truth and safety

- One exact-head observation only: Actions run `32741057138`, job
  `97475353760`, exact head `3e69c857dd5409675b6c2d8d13b59cfc87232576`, step
  count 0, conclusion `failure`, classification
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. It is not green CI and was not
  retried.
- Safety counts: DEV 0, NEXT 0, production 0, auth-state reads 0, product
  mutations 0, database/datastore operations 0, cloud/infra operations 0,
  Alphaus writes 0, sibling writes 0, publications 0, messages 0, raw private
  persistence 0, AI calls 0.

## Phase 26 recommendation

The highest-value remaining local/source campaign is bounded expansion of
response and semantic contract proof for the 125 excluded surfaces, starting
with the 103 response/semantic-proof gaps observed in the approved Ripple API
snapshot. It should preserve exact joins, fail-closed ambiguity, and the
existing Phase24 authority; it does not imply DEV authorization.
