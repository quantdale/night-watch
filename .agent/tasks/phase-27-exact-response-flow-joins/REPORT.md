# Phase 27 Final Report — Exact Interprocedural PHP Response-Flow Intelligence

Task ID: phase-27-exact-response-flow-joins
Phase: 27-EXACT-INTERPROCEDURAL-RESPONSE-FLOW
Status: COMPLETE
Repository: quantdale/night-watch
Branch: main
Starting SHA: ff9ca34bfc6f5b08cad641a0c3d61a0bf49d5171
Validated implementation anchor: 237e537e154bdb7c0eb7b4bd04021f9c5437db29
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 1. Terminal status

The implementation and all local/source/synthetic validation are complete.
The final exact-head Actions observation was made against the pushed
implementation anchor and returned a job with no executed steps. The terminal
report, project-memory updates, and continuity records are complete; the
closure push and synchronized clean-main verification are part of this
terminal handoff. No product or DEV authority is implied.

## 2. Starting Git and approved-source state

Bootstrap confirmed the canonical writable repository, `main`, upstream
`origin/main`, and a clean worktree at the expected Phase 26 handoff
`ff9ca34bfc6f5b08cad641a0c3d61a0bf49d5171`. `git fetch --all --prune` was run
before implementation. Phase 26 was read as terminal history and was not
reopened or mutated.

The six approved read-only source repositories and exact source identities
used for the fresh census and final measurement were:

- `alphauslabs/blue-sdk-go @ 8883ee3d3a073352626c8c35e20e9fc5ed765373`
- `alphauslabs/blueapi @ 691422e5dc81afd263d064986fb50fcb3ea432a9`
- `alphauslabs/grpc-chunk-parser @ 66802f281698dfcf0903f0a117d4637fce3fd945`
- `mobingilabs/ouchan @ 565f00a87fb7616cc23c45d4ffeabee38a41c65f`
- `mobingilabs/ripple-api @ 27bb007ad0c798800b6bd3b29760c966422966e7`
- `mobingilabs/ripple-ui @ d80b161b684d9153c7e5acaa65ae1752d93d8ba9`

The canonical sibling checkouts had pre-existing owner changes in several
working trees. They were inspected only and never modified. The isolated
qualification used detached disposable clones, so its six source trees were
clean before and after execution.

Terminal Git state was verified after the closure push: `main` and
`origin/main` compared equal after `git fetch origin main`, the worktree was
clean, and no force-push was used. Live HEAD remains discovered from Git rather
than copied into a competing project-state field.

## 3. Fresh census and taxonomy

The census used the existing confined sibling-source reader and the existing
fixed approved universe. Identity and bounds were:

- source configuration: `srcconfig:sha256:e8bdfc8f0e58d7d93a87215c`
- extractor: `nightwatch.real-source-scan-extractor.v1`
- source snapshot: `srcsnapshot:sha256:04ff583971865f335902f5ad`
- 440 directories observed; two budget rejections; no symlink/path rejection
- approximately 3.3 seconds for bounded source scan and 2.5–3.1 seconds for
  surface projection on this workstation

The Phase 26 baseline reproduced exactly: 1,732 files considered, 1,092
read, 1,078 admitted, 654 rejected, and 12,449,877 bytes read; 128
operations, 127 route proofs, 127 request contracts, 62 response contracts,
138 semantic observations, 118 proven joins, 10 rejected joins, 47
mutation-capable operations, 5 independently proven read-only operations,
and lifecycle `66 DISCOVERED / 59 MECHANICALLY_PROVEN / 3 PROJECTABLE`.
Phase 24 remained `3 eligible / 125 excluded`.

The unresolved response families were classified from actual source syntax:

- 56 unsupported references, 9 missing symbols, and 1 outside-scope result;
- 28 PHP handlers reached the bounded lexer token-too-long guard; five were
  missing/unparseable, one was unavailable, and one lacked an exact handler
  symbol;
- tokenizable unresolved returns included 12 plain variables, 7 mixed-return
  functions, 4 `$this` property/service chains, 2 direct arrays, 3 direct
  built-ins, 2 variable member chains, and 1 `self::` static member;
- the 28 oversized lexical cases were separately classified as 9 direct-array,
  12 variable, and 5 mixed-return bodies without granting proof;
- no exact current route used a mechanically observable same-class helper,
  explicit named static helper, resource boundary, or DTO response boundary.

This census justified a hardening-first campaign. It did not justify runtime
service resolution, property-flow inference, framework emulation, fuzzy
matching, or speculative resource/DTO support.

## 4. Architecture implemented

