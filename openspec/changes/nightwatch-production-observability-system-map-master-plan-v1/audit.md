# Audit — Whole-System Architectural Baseline (2026-09-01)

Planning-only audit executed under the owner-authorized broad re-audit override
for this campaign only.

**Baseline note.** Audit measurement began at Nightwatch `HEAD 784d553`
(`main`, clean). During the session a concurrent Nightwatch session closed the
predecessor task `nightwatch-replay-budget-and-dossier-closure-v1`, advancing
local `main` to `54df439` through seven documentation/continuity commits
(plus a 3-line `bin/agent-state.mjs` checkpoint-classification change authored
by that session, not by this audit). None of those commits touched source
analysed here, and every measurement below was re-confirmed against the working
tree. This audit changed **no** implementation code.

Everything below is evidence-classed:

| Class | Meaning |
|---|---|
| `PROVEN` | Directly read in source, or reproduced by executing a Nightwatch read-only command in this session. Citation given. |
| `STRONGLY_SUPPORTED` | Multiple consistent indirect signals, no contradicting evidence. |
| `PARTIAL` | True for the inspected subset; population not exhaustively verified. |
| `AMBIGUOUS` | Conflicting evidence recorded on both sides. |
| `UNKNOWN` | Not settled by this audit; the settling evidence is named. |

Company repositories were read strictly read-only. No network contact, no
authentication, no credential/cookie/token/storage-state access, no database,
cloud, IAM or Kubernetes operation occurred.

---

## PART A — Nightwatch as-built

### A.1 Scale and shape (`PROVEN`)

| Surface | Measure |
|---|---|
| `src/**` TypeScript | 416 files, 95,606 LOC |
| `tests/**` | 214 `*.test.ts`, 80,582 LOC |
| `ui/control-center/src` | 1,480 LOC React/TS |
| `bin/**` | 53 `*.mjs` entrypoints |
| Historical task dirs | 96 under `.agent/tasks/` |
| OpenSpec changes | 15 active + `archive/` |
| Decisions | D-1 … D-100 in `docs/DECISIONS.md` |
| Durable docs | 12,828 lines across 6 files |
| Runner | Playwright Test 1.62.1 only (D-1); 14 `playwright.*.config.ts` |

Largest subsystems by LOC: `core/campaign` 6,561 · `core/triage` 5,591 ·
`core/semanticCoverage` 5,428 · `core/source` 5,129 · `core/portfolio` 4,444 ·
`core/selfDev` 3,504 · `core/aiReview` 3,324 · `products/ripple` 3,134 ·
`browser/observers` 2,752 · `core/phase24` 2,682.

### A.2 The safety kernel — implemented and trustworthy (`PROVEN`)

This is the strongest part of the system and the plan preserves it entirely.

Environment selection is fail-closed:
`SUPPORTED_ENVIRONMENTS = ['local','dev','next']`
(`src/core/environment/index.ts:17`); `assertSupportedEnvironment` throws
`EnvironmentSelectionError` otherwise (`:23-27`).
`config/environments/production.json` is structurally unloadable
(`"supported": false`, `name` fails validation) and exists only to document the
eight known production hosts (D-4).

`OutboundPolicy.decide()` is the single host authority — a 12-rule,
first-match-wins, deny-default classifier
(`src/core/safety/outboundPolicy.ts:99-216`). The **only** route to `allow` for
http(s) is membership in the selected environment's allowlist (R3, `:141-150`).
Host classification is explicit table membership, never substring matching
(D-3, `src/core/safety/hosts.ts`).

Containment is layered L0–L6, all derived from that one decision function:

| Layer | Mechanism | File |
|---|---|---|
| L0 | Raw-CDP `Fetch` guard — pauses every request **including redirect follow-ups** that Playwright routing does not re-enter | `src/browser/network/fetchGuard.ts` |
| L1 | `context.route('**/*')` HTTP interception | `src/browser/observers/networkObserver.ts` |
| L2 | `context.routeWebSocket('**/*')` with **identical** verdict semantics (D-16) | same |
| L3 | `serviceWorkers:'block'` + init-script stubs (`SharedWorker` ctor throws; `serviceWorker.register()` rejects); any `serviceworker` event is a fatal hard failure | `src/browser/context.ts:254,292-310` |
| L4 | Event monitoring / unrouted-request detection | `src/browser/observers/**` |
| L5 | Mandatory loopback forward proxy: hostname authorization is **necessary but insufficient**; the complete resolved answer set must be admitted before an exact numeric address is dialled | `src/proxy/server.ts`, `src/proxy/addressPolicy.ts` |
| L6 | `nightwatch.process-network-containment.v1` — rootless Bubblewrap `--unshare-{user,net,pid} --as-pid-1 --die-with-parent`, namespace-local bounded relay (`MAX_PROXY_REQUESTS = 8`), AF_UNIX control channel | `src/core/oops/l6.ts:26-33,477-496` |

Resolved-address containment is genuinely strong (D-84):
`MAX_RESOLVED_ADDRESS_COUNT = 8`; empty/oversized/malformed/mixed/mapped/
family-mismatched answer sets all fail closed with categorical reasons; denied
and telemetry destinations invoke **no** resolver at all
(`src/proxy/addressPolicy.ts`, proven by
`tests/unit/addressPolicy.test.ts:218-251`).

Auth state is external-only (D-13/D-20): `NIGHTWATCH_STORAGE_STATE` must be an
absolute path outside both the Nightwatch repo and the Alphaus workspace, a
regular non-symlink file, mode `0600`, ≤ 5 MB, shape-valid; cookie **values**
are read into function locals for boolean semantic checks only and are never
returned, logged, hashed or persisted
(`src/browser/fixtures/storageState.ts:91-145,233-268`). Playwright tracing is
**always** disabled when storage state is in use (D-21).

Owner scope is executable, not documentary: `OWNER_SCOPE_POLICY_VERSION =
'nightwatch.owner-scope-policy.v2'`, `FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`, 13 allowed operation classes vs
20+ frozen (GCP/GKE/AWS/IAM/DynamoDB/BigQuery/Spanner/publication); unknown
classes fail closed with `OWNER_POLICY_BLOCKED`
(`src/core/policy/ownerScope.ts:12-49,88-99`).

