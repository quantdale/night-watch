# Planner Deep Audit — Source-Proof Soundness Campaign Selection

## Audit basis

Planning baseline: main at 266b5fcbb4c80125939f41df3bf9b5608654c753.

The live recursive Git tree contains 1,310 tracked blobs across 1,576 total tree entries and 266 directories; GitHub reported the recursive tree as non-truncated. The planner inventoried every tracked path and deep-read current continuity, durable architecture/safety/state, recent campaign reports, package/gate definitions, the source proof chain, representative high-value tests, and recent commits.

Repository distribution at this baseline includes:

- 406 files under src/
- 232 files under tests/
- 417 historical files under .agent/tasks/
- 112 files under corpus/
- 51 files under bin/
- 30 files under docs/
- 14 files under ui/
- 5 files in the existing completed OpenSpec change

By extension the repository contains 688 TypeScript files, 475 Markdown files, 71 JSON files, 52 MJS files, plus smaller YAML/PHP/TSX/config populations.

The GitHub connector can inventory the complete tree, but it cannot render 1,310 file bodies in one bounded planner call. This document therefore does NOT make the false claim that every byte of all 1,310 files was loaded into planner context. The executor's H0 gate requires a literal local git ls-files content sweep with an accounted-for manifest where reviewed-count equals tracked-count before implementation.

## Current project truth

1. Nightwatch is a private local autonomous bug-hunting and evidence-triage framework with strict read-only and fail-closed safety semantics.
2. The current .agent/ACTIVE_TASK.md points to nightwatch-source-analysis-runtime-hardening-v1 and marks it COMPLETE with next action STOP. It must not be resumed.
3. Recent campaigns already optimized validation/Git/runtime-loader/source-read mechanics. Shared parser/token caching was measured and rejected because benefit did not justify proof-identity risk.
4. Existing source/read-only/proof-chain campaigns repeatedly refused heuristic authority expansion. That restraint remains mandatory.
5. GitHub Actions has recently produced exact-head failures with steps: [] and is durably classified as an external billing/platform/no-runner block, not repository code evidence.
6. The current .agent/EXECUTION_PROMPT.md still routes to the now-completed source-analysis optimization and is stale for a new executor run.

## Repository architecture reviewed

### Source proof chain

The load-bearing chain is:

confined sibling source reader
→ bounded snapshot scan/currentness
→ route extraction
→ route/handler/request/response joins
→ syntax-aware source analyzers
→ response-flow proof
→ response/semantic contract evidence
→ gap taxonomy
→ source descriptor
→ read-only/runtime/component facts
→ Phase-24 candidate adapter
→ portfolio / selection / eligibility census
→ review/operator/Control Center projections

Important files include:

- src/core/source/siblingSource.ts
- src/core/source/scan.ts and scanTypes.ts
- src/core/source/callScopedRead.ts and cache.ts
- src/core/source/surfaces.ts
- src/core/source/responseFlow.ts
- src/core/source/gapTaxonomy.ts
- src/core/source/eligibilityCensus.ts
- src/core/source/readonlyCandidateCensus.ts
- src/core/semanticCoverage/sourceAnalyzers.ts
- src/core/phase24/*
- src/core/portfolio/*
- src/core/triage/*
- src/controlCenter/*

### Structural hotspots

Large authority-bearing modules include:

- src/core/campaign/orchestrator.ts — about 120 KB
- src/core/source/surfaces.ts — about 61 KB
- src/core/campaign/identity.ts — about 54 KB
- src/core/semanticCoverage/sourceAnalyzers.ts — about 52 KB
- src/core/campaign/checkpoint.ts — about 51 KB
- bin/hardening-check.mjs — about 116 KB
- ui/control-center/src/App.tsx — about 54 KB

Large size alone is not a defect. These are review/hardening targets, not automatic refactor targets.

The root package has strong bespoke typecheck, hardening, semantic-compatibility, synthetic, provenance, local, clean, and inventory gates. It does not currently expose a general lint script. A lint campaign is lower priority than authority correctness and is not selected here.

## Latest measured source state

The newest completed proof-chain census reports:

- 128 surfaces
- 127 route proofs
- 127 request contracts
- 83 response contracts
- 83 semantic-contract surfaces / 175 observations
- 118 proven / 10 rejected joins
- 47 mutation-capable
- 5 proven read-only
- 5 exact runtime bindings
- 5 replay bindings
- 128 dossier-compatible
- 3 eligible / 125 excluded in Phase 24

Primary blockers:

- response contract: 44
- mutability classification: 37
- read-only proof: 43
- route: 1
- complete: 3

Known unsupported families:

- control-flow: 115
- dynamic-dispatch: 9
- return-expression: 22
- unsupported syntax: 179

The same campaign found 13 response-flow attempts and 0 proven flows, 45 response/semantic proof-gap surfaces, 123 source-only runtime bindings, and no mechanically complete new proof family. Therefore runtime-binding, read-only, and dynamic-dispatch expansion are NOT selected.

## P0 finding A — direct PHP response proof may ignore implicit fall-through

src/core/semanticCoverage/sourceAnalyzers.ts currently has an extended direct-return analyzer that:

- tokenizes the function;
- scans for every return token;
- requires each encountered return to be a direct literal array;
- compares root/field shapes across encountered returns;
- emits PHP_RETURN_ROOT_TYPE / PHP_RETURN_OBJECT_FIELDS / field-type observations when those encountered returns agree.

The visible algorithm does not prove that the set of encountered returns covers every reachable function exit.

A minimal adversarial probe is:

~~~php
function readExample($mode) {
    if ($mode) {
        return ['id' => 1];
    }
}
~~~

There is one explicit object return and an implicit fall-through exit. Static inspection indicates the current direct-return analyzer can still produce a mechanically-provable object/field observation because it sees only the explicit return.

This becomes load-bearing in src/core/source/surfaces.ts: responseEvidence filters observations to status MECHANICALLY_PROVABLE with a non-null shape. If at least one exists and handler/reference joins are proven, it constructs response/semantic identities and returns responseProof: PROVEN and semanticProof: PROVEN.

The existing Phase 26 test proves a valid two-path shape where a conditional return is followed by an unconditional fallback return. It also covers variable/dynamic/mismatched returns. It does not cover the simpler conditional-only implicit fall-through case.

Disposition: mandatory H1 reproduction. If reproduced, treat as a correctness defect and fix before coverage work. Do not preserve an unsound proof merely for digest parity.

## P0 finding B — raw-regex static route discovery is lexically vulnerable

src/core/source/surfaces.ts parseStaticRoutes currently applies regular expressions directly to sourceText for:

- TypeScript/JavaScript: router/app/route .get/.post/etc
- Go: .GET/.POST/etc

No comment/string lexical exclusion is visible around these raw regex matches.

Representative probes:

~~~ts
// app.get("/ghost", ghostHandler)
const documentation = 'router.get("/also-ghost", anotherHandler)';
~~~

~~~go
// router.GET("/ghost", ghostHandler)
~~~

A raw regex can match these code-like strings/comments and emit a routeProof: PROVEN row. Downstream handler/response gates may later exclude the surface, but route inventory itself should not assert source truth for non-code.

Disposition: mandatory H1 reproduction through the public discovery path. If reproduced, introduce a bounded lexical-aware route scanner or equivalent exact mechanism. Do not replace it with a full runtime parser or framework execution.

## P1 finding C — raw-regex handler declaration counting can be contaminated

resolveSurfaceJoins uses declarationCount, which counts function declarations with regular expressions over raw sourceText. For PHP, a comment or string containing text such as function readExample( can affect the declaration count.

Potential outcomes:

- one real declaration plus one comment-shaped declaration → MULTIPLE_SYMBOLS false rejection;
- one fake textual declaration with no real body → handler join can be marked PROVEN even though the analyzer later fails to locate an executable declaration.

This may not directly manufacture a final response contract because later syntax analysis can fail, but join truth and coverage/census data should still be lexical-source sound.

Disposition: harden in the same lexical-authority workstream and add positive/negative tests.

## P1 finding D — proven observations dominate response authority

responseEvidence intentionally admits any mechanically-provable structural observation and ignores rejected observations when constructing the proven shape set. That design is reasonable when different analyzers independently prove different properties, so a blanket "any rejection blocks all proof" rule would be incorrect.

Consequence: fixes must be placed in the analyzer or proof-family completeness boundary that owns the fact. Do not solve P0 A by globally making all mixed proven/rejected observation sets fail.

## Existing defenses that must be retained

The audit also verified strong existing boundaries:

- source scanning is bounded and content-digest/currentness aware;
- sibling source access rejects unsafe paths/symlinks and is read-only;
- call-scoped source reuse is exact-snapshot/content bound and capped;
- source surface cache is bounded and identity-keyed;
- response flow is bounded by source bytes, declaration count, return sites, fan-out/depth and fails closed on dynamic dispatch;
- privacy sentinel handling precedes proof generation;
- evidence identities are deterministic and cryptographically bound;
- Phase-24 only maps PROVEN_READ_ONLY to read-only authority;
- non-GET methods are conservatively mutation-capable;
- source-only runtime bindings are not promoted to exact runtime authority;
- raw source is not returned in proof DTOs.

The new campaign must strengthen these, not bypass them.

## Candidate ranking

### P0 — control-flow-complete PHP response proof

Highest value because a false mechanically-provable response shape can become responseProof/semanticProof PROVEN.

Preferred solution is a deliberately narrow path-completeness recognizer, not general PHP interpretation. Safe recognized forms may include:

- straight-line unconditional terminal literal return;
- complete top-level if/elseif/else where all branches terminate in compatible proven shapes;
- conditional early return followed by an unconditional terminal fallback, when every reachable path is mechanically accounted for.

Loops, exceptions, goto-like behavior, yield, dynamic dispatch, nested unsupported control flow, ambiguous aliases, and unknown exits remain rejected unless separately proven.

### P0 — lexical-safe route and declaration discovery

Remove comment/string false positives while preserving currently supported real route/declaration forms and deterministic ordering.

### P1 — analyzer/source authority decomposition where it reduces proof risk

After behavior is locked by tests, small pure helpers may move out of the 61 KB surfaces.ts or 52 KB sourceAnalyzers.ts files if doing so creates a clear single owner for lexical scanning / path completeness and exact parity can be demonstrated.

Do not split giant files for aesthetics.

### P2 — exact static proof-depth expansion

Only after the hardened fresh census. A new static response family may be admitted only if current source supplies a repeated exact construct with complete positive and adversarial proof. Dynamic dispatch, runtime inference, GET-only read semantics, and fuzzy matching remain excluded.

### Rejected primary directions

- another runtime-loader/source-read optimization campaign — just completed;
- shared parser/token cache — recently measured and rejected;
- disk-backed source cache — rejected persistence authority;
- read-only method heuristic — unsafe and previously rejected;
- runtime-binding generalization — 123 source-only rows have no exact current match family;
- workflow changes for zero-step CI — external condition;
- broad campaign orchestrator rewrite — no reproduced defect justifies it;
- general lint adoption — useful hygiene, but not the highest-risk current seam.

## Why this is the next campaign

The project is mature enough that "more coverage" can be dangerous if the proof engine overstates source truth. The correct next move is to harden the exact boundary that converts source syntax into mechanically-provable evidence, then remeasure what coverage is actually earned.

This campaign can finish with fewer proven surfaces and still be a success if those removed proofs were unsound. Correctness outranks count growth.