The implementation adds the bounded
`nightwatch.real-source-response-flow.v1` proof layer in
`src/core/source/responseFlow.ts`. It composes the Phase 26 response proof
primitives and does not create a second semantic-contract, source-graph,
cache, or portfolio authority.

Supported exact call families are deliberately limited to:

- same-class `$this->method()` calls;
- same-file `self::method()` calls;
- exact unnamespaced `Class::method()` calls when one declaration is selected;
- same-file named-function calls;
- bounded chains with maximum depth 2, only when every terminal declaration is
  current, approved, branch-complete, and materially compatible with the
  existing analyzer vocabulary.

Every admitted synthetic flow records sanitized declaration identity containing
repository, exact SHA, confined relative path, declaration kind, symbol/class,
and content digest. Callsite edges retain only safe callsite/declaration
identity, call kind, and deterministic ordinal. The resolver never executes
PHP and retains source text only inside the ephemeral analysis closure.

The resolver indexes only current eligible PHP files from the existing
`SiblingSourceAccess` inventory. It enforces a declaration cap, depth cap,
cycle detection, exact target selection, same-SHA dirty-content checks,
branch-complete return discovery, and strict common-shape merging. Terminal
shape derivation reuses the existing Phase 26 analyzers; incompatible branch
shapes remain unresolved.

The bounded lexical hardening in `src/oracles/expectations/extract/php.ts`
recognizes oversized quoted values as opaque strings without retaining their
contents. Oversized structural keys remain rejected. This recovered truthful
structural proof where the string length was irrelevant while preserving the
existing semantic vocabulary and safety boundary.

Integration surfaces are additive:

- `surfaceTypes.ts` exposes response-flow evidence, rejection codes, and
  bounded attempt/proof/dependency counters;
- `surfaces.ts` resolves exact flow declarations before terminal Phase 26
  response analysis, checks root and terminal content for TOCTOU staleness, and
  carries flow lineage into response/semantic identities;
- analyzer-set identity includes response-flow v1, so cache entries cannot
  cross analyzer semantics;
- source invalidation fingerprints include proven and rejected flow lineage;
- graph output adds sanitized `RESPONSE_DECLARATION` and
  `RESPONSE_FLOW_CALLSITE` nodes and `RESOLVES_RESPONSE_FLOW` edges;
- review queue v3 exposes flow status, depth, declaration count, categorical
  rejection, and proof digest without source text;
- the existing Phase 24 adapter remains the sole eligibility/portfolio
  authority and no response proof is treated as read-only proof.

## 5. Supported and rejected families

The supported implementation is exact named, bounded, branch-complete,
current-source declaration flow. It is covered by synthetic positive controls
for same-class helpers, exact static/self calls, branch-identical returns,
bounded helper chains, and Phase 26-compatible row-key structures.

The following remain explicit fail-closed exclusions:

- dynamic method names, variable functions, `call_user_func`-style dispatch;
- ambiguous or duplicate declarations, unresolved imports, namespaced lookup
  without an exact resolver, and declaration shadowing;
- inheritance, overrides, interfaces, traits with unresolved precedence,
  polymorphic dispatch, magic methods, factories, service locators, and
  dependency-injection runtime resolution;
- `eval`, reflection, dynamic includes/requires, generated classes, framework
  behavior, vendor internals, runtime configuration dispatch, and opaque
  resource/DTO serializers;
- variable aliases and dynamic keys unless a complete supported literal flow
  exists;
- recursion, cycles, depth beyond 2, incomplete branches, malformed PHP,
  unsupported helper syntax, stale/missing/unavailable declarations, source
  path escapes, and same-SHA dirty dependency content.

No current approved route was upgraded by the interprocedural resolver: it
attempted 13 current unresolved patterns, proved 0, rejected 13, resolved 0
calls, and observed maximum depth 0. This is the truthful census result.

## 6. Before/after source and portfolio accounting

| Measure | Phase 26 baseline | Phase 27 final current-source result |
| --- | ---: | ---: |
| Operations | 128 | 128 |
| Route proofs | 127 | 127 |
| Request contracts | 127 | 127 |
| Response contracts | 62 | 83 |
| Semantic observations | 138 | 175 |
| Proven joins | 118 | 118 |
| Rejected joins | 10 | 10 |
| Mutation-capable operations | 47 | 47 |
| Independently proven read-only operations | 5 | 5 |
| Lifecycle `DISCOVERED` | 66 | 45 |
| Lifecycle `MECHANICALLY_PROVEN` | 59 | 80 |
| Lifecycle `PROJECTABLE` | 3 | 3 |
| Phase 24 eligible | 3 | 3 |
| Phase 24 excluded | 125 | 125 |