Safety events terminate campaigns: any non-zero counter in
`{productionAttempts, proxyViolations, unknownDestinations, unknownApprovals,
productMutations, actionCausedUnknown, databaseQueries, infrastructureQueries,
externalPublicationAttempts}` routes the campaign to `PARTIAL_SAFETY_BLOCKED`
with `stopReason: 'SAFETY_EVENT'`
(`src/core/campaign/orchestrator.ts:865,1080,1244-1250,2153-2167`).

One historical production contact is recorded honestly and without inference
(D-27, `docs/CURRENT_STATE.md:403-422`): during intermediate Phase 1.1 testing,
before the L0 Fetch guard existed, one contact with `api.alphaus.cloud`
occurred; URL, method, credential attachment and response are all recorded
`UNKNOWN` and no request was made to investigate it.

### A.3 The action/mutation policy — the load-bearing weakness (`PROVEN`)

Two independent policies are claimed to guard mutation. Only one is populated.

**Action policy** — journeys are passive by construction. `ActionKind` is
`{navigate, click, fill, type, press, select, wait, assert, hover, screenshot,
other}`; `assertPassiveAction` throws `ActionNotPassiveError` for anything not
provably passive; `RIPPLE_MUTATION_PATTERNS` blocks
create/edit/save/delete/finalize/calculate/recalculate/token/purchase/
registration/settings classes (`src/core/safety/actions.ts`,
`docs/SAFETY_MODEL.md:191-219`). This works.

**Endpoint semantics** — the registry that is supposed to classify an observed
API request as `KNOWN_READ` / `KNOWN_MUTATION` / `UNKNOWN` is **empty**:

```ts
// src/core/safety/endpointSemantics.ts:28
export const RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule[] = [];
```

The file comment is explicit that this is deliberate — product journey contracts
supply a reviewed registry, and unmatched observations stay `UNKNOWN` and are
never deliberately replayed. Fail-closed, therefore safe. But it means **no
observed endpoint is classified unless a human wrote a rule for it**, and it is
the upstream cause of the read-only proof ceiling in A.5.

### A.4 Source intelligence — more implemented than documented, and saturated

Contradicting a first-pass reading of `scanTypes.ts`, route discovery **is**
implemented: `discoverSourceSurfaces()` (`src/core/source/surfaces.ts:804-926`)
with four parsers — `parseYamlRoutes` (`:164`), `parseStaticRoutes` for
TS/JS/Go (`:202`), `parseOpenApiRoutes` (`:257`) — plus syntax-aware analyzers
`analyzePhp`, `analyzeTypeScript`, `analyzeGo`, `analyzeOpenApi`
(`src/core/semanticCoverage/sourceAnalyzers.ts:712-919`) and an exact bounded
interprocedural response-flow resolver (`src/core/source/responseFlow.ts`).

**Live measurement.** `npm run campaign:eligibility-census` executed in this
session (read-only, no network) at snapshot
`srcsnapshot:sha256:04ff583971865f335902f5ad`, discovery digest
`source-surface-discovery:sha256:906830010ed198639d3c7b91`, census digest
`source-eligibility-census:sha256:2f97b732e0472df347f695a1`:

| Metric | Value |
|---|---|
| files inspected / bytes | 1,092 / 12,449,877 |
| operations | **128** |
| route proofs | 127 (1 `UNSUPPORTED`) |
| request contracts | 127 |
| response contracts | **43** (`UNPROVEN` 9, `UNSUPPORTED` 76) |
| semantic contract surfaces / observations | 43 / 53 |
| joins proven / rejected | 118 / 10 |
| mutation-capable | 47 |
| **read-only proven** | **5** |
| mutability unknown | 76 |
| runtime bindings proven / missing | 5 / 123 |
| replay requirements proven / unproven | 5 / 123 |
| Phase-24 eligible / excluded | **3 / 125** |
| lifecycle | 85 `DISCOVERED` / 40 `MECHANICALLY_PROVEN` / 3 `PROJECTABLE` |
| response flow attempted / proven | 13 / **0** |

`PROVEN`. Repository attribution is the decisive fact:

| Dimension | Distribution |
|---|---|
| `repositories` | `mobingilabs/ripple-api` → **128** surfaces. All other approved repos → 0. |
| `routeLanguages` | `YAML` → **128**. TypeScript/JavaScript/Go/OpenAPI → 0. |
| `handlerLanguages` | `PHP` → 126, `UNKNOWN` → 2 |

The Go, TypeScript and OpenAPI route parsers are **live code that matches
nothing in the real corpus**. `parseStaticRoutes` requires, for Go, a token
sequence `. GET|POST|PUT|PATCH|DELETE ( "literal" ,` (`surfaces.ts:231-252`) —
`ouchan` registers gRPC services, never HTTP verb methods, so the pattern is
structurally unreachable there. For TS/JS it requires a receiver identifier in
`{router, app, route}` — `ripple-ui` uses `axios` instances (`baseApi`,
`blueApi`, …), so it is likewise unreachable.

Per-repository scan inventory (`PROVEN`, same run):

| repo | approved root | files considered | admitted | notable rejections |
|---|---|---|---|---|
| `mobingilabs/ripple-api` | `src` | (remainder of 1,092) | — | — |
| `mobingilabs/ouchan` | `services`,`pkg` | 857 | 753 | `SOURCE_FILE_COUNT_EXCEEDED` 1, `SOURCE_LANGUAGE_UNSUPPORTED` 91, `SOURCE_PRIVACY_REJECTED` 13 |
| `alphauslabs/blue-sdk-go` | `billing` | 4 | 4 | — |
| `alphauslabs/blueapi` | `billing` | 1 | **0** | `SOURCE_LANGUAGE_UNSUPPORTED` 1 |
| `alphauslabs/grpc-chunk-parser` | `src` | 1 | 1 | — |
| `mobingilabs/ripple-ui` | `src` | (remainder) | — | — |

`ouchan` hit its 1,024-file cap (`SOURCE_FILE_COUNT_EXCEEDED: 1`) and still
produced zero operations — 753 admitted Go files analysed for nothing.

### A.5 Two silent ceilings (`PROVEN`) — the audit's most important findings

**Ceiling 1 — operation discovery is truncated at 128 and never says so.**