The +21 response contracts and +37 semantic observations come from the
bounded oversized-value lexical hardening and existing direct analyzers. The
flow resolver itself contributed no current-source join. Phase 24 eligibility
did not change. No scoring, candidate requirement, mutation classification,
GET interpretation, deployment identity, or read-only rule was altered.

The post-implementation response-gap taxonomy is:

- 7 `BRANCH_SET_INCOMPLETE + DYNAMIC_KEY_FLOW`;
- 25 `BRANCH_SET_INCOMPLETE + UNSUPPORTED_SYNTAX`;
- 3 `BRANCH_SET_INCOMPLETE + DYNAMIC_KEY_FLOW + UNSUPPORTED_SYNTAX`;
- 9 `RESPONSE_MISSING_SYMBOL`;
- 1 `RESPONSE_OUTSIDE_SCOPE`.

## 7. Currentness, invalidation, and cache behavior

Proof identity incorporates repository identity, exact source SHA, confined
path, declaration identity, declaration content digest, analyzer family and
version, normalized terminal structure, dependency declaration set, and
lineage edges. A flow is not admitted from a stale or unavailable declaration.
Root and terminal declarations are rechecked before the derived surface is
returned, preventing a same-run source replacement from retaining authority.

Tests cover same-SHA dirty helper content, changed helper/resource/DTO-style
dependency content, declaration disappearance, path/declaration movement,
ambiguous replacement, analyzer identity movement, dependency movement,
unrelated-file stability, source unavailability, and stale snapshots. Relevant
changes invalidate dependent response/semantic contracts, graph lineage,
replay/dossier assumptions through existing invalidation, and review identity;
unrelated changes remain stable where the existing currentness semantics allow.
Rejected flow states are fingerprinted too, so unsupported-to-supported or
supported-to-unsupported movement cannot retain historical authority.

The existing bounded cache is reused. Response-flow v1 is part of the
effective analyzer identity rather than a parallel cache. Repeated identical
analysis is a deterministic hit; analyzer/dependency/content/path changes are
misses; no raw source is stored in cache metadata or operator output.

## 8. Privacy and safety ledger

Synthetic planted secrets, fake bearer values, source sentinels, customer-like
values, raw response bodies, private runtime values, credentials, auth state,
and source snippets were not persisted. The Phase 27 corpus searches proof
IDs, digests, diagnostics, review output, graph nodes, lifecycle records,
cache metadata, dossiers, and task documents for sentinels; all remain clean.
Declaration IDs and digests are structural and irreversible; no secret is used
as an identifier input exposed to operators.

Safety ledger:

- DEV requests: 0
- NEXT requests: 0
- production requests: 0
- authentication-state reads: 0
- browser product observations: 0
- database/datastore/SQL operations: 0
- cloud/GCP/GKE/Kubernetes/AWS/IAM/STS operations: 0
- Alphaus repository writes: 0
- external publication, messages, issues, or tickets: 0
- AI/model runtime execution: 0
- canonical self-development promotion: 0
- raw private source persistence: 0

## 9. Adversarial and synthetic results

The nine Phase 27 tests pass. Positive controls cover exact same-class and
static helpers, literal and nested returns, branch-identical returns, bounded
chains, graph lineage, cache reuse, and Phase 26-compatible row-key output.
Negative controls cover dynamic calls, variable functions, ambiguous and
duplicate declarations, namespaces/imports, inheritance, traits, magic,
factories, branch mismatch, cycles, depth overflow, malformed PHP, unsupported
syntax, helper disappearance, stale same-SHA dependencies, unrelated-file
stability, oversized structural keys, lexical string lookalikes, path/source
confinement, privacy sentinels, cache/analyzer mismatch, and Phase 24
authority preservation.

The synthetic end-to-end path is:

`fixture source -> bounded inventory -> exact declaration resolution ->
existing response proof -> semantic materialization -> graph lineage ->
Phase 24 consideration -> synthetic campaign/replay-compatible evidence`.

The campaign is deterministic across repeated runs: ordering, safe IDs,
proof digests, diagnostics, graph output, lifecycle counts, review output, and
Phase 24 selection are byte-stable under the existing contracts. No negative
control gained an unsafe admission.

## 10. Defects discovered and repaired

The only closure defect observed was one transient existing
`journeyEngine.test.ts` cancellation assertion during the first 2,444-test
canonical run. The focused test passed once and five repeated times, and both
the canonical and topology-correct isolated complete reruns passed. The
failure did not reproduce and was not caused by Phase 27 response-flow code;
no test was weakened and no unrelated repair was introduced.