```ts
// src/core/source/surfaces.ts:59
const MAX_DISCOVERED_OPERATIONS = 128;
// :835-838
if (operations.length >= MAX_DISCOVERED_OPERATIONS) { routeOperationsTruncated += 1; continue; }
```

`ripple-api/src/App/Route/Config/Routing.yaml` contains **223** keys matching
the exact parser regex (`^\s*["'](get|post|put|patch|delete):([^"']+)["']:\s*$`):
81 GET, 86 POST, 33 PUT, 23 DELETE. Parsed routes are sorted by
repo → path → **method** → template (`surfaces.ts:832`); alphabetically
`DELETE < GET < PATCH < POST < PUT`, so the admitted 128 are exactly
23 DELETE + 81 GET + 24 POST, and **95 operations (62 POST + 33 PUT) are
dropped**. The arithmetic is confirmed by the census itself:
`mutationCapable = 47 = 23 + 24`, `getPopulation = 81`.

`routeOperationsTruncated` is computed and stored in
`SourceSurfaceDiscoveryCounters` (`surfaceTypes.ts:170`) and then read by
**nothing** — no CLI projection, no Control Center contract, no ledger, no
document. Nightwatch's single covered repository is **57 % covered** and the
operator is never told.

**Ceiling 2 — "read-only proven" is a hand-written 11-entry catalog, not a proof.**

```ts
// src/core/source/surfaces.ts:149-162
function runtimeBinding(repoId, sourceSha, routeTemplate, routeMethod): RuntimeMatch {
  const matches = PHASE5_API_CATALOG.operations.filter(op =>
    op.sourceRepo === repoId && op.httpMethod === routeMethod &&
    runtimeRoute(op.pathTemplate) === canonicalRoute(routeTemplate));
  …
}
function readOnlyClassification(routeMethod, binding): SourceReadOnlyClassification {
  if (binding.ambiguous) return 'AMBIGUOUS';
  if (binding.operation?.semanticClass === 'KNOWN_MUTATION') return 'PROVEN_MUTATION_CAPABLE';
  if (routeMethod !== 'GET') return 'PROVEN_MUTATION_CAPABLE';
  if (binding.operation?.semanticClass === 'KNOWN_READ' && !binding.stale) return 'PROVEN_READ_ONLY';
  return 'READ_ONLY_METHOD_ONLY';
}
```

`PHASE5_API_CATALOG` holds **11** hand-authored operations
(`src/api/phase5/catalog.ts`). Therefore, mechanically:

- non-GET → `PROVEN_MUTATION_CAPABLE` (47) — this is method inference, not proof;
- GET ∧ in the hand catalog as `KNOWN_READ` ∧ not stale → `PROVEN_READ_ONLY` (**5**);
- every other GET → `READ_ONLY_METHOD_ONLY` (**76**).

**The only way to raise `readOnlyProven` above 5 today is for a human to add a
row to a TypeScript literal.** There is no source-derived read-only proof
family anywhere in the codebase. Every downstream number — 3 eligible
candidates, 5 runtime bindings, 5 replay-capable surfaces — is a shadow of
those 11 hand-written rows.

### A.6 Semantic oracle stack — deep, correct, and pointed at almost nothing

The Phase 9/9A.1/10A real-source admission chain is genuinely rigorous
(`PROVEN`): data-only recipe (`nightwatch.real-source-expectation-recipe.v1|v2`)
→ fixed bounded extractor → normalized evidence digest `ev:sha256:<24>` →
`deriveRealSourceExpectations` admission → currentness resolver → safe
`nightwatch.semantic-evaluation-receipt.v1`. `SOURCE_STALE`,
`SOURCE_UNAVAILABLE`, `NO_EXPECTATION`, `NOT_APPLICABLE` and `INTERNAL_ERROR`
are never `PASS`; a provenance label alone never grants authority; expectations
are never silently re-bound to a new SHA (D-55, D-59).

Four fixed PHP extractors exist: `PHP_FUNCTION_LIST_ROW_KEYS`,
`PHP_FUNCTION_RETURNS_LIST_OF_BUILDER`, `PHP_ROUTE_GET_BINDING`,
`PHP_ITEM_FIELD_TYPE_FLOW` (patterns `EMPTY_CAST_OBJECT` ⇒ `[OBJECT]`,
`EMPTY_ARRAY_OR_STRING_KEYS` ⇒ `[OBJECT, ARRAY]`; anything else ⇒
`TYPE_FLOW_AMBIGUOUS`). The invariant vocabulary has 17 kinds including
`TYPE_IN_SET` (Phase 10A).

The admitted expectation registry is **6 targets, all in `mobingilabs/ripple-api`**:

| Expectation ID | Recipe | Depth |
|---|---|---|
| `ripple.common-exchange.read.real-source-deep` | v2 | TYPE |
| `ripple.payer-exchange.read.real-source-deep` | v2 | TYPE |
| `ripple.account-inventory.read.real-source-shape` | v1 | SHAPE |
| `ripple.billing-group-exchange.read.real-source-shape` | v1 | SHAPE |
| `ripple.payer-exchange.read.real-source-collection` | v1 | COLLECTION |
| `ripple.billing-groups-legacy.read.real-source-collection` | v1 | COLLECTION |

Two approved targets are permanently blocked:
`GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT` (the chunked billing-groups schema
lives in protobuf, which Nightwatch cannot read) and
`AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`.

Assessment: the oracle layer is **not** the bottleneck. It is a precision
instrument aimed at six targets.

### A.7 Runtime execution — bounded, honest, and starved

Real footprint (`PROVEN`): **3 journeys** (`ripple-account-inventory`,
`ripple-common-exchange-read`, `ripple-payer-exchange-read`), **11** Phase-5
catalog operations, **9** Phase-4 exploration actions, one product, one
environment.

`INITIAL_REAL_CAMPAIGN_BUDGET` (`src/core/campaign/budget.ts`):
`maxTotalBrowserContexts 6`, `maxJourneyContexts 3`, `maxExplorationContexts 0`,
`maxApiExecutions 6`, `maxReplays 8`, `maxMinimizationCandidates 4`,
`maxTotalActions 24`, `maxRuntimeMs 900_000`, `maxPromotedClusters 1`,
`maxPrivateEvidenceBytes 10 MB`.

Minimization is ddmin + bounded one-deletion audit with
`REAL_DEV_MINIMIZATION_BUDGET` = 4 candidate evaluations / 5 replays, emitting
`MINIMALITY_PROVEN | NOT_PROVEN | NO_REDUCIBLE | PRECONDITION_UNAVAILABLE`
(`src/core/triage/minimizer.ts`).

Findings live owner-only outside Git at `$HOME/.nightwatch/findings/`
(mode 0700/0600, atomic no-replace `linkSync`, symlink-rejecting path walk,
`assertPrivatePayload` screening) — `src/core/policy/privateArtifacts.ts`.

**Truthful yield history** (`PROVEN` from task records):

| Campaign | Outcome |
|---|---|
| `nightwatch-dev-soak-replay-yield-v1` | 4 campaigns, 8 strict product candidates admitted, **all 4 reproduction queues stopped before executor entry** at `journeyContexts 3/3` → `SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE` |
| `nightwatch-replay-budget-and-dossier-closure-v1` | budget repaired; fresh campaign `campaign:sha256:37aca1e9…` completed 5/5 work items `COMPLETE_CLEAN`; 2 protocol-only candidates, both rejected pre-replay with `REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`; **0 candidate attack replays, 0 minimizations, 0 dossiers, 0 product findings**; terminal `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED` |

Nightwatch has never produced a product finding. That is not a defect of the
triage machinery — it is the arithmetic consequence of 3 journeys against
3 eligible surfaces.

### A.8 Control Center — small, correct, read-only, and structurally capped

`PROVEN`. Node `http` (no framework) on `127.0.0.1:7312`; GET/HEAD only
(405 otherwise); strict `Host`/`Origin` validation; no request body accepted;
CSP `default-src 'self'`, `frame-ancestors 'none'`; 15 routes; SSE at
`/api/v1/events`. `CONTROL_CENTER_AUTHORIZATION_CLASS =
'CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY'`; meta advertises
`executionAuthority: NONE`, `mutationAuthority: NONE`,
`productContact: DISABLED`, `externalNetwork: DISABLED`.

14 versioned contracts; 5 authorities (`campaignAuthority`, `findingsAuthority`
— with uid/mode ownership check and TOCTOU size/mtime/ino re-verification —,
`sourceAuthority`, `runEvidenceReader`, plus 8 adapters). Seven UI views:
Overview, Safety, Runs, Execution Graph, Campaigns, Source Intelligence,
Findings.

Graph rendering is **handcrafted SVG** in `ui/control-center/src/App.tsx`:
fixed 3-column grid `x = 120 + (i % 3) * 230`, `y = 58 + ⌊i/3⌋ * 84`,
`nodes.slice(0, 24)`, `edges.slice(0, 48)`. Contract limits are
`nodeLimit 1000` / `edgeLimit 2000`, so the UI renders **2.4 %** of what the
contract permits, with no zoom, pan, search, filter or drill-down. The SSE
subscription helper `subscribeToControlCenterEvents` exists in `api.ts` but is
**not invoked** by `App.tsx` — refresh is manual only (`STRONGLY_SUPPORTED`).

### A.9 Governance machinery (`PROVEN`)

Ten-group executable gate `config/quality-gate.v1.json` driven by
`bin/quality-gate.mjs {local|ci|clean|predev}`: GATE_DEFINITION → TYPECHECK →
HARDENING_CHECK → HANDOFF_CHECK → PROJECT_CHECK → AGENT_CONTINUITY →
SEMANTIC_COMPATIBILITY → OWNER_PROVENANCE → SYNTHETIC_CAMPAIGN →
PATCH_INTEGRITY. Isolated child environments (no parent env spread, forbidden
keys deleted, bounded timeout/maxBuffer, no shell). Receipt schema
`nightwatch.quality-gate-receipt.v1`.

`bin/hardening-check.mjs` enforces 11 structural rule families by regex/import
inspection (not AST): child-process boundaries, forbidden `exec`/`execFile`,
L6 flags and control-protocol constants, DEV-only target policy, typecheck
coverage, private surface, AI-review boundary, local-canary boundary, self-dev
boundary, sandbox boundary, patch integrity.

`nightwatch.project-state.v2` (25 owned keys) and
`nightwatch.agent-continuity.v2` (cross-file task state machine) are validated
by `bin/project-state-check.mjs` and `bin/agent-state.mjs`. CI is a single
GitHub Actions job running `npm run gate:ci`;
`FINAL_CI_AUTHORITY = GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT`, currently
`CI_STATUS: NO_STEPS_EXTERNAL_NON_EVIDENCE`.

### A.10 Duplicated / competing authorities (`STRONGLY_SUPPORTED`)

1. **Two repository universes.** `RIPPLE_REPOSITORIES`
   (`src/core/changeIntelligence/map.ts:10-95`) is a hand-written literal
   carrying pinned `checkedOutSha`, `trackingSha`, `ahead`, `behind` and
   `dirty` per repo. `APPROVED_ROOTS` (`src/core/source/approvedScan.ts:11-16`)
   is a second literal keyed by the same repo IDs. Baked git metadata drifts
   silently: the pinned HEADs still match live HEADs today, but the pinned
   `dirty` flags do not (`ouchan` is actually 71 dirty files).
2. **Two mutation authorities.** `RIPPLE_MUTATION_PATTERNS` (action-level,
   populated) and `RIPPLE_ENDPOINT_SEMANTIC_REGISTRY` (endpoint-level, empty).
3. **Two contract-truth sources.** `PHASE5_API_CATALOG` (hand-written, grants
   runtime binding and read-only proof) and the Phase 25–28 source discovery
   (mechanical, grants nothing without a catalog match).
4. **Change intelligence is orphaned.** `selectJourneys` computes impact from
   21 hand-coded dependency edges, but the semantic oracle never consumes
   journey selection.

### A.11 Dead or unreachable architecture (`STRONGLY_SUPPORTED`)