Phase 27 implementation defects repaired before the validated implementation
checkpoint included stale-flow TOCTOU handling, flow-aware identity and
invalidation completeness, diagnostic compatibility precedence, declaration
ambiguity handling, and oversized-string lexer privacy/structural-key
handling. Focused and full gates passed after each repair.

## 11. Validation results

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `npm run quality-gate:spec`: PASS; digest
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`.
- `npm run gate:inventory`: PASS; Phase 27 synthetic test included, no
  duplicate authoritative execution.
- `npm run test:semantic-compat`: PASS; 1,874 total, 1,873 passed, 1
  documented skip, 0 failed, across 139 files.
- `npm run campaign:synthetic`: PASS; 39/39.
- `npm run test:owner-provenance`: PASS; 91/91.
- `npm run agent:check`: PASS with only expected legacy-history warnings and
  a continuity checkpoint-advance warning before the final docs checkpoint.
- `npm run agent:audit`: PASS; strict v2 errors 0, historical legacy warnings
  preserved.
- `npm run project:check`: PASS at the validated documentation checkpoint.
- `npm run gate:local`: PASS; receipt
  `receipt:sha256:eb6f63abfc2aa9c2487b9a21` and package-lock digest
  `sha256:e87bf7337541d2ce03bb701deb09fc14853b5711c45688fcf8b647d04ebfe45c`.
- `npm run gate:clean`: PASS under Node 20; clean before/after, no reused
  `node_modules`, no auth or owner-finding state, sibling writes 0; receipts
  `clean-receipt:sha256:f73df8bd4b3a9dadaa09cbe9` and gate
  `receipt:sha256:0e86bab4745f1dddf50070bc9`.
- canonical complete Playwright: PASS; 2,444 enumerated, 2,440 passed, 4
  skipped, 0 failed, workers 1.
- topology-correct isolated complete Playwright: PASS; 2,444 enumerated,
  2,440 passed, 4 skipped, 0 failed, exact skip parity, detached Nightwatch
  plus six detached approved-source checkouts, `npm ci`, and proxy port 20987.

The four skips are the established environment-conditional controls:
`tests/unit/phase5Api.test.ts:195`, `:244`, `:278`, and
`tests/unit/selfDevSandboxConfinement.test.ts:143`.

## 12. External CI classification

The required single read-only exact-head observation used the pushed
implementation SHA `237e537e154bdb7c0eb7b4bd04021f9c5437db29`:

- Actions run: `32800403605`
- job: `97659975725` (`Executable quality gate`)
- conclusion: `failure`
- executed steps: `[]`
- classification: `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`

The job failed before executing a step, so this is an external platform/
billing block, not a Nightwatch test failure and not green CI authority. No
retry loop and no log retrieval were performed. Local and disposable clean
qualification remains separately recorded as green. No DEV decision or
authentication read can be inferred from the local result.

## 13. Historical compatibility and authority

Historical Phase 20/21/25/26 evidence remains bound to its original analyzer
identity and checkpoint. Phase 27 introduces only the explicit response-flow
v1 identity and leaves historical artifacts semantically truthful. The
existing response and semantic vocabulary is reused. Phase 24 remains the
sole portfolio authority, and its result remains 3 eligible / 125 excluded.
Response proof never establishes read-only safety, deployment equivalence, or
runtime identity.

## 14. Remaining proof gaps and deferred work

The remaining current-source gaps are the post-implementation taxonomy listed
above. Resource/DTO support remains intentionally absent because no current
approved route supplied an exact safe boundary. Runtime service/property
chains, variable producers without complete literal flow, built-ins,
namespaced/imported lookup, inheritance, traits, interfaces, dynamic
dispatch, factories, framework behavior, and deeper PHP interpretation remain
excluded.

Recommended single next campaign: a fresh Phase 28 hardening/source-intel
campaign focused on measuring and tightening the response-flow rejection and
dependency graph surfaces against newly observed approved-source syntax. It
must begin with a fresh census and only add another exact proof family if
current source supplies an unambiguous, branch-complete, dependency-current
pattern; otherwise continue analyzer soundness, currentness, privacy,
determinism, and performance hardening. No Phase 28 scope is pre-authorized by
this report.

## 15. Closure safety statement

This campaign granted only local Nightwatch implementation authority,
read-only approved sibling access, synthetic corpus authority, and source-
intelligence analysis authority. It granted no DEV/NEXT/production contact,
browser authentication, storage-state read, product mutation, data or
infrastructure access, Alphaus write, publication, external communication,
autonomous promotion, or AI runtime authority. The task is terminally
complete and remains local/source/synthetic only; no external authority was
created.