- `parseStaticRoutes` Go branch — structurally unreachable against `ouchan`.
- `parseStaticRoutes` TS/JS branch — structurally unreachable against `ripple-ui`.
- `parseOpenApiRoutes` — no `openapi.json`/`swagger.json` inside any approved root.
- `src/core/source/lexical.ts` — tokenizer whose only consumer is the above.
- `src/data/phase6/**` (1,593 LOC) — `PHASE_6_STATUS: FROZEN_BY_OWNER`; quarantined behind `assertOwnerPolicyAllows(..._DATA_ORACLE)`.
- `src/core/selfDev*/**` (6,331 LOC) — `EFFECTIVE_NEXT_PROMOTION_AUTHORITY: NONE`, portfolio `EXHAUSTED`.
- `src/core/aiReview/**` (3,324 LOC) — no compatible local model was ever available; `PHASE_7B_3_STATUS: HARNESS_COMPLETE / LOCAL_MODEL_CANARY_NOT_RUN`.
- `subscribeToControlCenterEvents` — exported, never called.
- `routeOperationsTruncated` — computed, never surfaced.

Roughly **11,000 LOC** is retained-but-inert. That is defensible (owner freezes,
compatibility) but it dominates the repository's apparent complexity.

### A.12 Documentation vs implementation contradictions (`PROVEN`)

| Claim | Location | Live reality |
|---|---|---|
| "83 response contracts / 175 semantic observations / lifecycle 45-80-3" | `docs/CURRENT_STATE.md:108,2302`; `docs/ARCHITECTURE.md:1765`; `docs/ROADMAP.md:2234,2257,2325,2372`; `docs/DECISIONS.md:3271` | **43 / 53 / 85-40-3.** The soundness repair (D-82) halved the proven counts; the newer figures exist at `CURRENT_STATE.md:2466`, `ARCHITECTURE.md:1861`, `ROADMAP.md:2419`, `DECISIONS.md:3399`, but the superseded ones were never retired and read as current. |
| "128 operations" presented as a discovery result | all census narratives | 128 is the **cap**; 223 exist. |
| "5 independently proven read-only operations" | census narratives | True, but the proof is catalog membership, not source analysis. |
| Six-repository source universe implies six-repository coverage | `approvedScan.ts`, all census docs | One repository produces 100 % of operations. |

None of these are fabrications; all are stale or under-qualified. They matter
because a future agent reading `CURRENT_STATE.md` top-down gets the wrong
numbers.

### A.13 Bugs noticed during the audit — NOT FIXED

| # | Severity | Finding | Evidence |
|---|---|---|---|
| B-1 | HIGH | Silent operation truncation: 95 of 223 routes dropped, counter never surfaced | `surfaces.ts:59,818,836,875`; live census |
| B-2 | HIGH | `alphauslabs/blueapi` is approved but unreadable — `.proto` missing from `SOURCE_SCAN_EXTENSIONS`; 147 annotated RPCs in the approved root yield 0 | `scanTypes.ts:15,18`; census `admittedFileCount: 0` |
| B-3 | MEDIUM | Stale duplicate census figures in four durable docs read as current | see A.12 |
| B-4 | MEDIUM | `RIPPLE_REPOSITORIES` bakes `dirty`/`ahead`/`behind` into source; already false for `ouchan` | `map.ts:44-51` vs live `git status` (71 dirty) |
| B-5 | MEDIUM | Control Center renders ≤24 nodes while its contract allows 1000; no truncation indicator in the UI | `App.tsx` `nodes.slice(0,24)` vs `sourceGraph.ts nodeLimit 1000` |
| B-6 | LOW | SSE endpoint implemented and exported but never subscribed | `api.ts` vs `App.tsx` |
| B-7 | LOW | Three route parsers and one tokenizer are unreachable against the real corpus | A.11 |
| B-8 | LOW | `ouchan` silently hits its 1,024-file cap (`SOURCE_FILE_COUNT_EXCEEDED: 1`) | live census |

Company-repository finding, also **NOT FIXED**:
`alphauslabs/ripple-ui-cost-finalization/src/app/stores/finilizeCost/actions.ts:123-124`
hard-codes `https://api.alphaus.cloud/m/status/calculations/status` while
sibling calls use environment-aware `getApiUrl(...)`.

### A.14 Nightwatch limitation summary

**Blocks production observation:** production unselectable by construction
(D-4) — correct today, but there is no separate authorization class, no
observer identity model, no per-route production admission, no request budget
or circuit breaker, no kill switch, and no mechanical read-only proof to gate
on. `realRunGate` hard-asserts `env.name === 'dev' || (next && !requiresAuth)`
(`src/core/safety/realRunGate.ts:128-131`).

**Blocks whole-system mapping:** 6-repo hand-written universe; no protobuf
support; no gRPC registration extraction; no frontend call extraction; no
cross-repository join model (the graph is contract-centric, not
topology-centric); 128-operation cap; no route → runtime-host binding beyond an
11-entry catalog.

**Blocks autonomous bug hunting:** 3 eligible surfaces; 3 journeys; empty
endpoint semantic registry; `maxJourneyContexts 3`; expectations admitted only
by hand-authored recipes; zero product findings ever.

---

## PART B — Company system census

### B.1 Population (`PROVEN`, harvested read-only 2026-09-01)

148 repositories: 55 `alphauslabs/`, 93 `mobingilabs/`. Activity buckets:
**46** with 2026 commits, **11** with 2025 commits, **91** dormant (< 2025).

Language file counts across the workspace (excluding `vendor`, `node_modules`,
`dist`, `build`, `.git`): PHP 6,449 · Go 4,267 · TypeScript 3,706 · Vue 2,712 ·
JavaScript 2,668 · Markdown 1,813 · CSS 1,106 · YAML 866 · JSON 682 ·
HTML 442 · Shell 300 · Python 293 · Protobuf 266 · SQL 257 · Ruby 84 ·
Java 31 · Terraform 17.

Manifest presence: 17 `go.mod`, 33 `package.json`, 27 `composer.json`.

Nightwatch covers **6 of 148** repositories (4.1 %) and **6 of 46** active
repositories (13 %).

### B.2 Component inventory — the active system

| Tier | Component | Repo | Stack | Evidence |
|---|---|---|---|---|
| Frontend host | Ripple UI | `mobingilabs/ripple-ui` | Vue 2 + Quasar, 859 `.vue` / 393 `.js` | `PROVEN` |
| Frontend MFE monorepo | alupi (12 single-spa React/TS apps) | `alphauslabs/alupi` | pnpm, React, Vite, zustand | `PROVEN` |
| Frontend | Wave Pro / Aqua / Invoice / User / CSRed / Wave | `wave-pro-ui`, `aqua-ui`, `invoice-ui`, `user-ui`, `csred-ui`, `wave-ui` | Vue 2/3 | `PROVEN` |
| Frontend MFE (standalone) | 6 commitment/cost/dashboard MFEs | `ui-commitment-*`, `ripple-ui-dashboard`, `ripple-ui-cost-finalization`, `ui-wave-cost-summary`, `jennah-ui` | React + Vite + TS | `PROVEN` |
| Legacy REST API | Ripple API | `mobingilabs/ripple-api` | PHP, YAML router, 223 routes, 31 handler classes | `PROVEN` |
| Legacy REST API | Wave API | `mobingilabs/wave-api` | PHP, same router shape | `PROVEN` |
| Go monorepo | ouchan | `mobingilabs/ouchan` | 131 services under `services/`, 3,330 `.go` | `PROVEN` |
| Contract source | blueapi | `alphauslabs/blueapi` | 125 `.proto`, **599 RPCs**, buf v2 | `PROVEN` |
| Contract source | blueinternal | `alphauslabs/blueinternal` | 52 `.proto`, **63 RPCs** | `PROVEN` |
| Generated SDKs | Go / TS / Python / internal-Go | `blue-sdk-{go,ts,python}`, `blue-internal-go` | buf-generated | `PROVEN` |
| Shared lib | gRPC chunk parser | `alphauslabs/grpc-chunk-parser` | 190-line streaming NDJSON parser | `PROVEN` |
| CLIs | `bluectl`, `iam`, `tucp`, `oops`, `budget`, `ops` | alphauslabs | Go + goreleaser | `PROVEN` |
| Internal product | Pondr | `alphauslabs/internal-project-v2` | Next.js + Prisma/PostgreSQL + ECS/SAM/CDK | `PROVEN` |
| Spec corpus | Ripple OpenSpec | `alphauslabs/ripple-openspec` (+2 worktrees) | 18 changes, 39 `spec.md` | `PROVEN` |
| Docs | internal-docs | `alphauslabs/internal-docs` | 326 md incl. `devops/gke-clusters-mochi.md` | `PROVEN` |

### B.3 Route / contract declaration mechanics — what a parser can actually get

| Source | Mechanical form | Extractable today by Nightwatch? |
|---|---|---|
| `ripple-api` / `wave-api` | `"METHOD:/path": { client: App\Handler\X, method: y, validate: …, params: … }` in `src/App/Route/Config/Routing.yaml` | **Yes**, and it is the only thing that works — but capped at 128 |
| `blueapi` / `blueinternal` | `rpc Name(Req) returns (Res) { option (google.api.http) = { get: "/v1/…" }; }` | **No** — `.proto` unsupported |
| `ouchan` services | `pkg.RegisterXServer(gs, svc)` in `services/<name>/main.go`; handler methods implement `UnimplementedXServer` | **No** — pattern not matched |
| `ripple-ui` | `baseApi.get('/accts', …)` / `` baseApi.delete(`/accts/${vendor}/${id}`) `` across ~150 `src/vuex/api/*.js`; gRPC-web via `parseGrpcData({ url: baseUrlForService('blue') + url, … })` | **No** — receiver is `baseApi`, not `router\|app\|route` |
| alupi MFEs | `axiosInstance.get(getApiUrl('blue', '/ops/v1/…'))`, `blueApi.newBillingClient.*` | **No** — repo not approved |
| Generated Go SDK | `Admin_ListAccountGroups_FullMethodName = "/blueapi.admin.v1.Admin/ListAccountGroups"` | **No** |
| Generated Python SDK | `channel.unary_stream('/blueapi.admin.v1.Admin/ListAccountGroups', …)` | **No** |

**The single decisive census number.** `blueapi` + `blueinternal` declare
**662 RPCs**, and every one carries an explicit HTTP verb binding:

| Verb | blueapi | blueinternal |
|---|---|---|
| `get` | 189 | 28 |
| `post` | 255 | 27 |
| `put` | 91 | 2 |
| `delete` | 62 | 4 |
| `patch` | 2 | 0 |
| **total** | **599** | **63** (61 bound) |

`blueapi/billing/v1/billing.proto` alone — the file inside Nightwatch's
**already approved** `billing` root — holds **147 RPCs / 39 GET bindings**, and
is currently rejected for having the wrong file extension.

### B.4 gRPC service → ouchan service binding (`PROVEN`)

17 registration sites in 12 files map protobuf services onto deployable
service directories:

| ouchan service | registers |
|---|---|
| `archerad` | `gc.RegisterGuaranteedCommitmentsServer` |
| `billingd` | `billing.RegisterBillingServer` |
| `blued` | `admin.RegisterAdminServer`, `flags.RegisterFlagsServer`, `iam.RegisterIamServer`, `operations.RegisterOperationsServer`, `org.RegisterOrganizationServer`, `preferences.RegisterPreferencesServer` |
| `costd` | `cost.RegisterCostServer` |
| `coverd` | `cover.RegisterCoverServer` |
| `flowd` | `flow.RegisterFlowServer` |
| `lusterd` | `luster.RegisterLusterServer` |
| `metricsd` | `metrics.RegisterMetricsControlPlaneServer` |
| `pricingd` | `pricing.RegisterPricingServer` |
| `prismd` | `prism.RegisterPrismServer` |
| `vortexd` | `vortex.RegisterVortexServer` |
| `webtoold` | `webtool.RegisterWebToolControlPlaneServer` |

`ouchan/services-catalog/SERVICES.md` (138 lines, "verified 2026-08-06") is a
one-row-per-service table for all 131 services with purpose, stack and deploy
hint (`mochi/GKE`, `+CF`).

### B.5 Environment and host matrix (`PROVEN`)

`mobingilabs/ripple-ui/src/config/common.js` is the canonical client-side
matrix and remains accurate at `d80b161b` — Nightwatch's cited provenance holds.

| Env | app | api (basic) | api (blue/gRPC-web) | login |
|---|---|---|---|---|
| alphaus prod | `app.alphaus.cloud` | `api.alphaus.cloud/m/ripple` | `api.alphaus.cloud/m/blue/` | `login.alphaus.cloud/ripple/` |
| alphaus next | `next.alphaus.cloud` | `apinext.alphaus.cloud/m/ripple` | `apinext…/m/blue/` | `loginnext.alphaus.cloud/ripple/` |
| alphaus dev | `appdev.alphaus.cloud` | `apidev.alphaus.cloud/m/ripple` | `apidev…/m/blue/` | `logindev.alphaus.cloud/ripple/` |
| mobingi prod | `app.mobingi.com` | `service.mobingi.com/m/ripple` | `api.alphaus.cloud/m/blue/` (shared) | `login.mobingi.com/ripple/` |
| mobingi dev | `appdev.mobingi.com` | `servicedev.mobingi.com/m/ripple` | `apidev.alphaus.cloud/m/blue/` (shared) | `logindev.mobingi.com/ripple/` |

Environment selection is **cookie-first** (`api_type`, `app_type`), then
hostname detection, then default `dev + alphaus`. SDK defaults are production
(`blue-sdk-ts conn/conn.ts:6-7` → `https://bluerpc.alphaus.cloud:8443`,
`DEFAULT_AUTH_URL = https://login.alphaus.cloud/ripple/access_token`;
`blue-sdk-go conn/conn.go:14-16` → `blue.alphaus.cloud:443`,
`bluenext.alphaus.cloud:8443`). Nightwatch's RECON_B hazard table (E1–E10,
`docs/SAFETY_MODEL.md:161-172`) remains accurate.

### B.6 Deployment topology (`PROVEN` / `STRONGLY_SUPPORTED`)

`ouchan` is the deployment control plane. Every sampled product repository's CI
clones `ouchan` and commits into `ouchan/services/<name>/` to trigger a build:

| Repo | CI | Trigger target | Evidence class |
|---|---|---|---|
| `ripple-ui` | CircleCI | `ouchan/services/ripple-ui/` | `PROVEN` |
| `ripple-api` | GitHub Actions | `ouchan/services/ripple-api-micro/` | `PROVEN` |
| `wave-api` | GitHub Actions | `ouchan/services/wavereport/` | `PROVEN` |
| `invoice-ui`, `user-ui` | CircleCI | `ouchan/services/{invoice-ui,user-ui}/` | `PROVEN` |
| `csred-ui` | GitHub Actions | `ouchan/services/csred-ui/` | `PROVEN` |
| `alupi` | GitHub Actions (`trigger-ouchan.yml`) | ouchan orchestration | `PROVEN` |
| `wave-pro-ui` | GitHub Actions | `ouchan/services/wave-pro-ui/` | `STRONGLY_SUPPORTED` |

`ouchan/.circleci/config.yml` filters branches `master | next | production` and
runs `ouchanctl build` → `ouchanctl mochiup`.
`internal-docs/devops/gke-clusters-mochi.md` documents the cluster matrix:
`mochi-dev` (GCP `labs-169405`), `mochi-next` and `mochi-prod` (GCP
`mobingi-main`), region `asia-northeast1`, with `appproxy` fronting UIs and
`serviceproxy` fronting backends.

**Route → runtime-host binding remains UNKNOWN.** The final hop —
`appproxy`/`serviceproxy` Ingress rules mapping a URL path to a Kubernetes
service — lives in the `mochi` repository, which is **not present in this
workspace**. Settling evidence: read-only access to `mochi`'s
`services/{env}/*/ingress.yaml` and `deployment.yaml`.

### B.7 An unused independent oracle source (`PROVEN`)

Product OpenSpec corpora exist on disk and Nightwatch has never read them:

| Repo | changes | `spec.md` files | `### Requirement:` | `#### Scenario:` |
|---|---|---|---|---|
| `alphauslabs/ripple-openspec` | 18 | 39 | 213 | 484 |
| `mobingilabs/ouchan/openspec` | 5 | 27 | 131 | 329 |
| `mobingilabs/ripple-ui-billing-group-wt/openspec` | 1 | 2 | 6 | 10 |
| worktree duplicates (`ripple-openspec-*-wt`) | 38 | 80 | 435 | 993 |
| **canonical unique** | **24** | **68** | **≈350** | **≈823** |

The format is machine-parseable Markdown with a fixed heading hierarchy and
RFC-2119 language, and scenarios frequently cite exact source lines:

```md
### Requirement: SDK provides a thin single-target leave upsert wrapper
`prism-sdk/pondr` SHALL provide `UpsertLeave(...)` that performs exactly one
`POST` to `<baseURL>/kanban/api/leave-tracker/sync` … It SHALL NOT perform
retries, multi-target fan-out, or logging.

#### Scenario: Non-200 response is surfaced as an error
- **WHEN** the endpoint responds with any status other than 200
- **THEN** `UpsertLeave` returns a non-nil error describing the status and body
```

This is an **independent, human-authored, provenance-bearing expectation
corpus** — a second witness class that does not depend on Nightwatch's ability
to parse implementation code. `AMBIGUOUS` on directness: some requirements are
UI/i18n or infrastructure statements that no read-only HTTP observation can
check.

`alphauslabs/ai-driven-bug-hunting` (32 files, 19 md, last commit 2025-11-12)
is a **separate, non-overlapping** effort: Gherkin `.feature` → AI-generated
Playwright scenarios. Forward (spec → test) where Nightwatch is backward
(code → operation registry). No conflict, no integration value identified
(`STRONGLY_SUPPORTED`).

### B.8 Static-analysis feasibility per language

| Language / framework | Parser needed | Facts mechanically extractable | Class |
|---|---|---|---|
| Protobuf `.proto` | Bounded lexer sufficient (fixed `service`/`rpc`/`option (google.api.http)` grammar) | service, RPC, request type, response type, streaming, HTTP verb, HTTP path, body binding | `PROVEN` |
| Go — gRPC registration | Bounded lexer on `pkg.RegisterXServer(gs, svc)` + `UnimplementedXServer` embedding | service dir → proto service; handler method set | `PROVEN` |
| Go — generated SDK | Bounded lexer on `const X_Y_FullMethodName = "/pkg.svc/Method"` | full method names (224+ in `admin/v1` alone) | `PROVEN` |
| PHP — routing | Existing line parser | method, path, handler class, handler method, validation schema | `PROVEN` |
| PHP — handler effects | Bounded token walk over a **finite write vocabulary** — `updateItem` (145), `deleteItem` (82), `createItem` (72), `deleteHashData` (73), `insert*` (≈130), plus RBAC `checkIs*WriteAllowed*` | absence-of-write proof over a bounded call closure | `STRONGLY_SUPPORTED` |
| Vue 2 SFC / Quasar | `@vue/compiler-sfc` for `<script>` + JS AST | `axios` instance calls with literal/template paths (≈78 % literal), vue-router table, store action → API edge | `STRONGLY_SUPPORTED` |
| React/TS MFE | TypeScript compiler API | `axiosInstance.get(getApiUrl(service, path))`, store actions, SDK client method calls | `STRONGLY_SUPPORTED` |
| Generated TS SDK | Descriptor decode **or** OpenAPI fallback (`blueapi/openapiv2/apidocs.swagger.json`) | RPC surface (indirect) | `PARTIAL` |
| Python SDK | Bounded lexer on `channel.unary_*('/pkg.svc/Method', …)` | full method names | `PROVEN` |

The PHP write vocabulary is the key discovery for read-only proof: Ripple's DAO
surface is finite and named, so "this handler's bounded call closure contains no
call to any name in `WRITE_VOCABULARY`, no dynamic dispatch, and no unresolved
callee" is a mechanically checkable, fail-closed **negative** proof.

### B.9 Cross-repository dependency spine (`PROVEN`)

```
alphauslabs/protos ─┬─> alphauslabs/blueapi (125 .proto, 599 rpc, buf v2)
                    └─> alphauslabs/blueinternal (52 .proto, 63 rpc)
                              │ buf generate
        ┌─────────────────────┼──────────────────────┬───────────────┐
        v                     v                      v               v
  blue-sdk-go            blue-sdk-ts           blue-sdk-python  blue-internal-go
        │                     │
        │ go import           │ npm @alphauspkgs/blue-sdk-ts
        v                     v
 mobingilabs/ouchan     alphauslabs/alupi ──> lib/ripple-ui-globals ──> 12 MFE apps
  services/<name>/            │
   Register*Server            │ mounted into
        │                     v
        │              mobingilabs/ripple-ui (Vue2 host, ~150 vuex/api modules)
        │                     │  axios baseApi -> /m/ripple/*   (ripple-api, PHP)
        │                     │  axios blueApi -> /m/blue/*     (blue gRPC-web)
        │                     │  parseGrpcData <- grpc-chunk-parser
        v                     v
 ouchan CI control plane  ->  mochi-{dev,next,prod} GKE (appproxy / serviceproxy)
```

### B.10 Dormant population (`STRONGLY_SUPPORTED`)

91 repositories with last commit before 2025, bucketed:
`LEGACY_DEPLOYED_UNKNOWN` ≈28 (PHP monoliths and batch jobs with Dockerfiles /
buildspecs — `console.mobingi.com`, `mocloud.io`, `mobingi-api-v2/v3`,
`gateway`, `rbac`, `safe-box`, `openid-connect-server`, `csred-api`, the
`*-import` batch family), `LEGACY_RETIRED` ≈32, `SAMPLE_TEMPLATE` ≈12,
`DOCS` ≈8, `TOOLING` ≈6, `VENDORED_SDK` ≈5. None is proposed for Nightwatch's
source universe; several (`gateway`, `rbac`, `user`, `safe-box`) are wrapped as
`ouchan/services/*` and may still be deployed — `UNKNOWN`, settled only by the
`mochi` deployment manifests.

---

## PART C — Coverage arithmetic

| Dimension | Nightwatch today | Locally available | Ratio |
|---|---|---|---|
| Repositories in universe | 6 | 148 (46 active) | 4 % / 13 % |
| Repositories producing operations | **1** | ≥ 8 with mechanical route/RPC declarations | 12 % |
| Operations discovered | 128 (capped) | 223 (ripple-api) + 662 (proto) + ~80 (wave-api) + ~750 FE literals | ≈ 8 % |
| Response contracts proven | 43 | — | — |
| **Read-only proven** | **5** | ≥ 189 GET RPC bindings + ≥ 81 GET PHP routes | ≈ 2 % |
| Runtime bindings proven | 5 | route→service via proto+Register\*; service→host via CI+ingress (ingress absent) | — |
| Campaign-eligible surfaces | **3** | — | — |
| Journeys | 3 | — | — |
| Environments | 1 (DEV) | 3 (dev / next / prod) | 33 % |
| Independent expectation corpora used | 0 | ≈350 Requirements / ≈823 Scenarios | 0 % |
| Product findings ever produced | **0** | — | — |

---

## PART D — Open UNKNOWNs

| # | Unknown | Settling evidence |
|---|---|---|
| U-1 | Route → runtime host: which Kubernetes service serves `/m/ripple/*` and `/m/blue/*` per environment | Read-only access to the `mochi` repository's `services/{env}/{appproxy,serviceproxy}/ingress.yaml` |
| U-2 | Whether `ouchan/services/{gateway,rbac,user,safe-box,openid-connect-server}` are still deployed | Same `mochi` manifests |
| U-3 | Whether a production observer identity with organizationally enforced read-only RBAC can exist | Owner/organization decision; out of Nightwatch's frozen scope |
| U-4 | Real production error/latency baselines needed for anomaly confidence | Requires P1 passive observation, which is gated |
| U-5 | How many `ripple-openspec` scenarios are checkable by read-only HTTP observation | Bounded classification pass over the 68 canonical `spec.md` files |
| U-6 | Whether `blue-sdk-ts` descriptor decoding is needed or the `openapiv2/apidocs.swagger.json` fallback suffices | Inspect the generated swagger artifact's completeness |
| U-7 | Actual `routeOperationsTruncated` value reported by the runtime (arithmetic says 95) | Surface the counter in a CLI projection |
| U-8 | Whether `next` shares the production data plane in the same way `dev` does (RECON_B E8) | `next.json` records the caveat; no independent confirmation was attempted |
