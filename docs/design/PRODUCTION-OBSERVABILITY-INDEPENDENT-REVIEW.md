# Independent Second-Reviewer Architecture Review

Second independent principal-architect review of the planning campaign
`nightwatch-production-observability-system-map-master-plan-v1`.

Reviewed checkpoint: `5383428710076ad8c645a86d7d282409d3642ba8` (planning
commit), read at working-tree `aacd63a` (`main`, clean).

**Planning/review only.** This review changed no Nightwatch implementation
code, no company repository, contacted no environment, performed no
authentication, and enabled no authority. Every measurement below was taken
read-only from local disk.

**Relationship to the first explorer.** This document does not rewrite
`audit.md`, `design.md`, `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md`
or `docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md`. Where this review
disagrees, the first explorer's original text is preserved and annotated
`SECOND-REVIEW CORRECTION` with a pointer here. First-explorer conclusions are
labelled *(E1)*; second-review conclusions are labelled *(R2)*.

Classification used throughout:

- **MUST FIX BEFORE IMPLEMENTATION** — the plan is wrong or unsafe as written;
  fixing it after code exists is materially more expensive.
- **MUST FIX BEFORE PRODUCTION** — safe to implement Tracks A/B/D as written,
  but no production request may be issued until resolved.
- **SHOULD FIX** — materially improves correctness, cost or truthfulness.
- **OPTIONAL** — judgement call, either choice defensible.

---

## 0. Required-output index

| # | Required output | Where |
|---|---|---|
| 1 | Overall verdict | §1 |
| 2 | Claims confirmed | §2 |
| 3 | Claims corrected | §3 (X-01…X-06) |
| 4 | Missing architecture | §0.1 below (collected); detail in §4, §6, §10, §11 |
| 5 | Unsafe assumptions | §0.2 below (collected); detail in §4, §5, §7 |
| 6 | Implementation-order corrections | §10 |
| 7 | Production-safety corrections | §5, §6 |
| 8 | Privacy corrections | §7 |
| 9 | System Map corrections | §8 |
| 10 | Concurrency/workspace corrections | §11 |
| 11 | Acceptance-criteria corrections | §0.3 below (collected); detail in §4 F-08, §9, §13 |
| 12 | Revised critical path | §10, final subsection |
| 13 | Explicit list of master-plan edits | §13 |

### 0.1 Missing architecture — collected

Design elements the plan needs and does not have. Each is expanded where cited.

| # | Missing element | Class | Detail |
|---|---|---|---|
| MA-1 | Middleware-pipeline resolution as part of the effect closure | MUST FIX BEFORE IMPLEMENTATION | §4 F-01 |
| MA-2 | An effect-**kind** lattice (`DATA_WRITE`, `AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`, `MESSAGE_PUBLISH`, `EXTERNAL_CALL`, `PURE_READ`, `UNCLASSIFIED`) replacing the binary write vocabulary | MUST FIX BEFORE IMPLEMENTATION | §4 F-07 |
| MA-3 | A repository **inventory-completeness** assertion for any negative (absence-of-write) proof | MUST FIX BEFORE IMPLEMENTATION | §3 X-02, §4 F-05 |
| MA-4 | Method-level proto RPC → Go handler binding (`W-EFFECT_RPC` has no input without it) | MUST FIX BEFORE IMPLEMENTATION | §10 F-31 |
| MA-5 | A `DEPLOYMENT_FACT` route → runtime-endpoint binding gate, and the `mochi` manifest access that makes it possible | MUST FIX BEFORE PRODUCTION | §10 F-30, RG-21 |
| MA-6 | A production request **parameter-provenance** model (opaque handles, external storage) | MUST FIX BEFORE PRODUCTION | §7 F-16, RG-23 |
| MA-7 | An **induced-egress** model: fan-out from Nightwatch's requests into further production calls | MUST FIX BEFORE PRODUCTION | §4 F-02, T-36 |
| MA-8 | A P1-specific **observation-scope** admission chain (the eleven gates are request-issuance gates and never fire for P1) | MUST FIX BEFORE PRODUCTION | §6 F-13 |
| MA-9 | Import-graph isolation between the production and DEV cones, plus a distinct `productionRunGate` | MUST FIX BEFORE IMPLEMENTATION | §6 F-11, F-12, RG-25 |
| MA-10 | External-only production configuration and a production host allowlist that is never an inversion of the deny table | MUST FIX BEFORE IMPLEMENTATION | §6 F-09, F-10, RG-24 |
| MA-11 | Two distinct digest families (unsalted structural, salted value) | MUST FIX BEFORE IMPLEMENTATION | §7 F-15, T-42 |
| MA-12 | Server-side, content-addressed, version-pinned graph layout | MUST FIX BEFORE IMPLEMENTATION | §8 F-19 |
| MA-13 | Campaign **C-00** — per-agent worktrees, repository-hygiene invariants, file ownership, integration protocol | MUST FIX BEFORE IMPLEMENTATION | §11 |
| MA-14 | Campaign **C-02a** — OpenAPI admission (zero new parsers) | MUST FIX BEFORE IMPLEMENTATION | §3 X-03 |
| MA-15 | Owners for `G-16` and for EIG prioritization — both orphaned | SHOULD FIX | §10 F-28 |
| MA-16 | A derived, rebuildable index over the fact store, plus snapshot retention/compaction | SHOULD FIX | §8 |

### 0.2 Unsafe assumptions — collected

Assumptions the plan relies on that do not hold, ordered by consequence.

| # | Assumption *(as written)* | Why it is unsafe | Class |
|---|---|---|---|
| UA-1 | "A handler's bounded call closure captures the route's effects." | Measured false. The middleware pipeline is outside every handler closure, and one middleware calls a production webhook on every GET. §4 F-01 | MUST FIX BEFORE IMPLEMENTATION |
| UA-2 | "Two witnesses are enough." | The lattice counts to two without requiring an effect witness, so `W-DECLARED_VERB` + `W-SPEC` admits production with zero implementation analysis. §4 F-03 | MUST FIX BEFORE IMPLEMENTATION |
| UA-3 | "Nightwatch's containment bounds Nightwatch's production impact." | It bounds Nightwatch's own egress only; the system under test calls production on Nightwatch's behalf, unbudgeted and invisible. §4 F-02 | MUST FIX BEFORE PRODUCTION |
| UA-4 | "The eleven gates and the two-witness proof make the credential's authority irrelevant." | Every one of those controls is inside Nightwatch's own trust domain; UA-1 shows the domain is not defect-free. §5 | MUST FIX BEFORE PRODUCTION |
| UA-5 | "`INFERENCE` never grants authority (`I-3`)." | Contradicted by `R-2`: P2 targets production using the client-side host matrix, and no gate refuses an `UNKNOWN` endpoint binding. §10 F-30 | MUST FIX BEFORE PRODUCTION |
| UA-6 | "A negative proof over the scanned inventory is evidence of absence." | `ouchan` is enumerated at roughly one third and the shortfall is never computed. §3 X-02, §4 F-05 | MUST FIX BEFORE IMPLEMENTATION |
| UA-7 | "The route → handler join is reliable." | 118 proven / 10 rejected; the join is the unwitnessed link both witnesses depend on. §4 F-04 | MUST FIX BEFORE IMPLEMENTATION |
| UA-8 | "P1 issues no requests." | Loading an authenticated SPA issues many application-initiated requests; and P1 as defined cannot satisfy mandatory L6. §6 F-13 | MUST FIX BEFORE PRODUCTION |
| UA-9 | "Structural projection makes raw bytes structurally unable to persist." | True for response bodies; false for request URLs/parameters, key names admitted as "shape", page console output, and the on-disk browser profile. §7 | MUST FIX BEFORE PRODUCTION |
| UA-10 | "Key sets are structure, not data." | In this domain, objects are routinely keyed by account id, MSP id or company name. §7 F-14 | MUST FIX BEFORE PRODUCTION |
| UA-11 | "Digests can be both salted-per-campaign and comparable across campaigns." | Mutually exclusive as specified. §7 F-15 | MUST FIX BEFORE IMPLEMENTATION |
| UA-12 | "A separate launcher is separation." | Separation is a property of the import graph, not the entry point. §6 F-12 | MUST FIX BEFORE IMPLEMENTATION |
| UA-13 | "`parseOpenApiRoutes` is unreachable, so protobuf is the only way in." | Both contract repos ship complete generated OpenAPI documents the existing parser reads. §3 X-03 | MUST FIX BEFORE IMPLEMENTATION |
| UA-14 | "Adding a new route source before C-01 merely truncates the new operations." | It **evicts** the existing ones: the counter is global and sorts `repoId` first. §10 F-27 | MUST FIX BEFORE IMPLEMENTATION |
| UA-15 | "ELK.js layout is deterministic." | Deterministic only for a fixed version, option set and platform. §8 F-19 | MUST FIX BEFORE IMPLEMENTATION |
| UA-16 | "Five coverage buckets express the required distinctions." | They cannot express `unmeasured` or `stale`, both of which the objective requires. §9 F-22 | MUST FIX BEFORE IMPLEMENTATION |

### 0.3 Acceptance-criteria corrections — collected

| Campaign / gate | Original *(E1)* | Corrected *(R2)* | Class |
|---|---|---|---|
| Programme metric | `operations modelled ≥ 900` after C-01…C-05 | Unreachable as scoped (370). Either make admission-set expansion an owner-gated C-05 deliverable with named roots, or restate the metric. §3 X-05 | MUST FIX BEFORE IMPLEMENTATION |
| **C-06** | `≥ 200 READ_ONLY_PROVEN` | **Withdrawn as a gate.** Pass = zero false positives on the negative corpus + 100 % callee classification + kind-diverse effect-mandatory witnesses + join/inventory/vocabulary preconditions. Count is reported, not gated. §4 F-08 | MUST FIX BEFORE IMPLEMENTATION |
| **C-01** | 223 operations, `routeOperationsTruncated = 0` | Adds a permanent **no-eviction** regression assertion and brings **enumeration** truncation into scope with a computed `dropped`. §10 F-27, §3 X-02 | MUST FIX BEFORE IMPLEMENTATION |
| **C-02** | ≥ 147 operations from `blueapi/billing` via a new proto lexer | Split: **C-02a** OpenAPI admission (~591 ops, ~1,179 definitions, zero new parsers) precedes **C-02b** proto lexer (streaming, service↔RPC symbol, corroboration). §3 X-03 | MUST FIX BEFORE IMPLEMENTATION |
| **C-03** | ≥ 12 services bound to ≥ 12 proto services | Insufficient for `W-EFFECT_RPC`, which needs **method**-level binding over a completely enumerated `ouchan`. Either extend, or move C-03 off the production critical path. §10 F-31 | MUST FIX BEFORE IMPLEMENTATION |
| **C-05** | one allowlist; no persisted git state | Adds owner-gated **admission-set expansion** with named target roots. §3 X-05 | MUST FIX BEFORE IMPLEMENTATION |
| **C-08** | every operation carries a binding class | Insufficient: permits every production route to be `UNKNOWN`. Add **C-08b** (`mochi` access) and require `DEPLOYMENT_FACT` for production-admitted routes. §10 F-30 | MUST FIX BEFORE PRODUCTION |
| **C-12** | "zero requests issued by Nightwatch" | "Zero requests **attributable** to Nightwatch", with every proxy-traversing request counted and attributed. §6 F-13 | MUST FIX BEFORE PRODUCTION |
| **C-14** | ≥ 1 candidate reproduced; minimization bounded | Adds: every minimized/replayed request independently re-satisfies RG-04/RG-05/G7; parameter mutation prohibited. §12 T-46 | MUST FIX BEFORE PRODUCTION |
| **C-15** | byte-identical layout; 10⁴-node render budget | Server-side content-addressed layout with pinned ELK version; the 10⁴ target is replaced by contract-bound projections with `{limit, total, dropped}` and an interactive budget at 1,000/2,000. Split C-15a (with C-01) / C-15b. §8 F-19, F-20 | SHOULD FIX |
| **RG-13** | `ORDINARY_USER` permitted for P2/P3 | `ORG_ENFORCED_READ_ONLY` required **before P2**, else a named written dated owner exception. §5 | MUST FIX BEFORE PRODUCTION |
| Coverage ledger | five buckets | seven buckets `{proven, unproven, unsupported, truncated, stale, unknown, unmeasured}`; coverage may deny, never grant. §9 F-22, F-23 | MUST FIX BEFORE IMPLEMENTATION |
| New gates | — | RG-21…RG-28 (endpoint binding, observation window, parameter source, external config, import isolation, no credential persistence, minimized-request admission, coverage-may-only-deny). §6, §7, §9 | MUST FIX BEFORE PRODUCTION |

---

## 1. Overall verdict

**The plan is directionally correct and unusually well-evidenced, and it must
not be implemented in its current form.**

Three things are right and should be preserved verbatim:

1. The diagnosis. Nightwatch's bottleneck genuinely is *source reach and
   read-only proof*, not safety machinery and not oracle depth. Every number
   the first explorer used to establish this reproduced exactly under
   independent measurement (§2).
2. The refusal to add `production` to `SUPPORTED_ENVIRONMENTS`. Option B
   (separate class / mode / config / launcher) is the correct architecture and
   the rejection rationales for A, C and D are sound.
3. The move from denylist redaction to allowlist structural projection. That is
   the right *kind* of change, correctly justified by the observation that
   production customer data is ordinary-looking.

Three things are wrong in ways that matter:

1. **The central new capability does not work as specified.** `W-EFFECT_CLOSURE`
   is rooted at the route handler and therefore cannot see the framework
   middleware pipeline. In the one repository the plan depends on, a middleware
   on the live request path performs an outbound call to a **production** host
   on every request including GETs (§3, F-01). A route "proven read-only" by
   the specified method is not proven read-only. This is not a hypothetical
   residual; it is a measured, currently-deployed counterexample.
2. **The production ladder violates the design's own invariant `I-3`.** The
   design states that no authority may be granted by an `INFERENCE`, then
   concedes in `R-2` that P2 must target production using the client-side host
   matrix because the route → runtime-host binding is `UNKNOWN`. That is
   authority granted by an inference, and no gate in the eleven-gate chain
   catches it (§7, F-03).
3. **The headline acceptance targets are unreachable as scoped and coercive.**
   `≥ 900 operations` cannot be produced by C-01…C-05 as written (§6, X-06),
   and `≥ 200 READ_ONLY_PROVEN` is very likely unreachable once the closure
   analyzer fails closed correctly — which converts the number into pressure to
   weaken the proof (§4).

One thing is a genuine, cheap, missed opportunity: **the plan builds a new
protobuf lexer to read a surface that is already sitting on disk as a
committed, machine-readable OpenAPI document that Nightwatch's existing,
already-implemented parser can read today** (§3, X-03).

Verdict: **proceed with Track A and Track D after the MUST FIX BEFORE
IMPLEMENTATION items are applied. Do not authorize C-11 through C-14 until the
MUST FIX BEFORE PRODUCTION items are resolved or explicitly accepted in writing
as residual risk by the owner.**

---

## 2. Claims confirmed

Every load-bearing claim below was re-measured independently. Where the first
explorer gave a number, the number reproduced.

| # | Claim *(E1)* | Verdict | Independent measurement |
|---|---|---|---|
| C-01 | `MAX_DISCOVERED_OPERATIONS = 128` | **CONFIRMED** | `src/core/source/surfaces.ts:59` |
| C-02 | `Routing.yaml` holds 223 route keys: 81 GET / 86 POST / 33 PUT / 23 DELETE | **CONFIRMED exactly** | `sed -nE 's/^[[:space:]]*["'"'"'](get\|post\|put\|patch\|delete):...' Routing.yaml \| sort \| uniq -c` → 23 delete, 81 get, 86 post, 33 put; total 223 |
| C-03 | The admitted 128 are 23 DELETE + 81 GET + 24 POST; 95 dropped | **CONFIRMED** | `surfaces.ts:832` sorts `repoId → source-file path → method → routeTemplate`. All 223 routes live in one file, so the effective order is method-major and `DELETE < GET < PATCH < POST < PUT` holds. Census `mutationCapable = 47 = 23+24` corroborates. *(Wording note: "path" in `audit.md §A.5` is the **source file** path, not the route template. Correct, but reads ambiguously.)* |
| C-04 | `routeOperationsTruncated` is computed and consumed by nothing | **CONFIRMED** | Repo-wide search finds it only at `surfaces.ts:818,836,875`, `surfaceTypes.ts:170`, one test fixture, and the plan documents. No CLI, contract, ledger or view reads it. |
| C-05 | `.proto` absent from `SOURCE_SCAN_EXTENSIONS` | **CONFIRMED** | `scanTypes.ts:18` |
| C-06 | `PHASE5_API_CATALOG` has 11 hand-written operations | **CONFIRMED** | `src/api/phase5/catalog.ts` — 11 entries: 6 `KNOWN_READ`, 4 `KNOWN_MUTATION`, 1 `UNKNOWN` |
| C-07 | `RIPPLE_ENDPOINT_SEMANTIC_REGISTRY = []` | **CONFIRMED** | `endpointSemantics.ts:28` |
| C-08 | Approved universe is 6 repositories; `blueapi` root is `billing` | **CONFIRMED** | `approvedScan.ts:10-17` |
| C-09 | `blueapi` = 125 `.proto` / 599 RPCs; `blueinternal` = 52 / 63 | **CONFIRMED** | Exact counts reproduced. Verb distribution reproduced within ±2 per verb (the delta is `google/` and `protoc-gen-openapiv2/` inclusion, plus 2 repo-wide `additional_bindings`). |
| C-10 | `blueapi/billing/v1/billing.proto` = 147 RPCs / 39 GET bindings | **CONFIRMED exactly** | 147 `rpc`, verbs: 39 get / 64 post / 25 put / 17 delete / 2 patch |
| C-11 | `blueapi/billing` admits 0 files because the only file is `.proto` | **CONFIRMED** | `billing/` contains exactly one file, and it is a `.proto` |
| C-12 | D-4 holds: `SUPPORTED_ENVIRONMENTS = ['local','dev','next']`; `production.json` structurally unloadable | **CONFIRMED** | `environment/index.ts:17`; `config/environments/production.json` has `"supported": false` and `"name": "production"`, which the loader rejects |
| C-13 | Browser hardening flags claimed by `T-13` exist | **CONFIRMED** | `src/browser/contract.ts:21-22` — `--disable-quic`, `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`. *(These are existing controls, not proposed ones; `T-13` should say so.)* |
| C-14 | Control Center renders 24 nodes / 48 edges against a far larger contract | **CONFIRMED** | `App.tsx` `slice(0,24)` / `slice(0,48)`; `CONTROL_CENTER_LIMITS` = default 250/500, max 1000/2000 |
| C-15 | The concurrent-agent Git damage was repaired | **CONFIRMED** | Zero `skip-worktree`/`assume-unchanged` bits (`git ls-files -v`), pristine `.git/info/exclude`, one worktree, no non-sample hooks |
| C-16 | The safety kernel (L0–L6, address policy, owner scope, external-only auth state) is sound | **CONFIRMED** *(spot-checked, not exhaustively re-derived)* | Consistent with `AGENTS.md`, `outboundPolicy.ts`, `addressPolicy.ts`, `ownerScope.ts`. No contradicting evidence found. |

Additionally confirmed as sound design judgements, with no criticism to offer:

- Rejecting runtime differential proof as circular (`design.md §4.3`). Correct.
- Rejecting a fourth environment entry (`design.md §5.1` option A). Correct, and
  the "a file that cannot be loaded cannot be mis-selected" rationale is the
  right one.
- Rejecting D3-force for non-determinism (`design.md §7.2`). Correct.
- Prohibiting a single global coverage percentage. Correct.
- Making `MUTATION_CAPABLE` terminal and never re-litigated. Correct.
- Budgets reserved-before-execution and never refunded. Correct.
- Keeping the Control Center GET/HEAD-only with `executionAuthority: NONE`, and
  requiring any future trigger to be a separate CLI. Correct.

---

## 3. Claims corrected

### X-01 · `B-6` is false — the SSE subscription **is** invoked · SHOULD FIX

*(E1)* `audit.md §A.8` / `§A.11` / `B-6`: "`subscribeToControlCenterEvents`
exists in `api.ts` but is **not invoked** by `App.tsx` — refresh is manual
only" (`STRONGLY_SUPPORTED`).

*(R2)* **Incorrect.** It is imported at `ui/control-center/src/App.tsx:2` and
invoked at `ui/control-center/src/App.tsx:365`:

```tsx
useEffect(() => subscribeToControlCenterEvents(() => setRefreshKey((value) => value + 1)), []);
```

`B-6` must be retracted. It is a small error, but it is the only claim in the
audit that was hedged below `PROVEN` and turned out to be wrong — which is
evidence the evidence-classing discipline is working.

### X-02 · `B-8` is misread and its severity is wrong (LOW → HIGH) · MUST FIX BEFORE IMPLEMENTATION

*(E1)* `B-8`, severity LOW: "`ouchan` silently hits its 1,024-file cap
(`SOURCE_FILE_COUNT_EXCEEDED: 1`)". `audit.md §A.4`: "857 files considered, 753
admitted".

*(R2)* The count `1` does **not** mean "one file was rejected for exceeding the
count". It is a one-shot flag:

```ts
// src/core/source/scan.ts:191-193
if (enumeration.truncationReason !== null && counts[enumeration.truncationReason] === 0) {
  counts[enumeration.truncationReason] += 1;
  budgetRejections += 1;
}
```

and the enumerator **aborts the directory walk** at the first budget hit:

```ts
// src/core/source/siblingSource.ts:273-276
truncated = true;
truncationReason = 'SOURCE_FILE_COUNT_EXCEEDED';
return false;
```

Measured scope of the loss:

| Repo root | Approved-extension files on disk | Bytes (`.go` only) | Config cap |
|---|---|---|---|
| `ouchan/{services,pkg}` (excl. `vendor`) | **3,025** | 28,433,151 | `maxFiles: 1024`, `maxTotalBytes: 16 MB` |
| `ripple-api/src` | 96 | 1,750,958 | same |
| `ripple-ui/src` | 387 | 1,267,665 | same |

So roughly **two thirds of `ouchan` is never enumerated at all** — not
rejected, not counted, not reported. The number of dropped files is not merely
unsurfaced (as with `B-1`); it is **never computed**.

This is a strictly larger instance of the `B-1` bug class and it belongs in
`C-01`, not in a LOW backlog row. Two consequences:

1. `C-01`'s scope must cover **enumeration** truncation, not only **operation**
   truncation. `TRUNCATED` must carry `{limit, examined, dropped}`, and
   `dropped` must be computed, which requires the walk to continue counting
   after it stops admitting.
2. There is a hard ceiling the plan never mentions:
   `MAX_SIBLING_SOURCE_SCAN_FILES = 4096` (`siblingSource.ts:20`). A complete
   `ouchan` walk visits more paths than that. Raising it is a change to the
   sibling-source safety boundary and must be an explicit, owner-visible
   decision — not an incidental constant bump inside C-03.

Good news, and it matters: **`ripple-api/src` is fully enumerated** (96 files,
1.75 MB — both far under the caps). The PHP surface therefore does *not* suffer
this soundness problem. The 57 % figure for `ripple-api` is purely the
operation cap. Only the Go surface is affected.

### X-03 · `parseOpenApiRoutes` is not dead code, and C-02's premise is falsified · MUST FIX BEFORE IMPLEMENTATION

*(E1)* `audit.md §A.11` / `B-7`: "`parseOpenApiRoutes` — no
`openapi.json`/`swagger.json` inside any approved root" → listed as unreachable
architecture. `G-02`/`C-02`: the way to read the RPC surface is a new
`PROTOBUF` language, a new `.proto` extension, and a new bounded proto lexer.

*(R2)* The statement is literally true and the conclusion drawn from it is
wrong. Both contract repositories ship a **committed, generated, complete
OpenAPI mirror of their entire HTTP surface**:

| Artifact | Measurement |
|---|---|
| `alphauslabs/blueapi/openapiv2/apidocs.swagger.json` | swagger **2.0**, 1,435,500 bytes, **462 paths**, **591 operations**, **591** with a `responses["200"].schema`, **1,179 `definitions`** |
| verb split | get 185 · post 253 · put 91 · patch 2 · delete 60 |
| `alphauslabs/blueinternal/openapiv2/apidocs.swagger.json` | exists |

Now compare against what Nightwatch already has:

- `.json` **is already** in `SOURCE_SCAN_EXTENSIONS` (`scanTypes.ts:18`).
- `apidocs.swagger.json` **already matches** `ROUTE_FILE_RE`
  (`surfaces.ts:60`, which ends `|openapi\.json|swagger\.json)$/i`).
- `parseOpenApiRoutes` (`surfaces.ts:257-281`) **already parses exactly this
  shape**: `paths → method → operationId`, emitting `routeProof: 'PROVEN'`.
- 1,435,500 bytes is under `maxFileBytes: 2_000_000`.

**The only thing preventing Nightwatch from reading all 591 `blueapi` HTTP
operations today is that `APPROVED_ROOTS['alphauslabs/blueapi']` is `['billing']`
and does not include `openapiv2`.** That is one line of owner-approved data.

Consequences:

- `C-02` as scoped (new language + new extension + new lexer + adversarial
  corpus, to yield 147 operations from one `.proto`) is the **expensive path to
  a smaller result**. Split it:
  - **C-02a — OpenAPI admission.** Admit `blueapi/openapiv2` and
    `blueinternal/openapiv2`. Zero new parsers. Yields ~591 + ~57 operations
    with verb, path and operationId. Effort: S, mostly test and ledger work.
  - **C-02b — protobuf lexer.** Still worth doing, but for what OpenAPI cannot
    give: streaming RPCs (90 repo-wide `returns (stream …)`), the proto service
    ↔ RPC symbol needed to join to Go registration sites (C-03), and
    independent corroboration of the generated artifact.
- `G-10` ("response contracts thin … target ≥ 400", effort M, depends on
  protobuf) is largely solved by C-02a: **591 response schemas and 1,179
  definitions** are already machine-readable. `parseOpenApiRoutes` currently
  reads a non-standard `x-response-schema` key rather than
  `responses["200"].schema.$ref`; binding `$ref` → `definitions` is a bounded
  extension to an existing tested parser, far smaller than the planned work.
- `B-7` must be corrected: the OpenAPI parser is not dead, it is one allowlist
  entry away from being the highest-yield parser in the system. (The Go and
  TS/JS branches of `parseStaticRoutes` remain genuinely unreachable —
  that part of `B-7` stands.)

Two caveats that must be carried into the campaign, not glossed:

- **Generated-artifact currency.** The swagger mirror is *approximately* but
  not *exactly* current against the protos (get 185 vs 187, delete 60 vs 61,
  post 253 vs 254). It is regenerated only when someone runs the generator.
  Admit it as `SOURCE_FACT` **with a `GENERATED_ARTIFACT` qualifier**, require a
  generation-currency check against the proto surface once C-02b exists, and
  **bar it from being the sole basis of a production admission** until that
  check passes.
- **Size headroom.** 1,435,500 / 2,000,000 = 72 %. Growth silently flips this
  file to `SOURCE_FILE_TOO_LARGE`. Once `TRUNCATED`/rejection reporting from
  C-01 exists this becomes visible; until then it is a silent cliff.

### X-04 · `U-6` is settled, not open · SHOULD FIX

*(E1)* `U-6`: "Whether `blue-sdk-ts` descriptor decoding is needed or the
`openapiv2/apidocs.swagger.json` fallback suffices."

*(R2)* **Settled by measurement.** The fallback covers 591 of ~595 verb-bound
`blueapi` RPCs with full path, verb, operationId and 200-response schema. No
descriptor decoding is needed for the HTTP surface. Close `U-6` and record the
measurement.

### X-05 · The `≥ 900 operations` target is unreachable as scoped · MUST FIX BEFORE IMPLEMENTATION

*(E1)* `MASTER_PLAN §0`: operations modelled `128 → ≥ 900 (≥ 5 repos, uncapped)`
after C-01…C-05.

*(R2)* Arithmetic, using the campaigns' own acceptance criteria:

| Source | Operations | Unlocked by |
|---|---|---|
| `ripple-api` uncapped | 223 | C-01 |
| `blueapi/billing` `.proto` | 147 | C-02 as written |
| **Total after C-01 + C-02 as written** | **370** | |

To exceed 900 you need `blueapi` in full (591 via C-02a) plus `blueinternal`
(~57) plus `wave-api` (~80). Every one of those requires **expanding
`APPROVED_ROOTS`** — and no campaign's acceptance criteria contain that. C-05's
acceptance is discovery and hygiene only: "discovery enumerates 148
repositories and classifies them; the approved set is a single list". Discovery
explicitly "grants nothing" (`G-07`).

Fix: either make admission-set expansion an explicit, owner-gated deliverable of
C-05 with named target roots, or restate the metric as what the campaigns
actually deliver. Do not leave a headline number that no campaign can produce.

### X-06 · Minor wording corrections

- `audit.md §A.5`: "sorted by repo → path → method" — "path" is the **source
  file** path. Say so; as written it reads as the route template and makes the
  method-major conclusion look like a non-sequitur.
- `THREAT_MODEL T-13`: `--disable-quic` and the WebRTC policy flag already
  exist (`browser/contract.ts:21-22`). Mark them existing controls, not
  proposed ones.
- `audit.md §A.8`: "contract limits are `nodeLimit 1000` / `edgeLimit 2000`" —
  those are the **maxima**; the defaults are 250/500
  (`controlCenter/contracts/common.ts:27-30`). The UI renders 9.6 % of the
  default, 2.4 % of the maximum.

---

## 4. Two-witness read-only proof — adversarial assessment

This is the most security-critical design in the plan and it needs the most
work. The *shape* is right. The *specification* is unsound.

### F-01 · The closure is rooted in the wrong place — MEASURED COUNTEREXAMPLE · MUST FIX BEFORE IMPLEMENTATION

`W-EFFECT_CLOSURE` is defined over "the PHP handler's bounded call closure".
Ripple is a Slim-style application with a middleware pipeline attached per
route group, and **the pipeline is not part of any handler's closure**.

`mobingilabs/ripple-api/src/App/Route/Providor/RouteProvidor.php` attaches five
middlewares; line 74 attaches `MarketplaceSubscriptionMiddleware` to every route
group whose routing config enables `x-header`:

```php
if ($mk == "x-header" && $mv && $x_header) {
    $rg->add($marketplace_subscription);
    $rg->add($x_header);
}
```

`src/App/Middleware/MarketplaceSubscriptionMiddleware.php`:

- `:18` declares `SUBSCRIPTION_CHECK_URL` as a hard-coded **production** URL on
  `api.alphaus.cloud` (the constant embeds a webhook path token; it is
  referenced here by file:line and deliberately not reproduced);
- `:26` `public function __invoke($request, $response, $next)` — **no HTTP
  method guard**;
- `:36` unconditionally calls `checkSubscriptionViaWebhookd($mspId)`;
- `:100-115` performs a `curl` to that production URL with the customer's
  `mspId` in the query string.

Therefore: **a `ripple-api` GET route that the plan's method proves
`READ_ONLY_PROVEN` still performs a cross-service call to a production host on
every request, with effects Nightwatch cannot analyse** (the callee lives in a
repository outside the universe). The proof, as specified, is unsound in the
one repository the entire near-term plan depends on.

Required corrections:

1. The effect closure must be rooted at the **route's fully resolved middleware
   pipeline plus handler**, derived mechanically from `RouteProvidor.php` and
   the per-route `middleware` config in `Routing.yaml`.
2. If the pipeline cannot be resolved mechanically for a route, the route is
   `AMBIGUOUS`. Fail closed. Do not fall back to handler-only.
3. Add a hard rule: **any outbound network call anywhere in the resolved
   closure is disqualifying** unless the callee is itself a
   `READ_ONLY_PROVEN` surface in the model. Cross-repository callees are
   `UNKNOWN`, and `UNKNOWN` is never `SAFE` (`I-5`).

### F-02 · Transitive production contact via the system under test — MISSING HAZARD CLASS · MUST FIX BEFORE PRODUCTION

F-01 exposes a hazard the threat model has no concept of. Nightwatch's entire
L0–L6 containment stack governs **Nightwatch's own egress**. It says nothing
about the system under test calling production *on Nightwatch's behalf*.

A DEV request to `ripple-api` causes the DEV server to call
`api.alphaus.cloud`. Nightwatch cannot see it, cannot block it, and does not
count it. Two consequences:

- Nightwatch's existing DEV campaigns have most likely **already** been
  inducing production-side calls transitively. That is not a violation of
  Nightwatch's safety model (no Nightwatch egress to production occurred) but
  it is a fact the owner should know, and it should be recorded honestly
  alongside D-27 rather than discovered later.
- **The budget model measures the wrong quantity.** `RG-08` and `design.md §5.4`
  budget *Nightwatch-originated* requests (200 global / 50 per service / 10 per
  route). The blast radius is Nightwatch-originated requests × induced
  downstream fan-out, which is unbounded and unmeasured. Either estimate
  fan-out from the source model (the plan's own C-03/C-04 edges are exactly the
  right input) and budget against it, or state explicitly and prominently that
  the budget bounds only Nightwatch's own requests and that total production
  load is `UNKNOWN`.

### F-03 · The lattice permits a "proof" with no implementation evidence · MUST FIX BEFORE IMPLEMENTATION

`design.md §4.2` counts witnesses to two without constraining their kinds. The
five classes are two declaration witnesses (`W-DECLARED_VERB`,
`W-DECLARED_ROUTE`), two effect witnesses (`W-EFFECT_CLOSURE`, `W-EFFECT_RPC`)
and one documentary witness (`W-SPEC`). Nothing in the specification forbids:

`W-DECLARED_VERB` + `W-SPEC` ⇒ `READ_ONLY_PROVEN`

which admits a production request on the strength of an HTTP verb annotation
plus a Markdown sentence in a different repository, with **zero analysis of the
implementation**. That is precisely the failure mode D-55 exists to prevent
("a provenance label alone never grants semantic authority").

Required:

1. Redefine the admission rule as **kind-diverse, effect-mandatory**: a
   production-eligible proof requires **≥ 1 declaration witness AND ≥ 1 effect
   witness**. Counting to two is not the criterion.
2. **Bar `W-SPEC` from production admission entirely.** It may raise DEV
   eligibility and may corroborate, exactly as runtime evidence may corroborate
   but never establish (`§4.3`). Human prose is a weaker evidence class than
   the source it describes, and OpenSpec coverage is skewed toward recent
   changes, so its absence is uninformative and its presence is not a property
   of the deployed code.

### F-04 · The route → handler join is an unwitnessed third link · MUST FIX BEFORE IMPLEMENTATION

Both witnesses describe the same operation only if the `client`/`method` join
resolves correctly. The live census reports **118 joins proven / 10 rejected**
— a ~8 % failure rate on the very link the pair depends on.

Required: make join state a **named precondition of the witness pair**, recorded
on the proof with its own evidence digest. A join that is `AMBIGUOUS`,
`REJECTED` or duplicate-derived is terminal for read-only proof, regardless of
how many witnesses fired. (Note `surfaces.ts:840-846` already marks duplicate
route keys `ROUTE_AMBIGUOUS`; that state must propagate into the proof, not just
the route.)

### F-05 · `W-EFFECT_RPC` is unsound over a truncated inventory · MUST FIX BEFORE IMPLEMENTATION

A negative proof — "this closure contains no write" — is evidence of absence
only over a **complete** search space. Per X-02, `ouchan` is enumerated at
roughly one third of its approved-extension files, and the walk aborts silently.
Unresolved callees fail closed, which is correct and safe, but it means
`W-EFFECT_RPC` will either produce almost nothing or be quietly relaxed.

Required: the effect-closure analyzer must assert **repository-complete
enumeration** for every repository it traverses, and fail closed at the
*repository* level (`INVENTORY_INCOMPLETE`) rather than per-callee. A per-callee
failure looks like a normal miss; a repository-level failure is visible.

### F-06 · Dynamic dispatch and framework indirection are real, present, and shrink the ceiling · SHOULD FIX (as scoping truth)

Concrete instances in `ripple-api` GET paths:

- `src/App/Handler/IntegrateApp.php:58-131` —
  `$callfnc = 'get'.$thirdparty.'Settings'; return $this->$callfnc();`
- `src/App/Handler/Traits/CalculationTrait.php:1880-1947` —
  `$this->{$this->modal->roundingExchange}()`
- handlers invoking other handlers via `setClient()`

Failing closed on these is correct. The plan should say plainly that **the
correct behaviour reduces the achievable count**, so the number is never used
to argue for relaxing it. In addition, the ambiguity vocabulary must cover PHP
constructs that make a callee *name* not the executed method — `__call`,
`__callStatic`, `__get`, `call_user_func[_array]`, variable functions and
variable methods, `eval`, and `register_shutdown_function`. Presence of any of
these in the closure ⇒ `AMBIGUOUS`.

### F-07 · `WRITE_VOCABULARY` is scoped to the DAO surface and misses most effect kinds · MUST FIX BEFORE IMPLEMENTATION

`T-02` says the vocabulary is derived "by enumerating the *entire* DAO/method
surface". A DAO enumeration does not cover: message publication (Pub/Sub, SQS,
queue dispatch), cache mutation (set/delete/invalidate), session writes, file
writes, raw SQL string literals containing `INSERT`/`UPDATE`/`DELETE`, ORM
`save`/`persist`/`flush`, and **outbound HTTP/gRPC calls** (F-01).

Required: replace the binary read/write classification with an **effect-kind
lattice** — `DATA_WRITE`, `AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`,
`MESSAGE_PUBLISH`, `EXTERNAL_CALL`, `PURE_READ`, `UNCLASSIFIED` — and require an
explicit owner-approved policy **per kind**, recorded on every proof. This
matters concretely: if Ripple writes an access/audit row on every request, a
binary vocabulary yields either zero proofs or a silent exception. An explicit
kind lattice forces that decision into the open where the owner can make it.

### F-08 · The `≥ 200 READ_ONLY_PROVEN` acceptance target · MUST FIX BEFORE IMPLEMENTATION

The prompt's instinct is correct and this review endorses it without
reservation.

Where could 200 come from? The candidate pool is 81 PHP GETs plus ~185 OpenAPI
GET operations. The PHP pool is reduced by middleware disqualification (F-01),
cross-repository callees (F-01/F-07), dynamic dispatch (F-06) and join failures
(F-04). The OpenAPI pool has **no effect witness at all** until Go analysis
exists, and Go analysis is unsound until enumeration is complete (F-05) — which
needs a safety-boundary change. Under a correct, fail-closed implementation the
realistic near-term figure is **plausibly in the tens, and could be zero**.

A numeric floor in that situation is not a target; it is pressure. Every
mechanism listed above that reduces the count is a mechanism an implementer
under quota is incentivized to weaken, and each weakening is individually
arguable.

**Replace the acceptance criterion.** C-06 passes when:

1. **Zero false positives** on the negative corpus — the two historical D-79
   admissions, a GET whose resolved closure reaches a write, a GET whose
   middleware performs an external call (F-01 is now a ready-made fixture), an
   unclassified callee, a depth-bound overflow, a dynamic-dispatch callee, an
   ambiguous join.
2. **100 % callee-identifier classification coverage** for every repository
   admitted to the proof, with `UNCLASSIFIED > 0` blocking promotion (`T-02`
   already says this; make it the gate).
3. **Every proof is kind-diverse and effect-mandatory** (F-03) and carries its
   join precondition (F-04), its inventory-completeness assertion (F-05), and
   its vocabulary digest.
4. The 11-row catalog is no longer an input to classification.
5. The achieved count is **reported as an observation**, per repository and per
   effect-kind, in the coverage ledger — never as a pass/fail threshold.

If a floor is wanted for programme tracking, put it on **DEV** eligibility
(`READ_ONLY_SINGLE_WITNESS` is DEV-executable), where being wrong is cheap.
Never on the population that gates production.

### Assessment of the remaining items in the prompt's §2 list

- **Bounded call closure / depth overflow / unresolved calls** — correctly
  specified as fail-closed. Sound.
- **Indirect writes / asynchronous writes** — inadequately covered; F-07.
- **Logging/audit writes** — not addressed at all; F-07 makes it an explicit
  owner decision.
- **Cache mutation** — `T-23` covers cache *warming* from the client side but
  not a handler that writes a cache entry; F-07.
- **GET endpoints with side effects** — `T-03` names the hazard and honestly
  marks the residual `UNRESOLVED`. That framing is correct; F-01 converts it
  from a hypothetical into a measured instance, which should be recorded.
- **Framework/service-container behaviour** — the DI container itself is not a
  write risk, but the middleware pipeline it wires is; F-01.
- **Independence of the two witnesses** — declaration and effect witnesses are
  genuinely independent in *evidence source*, and this review does not accept
  the objection that "they are both from the same repo at the same SHA" is
  disqualifying: they have different failure modes. The real independence
  defects are F-03 (no kind requirement) and F-04 (shared unwitnessed join).

---

## 5. Production observer identity

**Recommendation: `ORG_ENFORCED_READ_ONLY` must be mandatory before P2 — the
first Nightwatch-issued production request — not before P4.** This is a
disagreement with the plan.

*(E1)* `design.md §5.6` / `RG-13`: `ORDINARY_USER` permitted for P2/P3 "because
the eleven-gate chain and the two-witness read-only proof do not rely on it";
`ORG_ENFORCED_READ_ONLY` required only for P4.

*(R2)* The reasoning is exactly inverted. The argument "the gates do not rely on
the credential" is an argument for *why RBAC is not load-bearing*, not an
argument for *why it can be omitted*. Consider where each control lives:

| Control | Trust domain |
|---|---|
| Passive action policy | Nightwatch code |
| Two-witness read-only proof | Nightwatch code |
| Method restriction, no body (G7) | Nightwatch code |
| Eleven-gate admission chain | Nightwatch code |
| Budgets, breakers, kill switch | Nightwatch code |
| L0–L6 containment | Nightwatch code |
| **Organizationally enforced read-only credential** | **Outside Nightwatch** |

With `ORDINARY_USER`, **every single control is inside Nightwatch's own trust
domain**. The owner's stated desired property — "Nightwatch should not be *able*
to manipulate customer or production data" — is a statement about *capability*,
and capability cannot be established by the artifact whose capability is in
question. `ORDINARY_USER` downgrades that property to "Nightwatch is *coded not
to*", which is a different and much weaker claim.

That would still be an arguable engineering trade if the in-domain controls were
airtight. F-01 proves they are not: the flagship control has a measured
soundness hole in the one repository in scope, found by a second reviewer in a
few hours. The probability that the remaining in-domain controls are jointly
perfect on first implementation is not high enough to be the only line.

There is also a second, independent reason the plan does not mention:
**attribution**. Under `ORDINARY_USER`, production audit logs record a *human*
performing automated traffic. That is an impersonation and compliance problem
regardless of whether any write occurs, and a dedicated observer identity fixes
it at the same time.

Recommended stage requirements:

| Stage | Identity requirement |
|---|---|
| P0, PQ | none — no real contact |
| P1 (passive) | the operator's own session, **operator-driven**, explicitly acknowledged (see §7 F-10) |
| **P2 (first issued request)** | **`ORG_ENFORCED_READ_ONLY` required** |
| P3, P4 | `ORG_ENFORCED_READ_ONLY` required |

**If organizational read-only identity is unavailable** (`U-3` remains
`UNKNOWN`), the following must be written down and explicitly accepted by the
owner, in the owner's own words, before P2 — not inherited from this document:

1. Nightwatch will hold a credential capable of mutating production data.
2. The only barriers are Nightwatch's own code and configuration; there is no
   external enforcement.
3. A defect in the read-only proof, the admission chain, the action policy or
   the method restriction is sufficient for a production write.
4. A measured instance of proof unsoundness already exists (F-01), so the
   residual is demonstrated, not theoretical.
5. Every production access will be attributed to a human identity in audit
   logs.
6. Compensating controls in force: per-route budget 10, serial execution,
   post-condition mutation-signal detection, immediate campaign termination on
   any anomaly, and the P1-before-P2 requirement.

`RG-13` currently reads "Observer identity lacks write capability **where
organizationally possible**". That phrasing lets the strongest control be
skipped for convenience. Change it to a hard requirement with a **named,
signed, dated owner exception** as the only alternative.

---

## 6. `PROD_OBSERVE` separation

The chosen architecture (option B) is correct and this review endorses it. Four
paths were found by which existing DEV/NEXT machinery could become production
authority.

### F-09 · An in-repo loadable production config re-creates what D-4 removed · MUST FIX BEFORE IMPLEMENTATION

`design.md §5.1` proposes `config/observation/prod.v1.json`. D-4's strength is
that the only in-repo production artifact **cannot be loaded**. Adding a second,
loadable, in-repo file containing production hosts substitutes a naming
convention for a structural property.

Required: the production observation config must be **external-only** — absolute
path outside the repository and outside the Alphaus workspace, regular
non-symlink file, mode `0600`, referenced by a dedicated environment variable —
exactly the D-13/D-20 storage-state discipline, and for the same reason. No
production host may be written into the repository outside
`config/environments/production.json`, which stays unloadable.

### F-10 · "Invert `KNOWN_PRODUCTION_HOSTS` into an allow table" is one boolean from catastrophe · MUST FIX BEFORE IMPLEMENTATION

`design.md §5.3` proposes reusing the deny table as the production allow table.
The same data structure would mean "deny" in three modes and "allow" in a
fourth, distinguished by a mode flag.

Required: `KNOWN_PRODUCTION_HOSTS` remains **deny-only in every mode, including
`PROD_OBSERVE`**. The production allowlist is a separate structure built solely
from the external config (F-09), and a hardening rule forbids the production
policy module from importing `KNOWN_PRODUCTION_HOSTS` at all. A host is
reachable in `PROD_OBSERVE` only by explicit presence in the external
allowlist — never by inversion of an existing table.

### F-11 · `realRunGate` cannot be reused and must not be parameterized · MUST FIX BEFORE IMPLEMENTATION

`src/core/safety/realRunGate.ts` refuses any host for which
`isProductionClassHost(...)` holds, and hard-asserts
`env.name === 'dev' || (next && !requiresAuth)`. `PROD_OBSERVE` therefore either
duplicates it (drift between two gates, the worse outcome over time) or gains a
production-permitting branch (which destroys the DEV guard for every existing
campaign).

Required: a distinct `productionRunGate` sharing **no branch** with
`realRunGate`, plus a hardening rule asserting `realRunGate.ts` contains no
production-permitting path and no mode parameter. Shared low-level helpers may
be reused; the *decision* must not be.

### F-12 · Import-graph separation must be enforced, not asserted · MUST FIX BEFORE IMPLEMENTATION

"A separate launcher that physically cannot execute a DEV/NEXT campaign" is a
property of the *import graph*, not of the entry point. Required hardening
rules: the production cone must not import the DEV campaign orchestrator or the
DEV environment loader; the DEV cone must not import the production policy; and
shared modules must take their policy **by injection with no default** — a
missing policy throws, never falls back.

### Assessment of the remaining §4 items

Sound as designed, no criticism: separate policy class; one-shot expiring
authorization with `ALREADY_CONSUMED` semantics; mandatory L6 (subject to F-13);
network allowlisting; resolved-address policy reuse (L5 is genuinely strong);
redirect re-evaluation through the L0 CDP guard; WebSocket prohibition;
download prohibition; reserved-never-refunded budgets; breakers; kill switch.

Three refinements:

- **Gate ordering** — the kill switch is checked only at G11. It is the
  cheapest and most urgent check; evaluate it at **entry and at G11**. *SHOULD
  FIX.*
- **Two missing gates** — nothing asserts (a) the observer identity class meets
  the stage minimum (that comparison currently lives only in prose; §5), and
  (b) the request carries no customer identifier that did not come from the
  approved parameter source (§7 F-16). *MUST FIX BEFORE PRODUCTION.*
- **Missing post-condition** — a rotated `Set-Cookie` on a production response
  must never be written back to the storage-state file. Assert no
  `context.storageState()` persistence path exists in the production cone.
  *MUST FIX BEFORE PRODUCTION.*
- **Organizational window** — no gate requires the owner to attest an approved
  observation window. Automated traffic arriving during an incident or a
  month-end cost-finalization run is an operational hazard independent of
  correctness. Add gate `G-ORG`. *MUST FIX BEFORE PRODUCTION.*

### F-13 · P1 contradicts mandatory L6 and is ungated · MUST FIX BEFORE PRODUCTION

`design.md §5.5` defines P1 as "observe the operator's own already-loaded
production page; issue no request". Three problems:

1. **It contradicts `T-13`/`RG-18`**, which make a fresh rootless L6 namespace
   mandatory for *every* production run. An operator's already-running browser
   cannot be placed inside a fresh `--unshare-net` namespace. Either P1 is
   exempt from L6 — which must be stated, justified and gated — or P1 must use
   a Nightwatch-launched contained browser, which contradicts "the operator's
   own already-loaded page".
2. **The eleven gates do not apply.** G4, G5, G7 and G8 are *request-issuance*
   gates. P1 issues nothing, so P1 is protected only by the privacy firewall,
   while the operator may navigate anywhere — including far outside any
   admitted route, and including mutating actions the operator performs while
   Nightwatch is recording.
3. **"Zero requests issued by Nightwatch" is an accounting fiction.** Loading an
   authenticated SPA issues dozens of application-initiated requests. If
   Nightwatch causes the page to load, "Nightwatch issued nothing" is true only
   under a definition that hides the traffic.

Required: define P1 precisely as **attach-only, operator-driven, no navigation,
no interaction, no page load initiated by Nightwatch**; give it its own
observation-scope admission chain (which surfaces may be *recorded*, not which
may be *requested*); state the L6 exemption explicitly with its rationale; and
change the acceptance criterion from "zero requests issued by Nightwatch" to
**"zero requests attributable to Nightwatch, with every request traversing the
proxy counted and attributed"**.

---

## 7. Privacy firewall

The change of kind (denylist → allowlist structural projection) is right. Five
leakage paths break the boundary as specified.

### F-14 · "shape (key set)" is in the allowlist, and key sets can be customer data · MUST FIX BEFORE PRODUCTION

`design.md §6.2` admits `shape (key set, nesting)` for persistence. In this
domain, objects keyed by AWS account id, MSP id, billing-group id or company
name are routine — Nightwatch's own `EMPTY_ARRAY_OR_STRING_KEYS` extractor
exists precisely because dynamic string keys occur in Ripple responses. A key
set is therefore *sometimes a value set*, and the allowlist admits it
unconditionally.

Required: a key name may be persisted **only** if it is a member of a
source-proven finite key set (which C-02a's 1,179 `definitions` and the existing
`PHP_FUNCTION_LIST_ROW_KEYS` recipes can supply). Otherwise the projection emits
**cardinality plus a digest**, never the key literal. This is a real leak, not a
theoretical one.

### F-15 · Per-campaign salt contradicts cross-campaign comparison · MUST FIX BEFORE IMPLEMENTATION

Direct internal contradiction:

- `§6.4`: digest salt is "per-campaign random, never persisted"; `T-30`
  requires two campaigns over identical data to produce **different** digests.
- `§9.4`: new-deployment detection compares "a fixed `READ_ONLY_PROVEN` probe's
  structural digest" **across campaigns**; cross-version comparison compares
  DEV/NEXT/PROD projections of the same route.

Both cannot hold with one digest family. Required: two explicitly separate
families —

- **Structural digest** — computed over shape and type only, with **no value
  input**, unsalted, stable, comparable across runs and environments. Safe
  because it never ingests a value.
- **Value digest** — salted per campaign, never persisted, never compared.

Name them distinctly in the projection contract so a future implementer cannot
merge them.

### F-16 · No production request-parameter provenance model · MUST FIX BEFORE PRODUCTION

To issue a meaningful production read you need real customer identifiers. This
is not hypothetical: F-01 shows `?mspId=` on the live request path, and the
Ripple route table is full of `/{id}` templates. The plan never says where
those values come from.

Wherever they come from, they are customer data, and they would flow into
outbound URLs, the L0 fetch-guard records, the L5 proxy event log, per-route
budget keys, replay fingerprints and the reservation ledger — **every one of
which is outside the projection boundary**. `§6.4` says "route template only;
concrete path params replaced by `{}`" for *retention*, which does not address
construction, logging or keying.

Required, before P2: an explicit parameter-provenance model — owner-supplied,
stored external-only like storage state, referenced inside Nightwatch by an
**opaque handle**, with the concrete value resolved only inside the request
builder and never entering any log, key, digest input, ledger, error or
checkpoint. Add the corresponding admission gate (§6).

### F-17 · Ephemeral browser state still reaches disk · SHOULD FIX

Verified in Nightwatch's favour: there is **no** `launchPersistentContext` or
`userDataDir` in the codebase, so contexts are ephemeral and Playwright's
profile directory is removed on close. That is better than assumed.

Residual: the profile directory exists on disk *during* the session and holds
cache, IndexedDB and localStorage from authenticated production pages, and it is
**not** removed if the process is killed or crashes. Required for production:
disable the disk cache explicitly, place the profile on a private ephemeral
path, and add crash-path cleanup to the persistence audit's scope. Also disable
crash dumps in the production cone.

### F-18 · Control Center must be structurally excluded from the production store · MUST FIX BEFORE PRODUCTION

`createFindingsAuthority()` defaults to `.nightwatch/findings`
(`privateArtifacts.ts:19`), so a separate `prod-findings` root is *not* read
today. That is correct by accident, not by construction.

Required: state as an invariant that the Control Center's findings authority may
never be pointed at the production store, and enforce it with a hardening rule.
The Control Center is a localhost HTTP server reachable by any local process;
`Host`/`Origin` validation is not an authorization boundary against local
software.

### Remaining leakage paths from the prompt's §5 list

Adequately covered by `§6.3`, `§6.5` and `T-28`: error messages, exception
objects, stack traces, screenshots, Playwright traces, browser dialogs, HTTP
headers, cookies, publication.

Not adequately covered, add to `§6.5`:

- **Console logs.** Page-emitted `console` output routinely contains response
  bodies. The observers capture console events. The error-path leakage test
  covers *Nightwatch's* errors, not the *page's* console. Console capture must
  be disabled in production, or projected before storage.
- **Hashes of low-entropy values.** The prompt names this and `§6.2` admits
  digests. A digest of a 12-digit AWS account id or a `YYYYMM` period is
  trivially invertible by enumeration. Value digests must be salted (F-15) and
  must never be computed over a field whose domain is enumerable.
- **URLs and query parameters** — F-16.
- **Temporary files and crash dumps** — F-17.
- **SSE** — the stream pushes state; ensure the state it pushes is projected
  output, not raw authority snapshots.

### Can raw production bytes be made structurally incapable of reaching persistence?

**Yes, but not by the design as written.** The projection boundary
(`§6.1`–`§6.3`) plus the import-isolation hardening rule (`§6.5` "boundary
isolation") is the right mechanism and, if enforced, does make the *response
body* path structurally safe. What defeats "structurally incapable" today is
that four paths carry production bytes **around** the boundary rather than
through it: request URLs and parameters (F-16), key names admitted as "shape"
(F-14), page console output, and the on-disk browser profile (F-17). Close those
four and the claim becomes defensible. Until then it should be stated as
"bodies are structurally incapable; identifiers are policy-controlled", which is
a weaker and honest claim.

---

## 8. System Map V2

Largely sound. `ELK.js` + canvas over D3-force is the right call and the
determinism rationale is correct.

### F-19 · Determinism must be a server-side property · MUST FIX BEFORE IMPLEMENTATION

"Byte-identical layout across runs" is not a property of ELK.js alone; it is a
property of *(graph, ELK version, option set, platform)*. A patch bump silently
breaks the snapshot gate, and the gate then gets relaxed.

Required: compute layout **server-side**, content-address the result, ship
coordinates to the browser, and include the pinned ELK version and option set in
the layout digest. This also removes layout cost from the render budget, which
is where the 10⁴-node concern actually lives.

### F-20 · The 10⁴-node target is the wrong acceptance criterion · SHOULD FIX

The design's own §7.3 makes 10⁴-node views unnecessary: four progressively
disclosed, server-side bounded projections mean no single view should approach
that. A 10⁴-node canvas is also unreadable by a human. Building for it is
scalability work that the architecture is specifically designed to avoid
needing.

Replace with: no projection exceeds its contract bound; every bounded projection
reports `{limit, total, dropped}`; the renderer sustains an interactive frame
budget at the **largest permitted projection** (1,000 nodes / 2,000 edges); and
search/filter, not zoom-out, is the path to a specific node in a large graph.

### F-21 · "Retain the existing backend contracts unchanged" is not accurate · SHOULD FIX

`§7.1` says keep the backend; `§7.4` requires `TRUNCATED` as a first-class
state, and `§7.3` adds four new level projections. Those are contract changes.

The correction is small but useful, because the plan under-credits what already
exists: **both graph contracts already carry truncation**.
`executionGraphAdapter.ts:127` and `sourceAdapter.ts:346` compute a `truncated`
boolean, and it is already in the DTOs and in the UI's own type definitions
(`ui/control-center/src/types.ts:201,291`) — **the UI simply ignores it**.

So the accurate statement is: the truncation pattern exists in two contracts and
should be *reused and extended* (notably to the source-summary contract, which
is where `routeOperationsTruncated` and the enumeration counters from X-02 must
surface), and the UI must render a field it already receives. `B-5` is
correspondingly cheaper than implied. Contracts should be **versioned and
extended**, not described as unchanged.

### Fact store — is it sufficient?

Yes, and a graph database is unnecessary; the plan is right. Two additions:

- The eight operator queries need indexed traversal. Name the index a
  **derived, content-addressed, rebuildable materialization** of the fact store,
  never a second source of truth. *SHOULD FIX.*
- Snapshot-diff-as-change-intelligence implies unbounded growth across 148
  repositories. Specify retention and compaction, and record store size in the
  System Coverage Ledger. *SHOULD FIX.*

### Evidence-state rendering

Thirteen categorical states as "the primary visual variable" exceeds
comfortable categorical colour perception. Encode on two channels — category on
shape/outline, proof state on fill — with a colourblind-safe palette, and never
rely on colour alone for `TRUNCATED` or `MUTATION_CAPABLE`. *OPTIONAL.*

`§7.6` (never an execution affordance) is correct and should be preserved
verbatim.

---

## 9. Coverage model

The design is right in intent — no aggregate percentage, `UNKNOWN` never folded
into a denominator, per-repository and per-language reporting. Four corrections.

### F-22 · The bucket list contradicts the rules · MUST FIX BEFORE IMPLEMENTATION

`§8.3` rule 1 names five buckets `{proven, unproven, unsupported, truncated,
unknown}`. Rule 4 of the same section requires `UNMEASURED`, which is not one of
them. And `STALE` — required by the objective, and central to the design's own
decay model (`§2`, `T-08`) — appears nowhere in the bucket vocabulary.

Required: `{proven, unproven, unsupported, truncated, stale, unknown,
unmeasured}` — seven buckets — with explicit definitions distinguishing:
`unsupported` (Nightwatch cannot analyse this kind of thing) from `unmeasured`
(nothing was attempted) from `unknown` (attempted, not settled) from `stale`
(was proven, evidence has decayed). The objective explicitly requires
"unsupported and unmeasured are distinct" and "STALE does not count as current
coverage"; five buckets cannot express that.

### F-23 · Coverage must be able to block but never to grant · MUST FIX BEFORE IMPLEMENTATION

The objective requires that coverage cannot become authorization, and the plan
never states the invariant. Note that `RG-19` ("`truncated > 0` blocks
promotion") *is* coverage influencing authority — in the safe direction.

State it precisely as an invariant: **a coverage ledger value may be read by a
gate only to deny; no gate may treat any ledger value as evidence permitting an
action.** That preserves `RG-19` while closing the door on "coverage is high
enough, proceed".

### F-24 · Mixed-scope denominators · SHOULD FIX

`§8.1` reports "routes/RPCs discovered: 128 of ≥ 885 known-declarable", where
885 spans repositories that are not in the universe. Mixing admitted and
non-admitted scope in one ratio is the same false-completeness class the plan
exists to eliminate. Report two denominators: within-universe and
within-discovered-universe.

### F-25 · Ledger figures must include the enumeration counters · MUST FIX BEFORE IMPLEMENTATION

Per X-02, the System Coverage Ledger needs per-repository
`{filesOnDisk, filesExamined, filesAdmitted, filesDropped, walkTruncated}`.
Without `filesDropped`, "repositories analyzed: 6" is exactly the kind of
misleading aggregate the ledger exists to prevent — `ouchan` is currently
counted as analyzed at ~⅓ enumeration.

`G-16` (stale duplicate figures) is correctly diagnosed and its fix — "make the
census the only writer of these figures" — is right.

---

## 10. Implementation sequencing

### F-26 · Missing campaign: concurrency and workspace isolation · MUST FIX BEFORE IMPLEMENTATION

See §11. Add **C-00** and place it first.

### F-27 · Ordering hazard: admitting new route sources before C-01 silently evicts the existing corpus · MUST FIX BEFORE IMPLEMENTATION

The plan states C-02 depends on C-01 "otherwise the new operations are
truncated away". The truth is worse and should be stated, because it changes
what C-01's acceptance must assert.

`MAX_DISCOVERED_OPERATIONS` is a **single global counter**, and `surfaces.ts:832`
sorts by `repoId` first. Alphabetically:

```
alphauslabs/blue-sdk-go < alphauslabs/blueapi < alphauslabs/grpc-chunk-parser
  < mobingilabs/ouchan < mobingilabs/ripple-api < mobingilabs/ripple-ui
```

`alphauslabs/blueapi` sorts **before** `mobingilabs/ripple-api`. Today blueapi
yields zero operations, so ripple-api takes the whole budget. The moment
blueapi yields anything — 147 via C-02, or 591 via C-02a (X-03), which is a
*one-line data change* — it consumes the entire 128-operation budget and
**ripple-api drops to zero operations**. That silently destroys all 6 admitted
expectations, all 3 Phase-24-eligible surfaces, all 5 runtime bindings and
every existing DEV capability, while every counter still reports a healthy 128.

Required: C-01's acceptance must include a **no-eviction assertion** — the set of
operation identities discovered before the change must be a subset of the set
discovered after — and that assertion must be a permanent regression test, not a
one-time check. This is cheap now and would be a confusing multi-day
investigation later.

### F-28 · Orphaned scope: `G-16` and EIG prioritization belong to no campaign · SHOULD FIX

The gap matrix has 16 rows and the programme has 15 campaigns. Mapping them:
`G-01→C-01`, `G-02→C-02`, `G-03→C-06`, `G-04→C-07`, `G-05→C-03`, `G-06→C-04`,
`G-07→C-05`, `G-08→C-08`, `G-09→C-09`, `G-10→"inside C-02/C-03"`, `G-11→C-10`,
`G-12→C-11…C-14`, `G-13→C-15`, `G-14→C-15`, `G-15→C-07`. **`G-16` has no
owner.** Separately, EIG prioritization (`design.md §9.2`) — which is the fix
for the orphaned change-intelligence layer (`A.10` item 4) — appears in no
campaign's scope. Assign both explicitly.

### F-29 · Internal inconsistency in the dependency graph · SHOULD FIX

Three statements disagree about C-05:

- the Mermaid graph draws `C05 --> C02`;
- C-02's Dependencies line says "C-01" only;
- §3 prose says "C-05 and C-10 have no upstream dependency and should run
  alongside C-01/C-02";
- the critical path omits C-05 entirely.

Under X-03/X-05, C-05 (admission-set expansion) is a genuine **predecessor** of
any reach beyond `blueapi/billing`. Resolve to one statement.

### F-30 · C-08 must acquire the `mochi` manifests or P2 cannot be authorized · MUST FIX BEFORE PRODUCTION

C-08's acceptance ("every operation carries a binding class; no `UNKNOWN` is
silently upgraded") permits every production-targeted operation to carry
`UNKNOWN` and still pass. Combined with `R-2` ("P2 must use the client-side host
matrix, which is weaker evidence"), production authority rests on an
`INFERENCE`, contradicting `I-3` (§1, item 2).

Two honest options, and the plan must pick one:

- **(a)** Add `C-08b` — an owner/organizational action obtaining read-only
  access to the `mochi` repository's
  `services/{env}/{appproxy,serviceproxy}/ingress.yaml`, settling `U-1` and
  `U-2`, and make a `DEPLOYMENT_FACT` route → endpoint binding a **hard gate**
  for every production-admitted route. This is cheap: it is a repository
  access request, not an infrastructure operation, and so does not touch the
  D-29 owner freeze.
- **(b)** Add an explicit twelfth gate that **refuses** any route whose
  endpoint binding is not `DEPLOYMENT_FACT`, accepting that P2 cannot start
  until (a) happens.

What is not acceptable is the current state, where the invariant says one thing
and the residual quietly says another.

### F-31 · C-03 is not on the production critical path; the PHP surface is · MUST FIX BEFORE IMPLEMENTATION

Follow the evidence. For a production-eligible proof you need one declaration
witness **and** one effect witness (F-03).

- **PHP surface (81 GETs)** — declaration witness from `Routing.yaml`; effect
  witness from a closure analyzer over a **fully enumerated** repository
  (X-02). Feasible, subject to F-01/F-04/F-06/F-07 reducing the count.
- **OpenAPI/proto surface (~185 GETs)** — declaration witness available
  immediately via C-02a; effect witness requires method-level RPC → Go handler
  binding **plus** a sound Go closure analyzer, which requires
  repository-complete `ouchan` enumeration, which requires raising a
  safety-boundary constant (X-02, F-05).

So the near-term production-eligible population is **PHP only**, and C-03 —
whose acceptance is *service*-level binding ("≥ 12 ouchan services bound to
≥ 12 proto services"), not the *method*-level binding `W-EFFECT_RPC` needs —
belongs on the **mapping** path (C-15) rather than the production critical path.

Required: either extend C-03's scope and acceptance to method-level binding
plus complete enumeration, or move it off the production critical path and say
plainly that production observation v1 targets `ripple-api` GET routes only.
The second is the honest and much cheaper option.

### Answers to the specific sequencing questions

- **Anything missing?** Yes: C-00 (concurrency, F-26), C-02a (OpenAPI
  admission, X-03), C-08b (`mochi` access, F-30), and owners for `G-16` and EIG
  (F-28).
- **Anything premature?** C-02's protobuf lexer is premature relative to C-02a.
  Nothing else.
- **Split?** C-02 → C-02a + C-02b. C-03 → service binding (mapping) + method
  binding (proof), if the Go proof path is pursued at all.
- **Merge?** No. The campaign boundaries are otherwise well drawn.
- **Dependencies wrong?** F-29 (C-05), F-30 (C-08), F-31 (C-03).
- **Should C-10 happen earlier?** It is already dependency-free and correctly
  placed before C-11. Keep it there and start it early: it is effort M with zero
  slack on the production path, and F-14/F-15/F-16 add work to it.
- **Should C-08 enter the critical path earlier?** Yes — F-30. It is a
  precondition for P2, and its blocking sub-task (`mochi` access) is an
  organizational request with a long lead time that should start immediately.
- **Should C-15 be delayed or advanced?** **Advanced.** C-15 is the operator's
  only view of whether reach is growing and whether anything is truncated.
  Given F-27 (silent eviction) and X-02 (invisible enumeration loss), shipping
  the truncation surfacing part of C-15 alongside C-01 is a safety measure, not
  a nicety. Split C-15: truncation/ledger surfacing early with C-01; the graph
  rebuild later.

### Revised critical path

```
C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 → C-12 → C-13 → C-14
                              ↑
                      C-08 + C-08b (mochi access — start immediately,
                                    long organizational lead time)
```

Parallel: C-05 (admission expansion, feeds C-02a) · C-04 · C-02b · C-03 ·
C-09 · C-15-truncation (with C-01) · C-15-graph (after C-03/C-04).

Off the production path: C-03, C-09, C-15-graph.

---

## 11. Concurrency and workspace isolation

The recorded incident — `skip-worktree` set on `docs/ROADMAP.md`, the planning
change directory added to `.git/info/exclude`, and the in-progress `audit.md`
**deleted** by a concurrent session — is correctly read as architectural
evidence. It should also be read as evidence about *evidence*: the artifact
under review was itself damaged mid-production by the hazard it is describing.

Verified current state (good): zero `skip-worktree`/`assume-unchanged` bits,
pristine `.git/info/exclude`, a single worktree, no non-sample hooks. The first
explorer's repair is complete.

**Recommendation: add `C-00 — concurrency and workspace hardening`, and place it
before any substantial parallel implementation. MUST FIX BEFORE
IMPLEMENTATION.**

Root cause: two agents shared one working tree and one index. Every
lock-and-cooperate scheme is weaker than removing the sharing.

### C-00 design

1. **One agent = one `git worktree` on a session-owned branch.** A worktree has
   its own `HEAD`, index and checkout, and shares only the object store, which
   is append-only and therefore safe under concurrency. This eliminates index
   races, checkout races and cross-session file deletion in one move, and it is
   built in.
2. **Worktrees do not fix everything, and this is the important detail.**
   `.git/info/exclude`, `skip-worktree`/`assume-unchanged` bits and hooks live
   in the shared common directory. Precisely the three things the incident
   involved are *not* isolated by worktrees. Therefore add a repository-hygiene
   invariant to `npm run agent:check`:
   - `git ls-files -v` reports no lowercase status letters (no
     `skip-worktree`, no `assume-unchanged`);
   - `.git/info/exclude` matches a committed expected-content digest;
   - `.git/hooks` contains only `*.sample`;
   - no unexpected worktree metadata.
   Fail the gate on drift. This is cheap, mechanical, and would have caught the
   incident at its first symptom.
3. **File ownership.** A session may delete only files it created in that
   session or files declared in its task `SPEC.md`. Add a gate check that every
   tracked-file deletion in a commit is declared. Explicitly prohibit
   `git clean -fd`, `git checkout -- <path>`, `git restore` and `git stash`
   across paths the session does not own. The `audit.md` deletion was exactly
   this class.
4. **Integration protocol.** Never rebase or amend another session's commits.
   Integrate with `git fetch` then `merge --ff-only` onto the session branch,
   then fast-forward `main`. On rejection, stop and reconcile — never
   force-push. This matches the existing `AGENTS.md` rule and extends it to
   branches.
5. **Leases are the fallback, not the mechanism.** A lock file is advisory and
   leaks when an agent dies. Prefer isolation (1) plus invariants (2) plus
   ownership (3). If a lease is used for the shared `main` fast-forward, it must
   be expiring and self-healing.
6. **Continuity implications.** `LAST_VALIDATED_IMPLEMENTATION_SHA` and the
   continuity-v2 state machine work unchanged under worktrees, since they record
   SHAs rather than checkout state. `LIVE_HEAD_AUTHORITY: GIT` becomes *more*
   correct, not less.

### F-32 · The audit's own baseline should be re-pinned · SHOULD FIX

`audit.md` measured from `784d553` while local `main` advanced to `54df439`
underneath it, and states the measurements were "re-confirmed against the
working tree". Working-tree re-confirmation is weaker than a pinned SHA, and the
census digests (`srcsnapshot:sha256:04ff5839…`,
`source-eligibility-census:sha256:2f97b732…`) are the baseline every campaign
will be measured against.

Re-run `campaign:eligibility-census` once at a pinned, clean SHA under C-00's
isolation and record the digests as the canonical pre-C-01 baseline. This costs
one read-only command and makes every later delta trustworthy. It does not
invalidate the audit: every figure this review independently re-measured
reproduced.

---

## 12. Threat model completeness

The existing 34 hazards are well-constructed — the
prevention/detection/containment/evidence/recovery/test schema is the right one,
and `T-01`…`T-34` contain no hazard this review would remove. `R-1`…`R-5` are
honestly stated.

Twelve hazards are missing. Full entries are added to
`docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md` under
"Second-review additions"; summarized here with the objective's
preventable / detectable / containable / recoverable / accepted classification.

| # | Hazard | Sev | Classification |
|---|---|---|---|
| T-35 | Middleware/framework pipeline effects outside the handler closure (F-01, **measured**) | C | **Preventable** — root the closure at the pipeline; fail closed if unresolvable |
| T-36 | Transitive production contact induced via the system under test (F-02) | H | **Detectable** in source, **not containable** by Nightwatch; partly **accepted residual** (R-6) |
| T-37 | Cross-repository callee in a read closure (F-01/F-07) | C | **Preventable** — unresolved callee ⇒ no proof |
| T-38 | Asynchronous/queued write from a read handler (F-07) | C | **Preventable** — effect-kind lattice |
| T-39 | Audit/access-log write on the read path (F-07) | M | **Accepted residual** by explicit owner policy per effect kind |
| T-40 | Production request-parameter provenance: customer identifiers required to construct reads (F-16) | H | **Preventable** — external opaque-handle model |
| T-41 | Key-name leakage through the "shape" allowlist (F-14) | C | **Preventable** — finite source-proven key sets only |
| T-42 | Structural-digest family collision with the salting rule (F-15) | H | **Preventable** — two named digest families |
| T-43 | Observer session side effects: session extension, single-session eviction of the human, token rotation invalidating saved storage state (§5) | H | **Detectable/recoverable** — terminate on 401/403, never retry |
| T-44 | WAF / bot-mitigation / SOC response: corporate egress IP ban, on-call alert noise (§6) | H | **Containable** — rate limits, observation window gate, prior notification |
| T-45 | Attribution and compliance: automated production reads under a human identity (§5) | H | **Preventable** — `ORG_ENFORCED_READ_ONLY`; otherwise **accepted residual** requiring written owner acceptance |
| T-46 | Minimization synthesizing an unproven request variant in production (F-16/§10) | C | **Preventable** — every minimized request re-satisfies G4/G5/G7 |
| T-47 | Numeric acceptance target pressuring proof weakening (F-08) | H | **Preventable** — remove the numeric gate |
| T-48 | Concurrent-agent workspace corruption destroying in-progress evidence (§11, **observed**) | M | **Preventable** — C-00 |

Residuals to add:

| # | Residual | Why it cannot be closed |
|---|---|---|
| R-6 | Induced downstream production load is unmeasured (T-36) | Requires visibility into the callee's own egress, which is outside Nightwatch and outside the owner scope |
| R-7 | Attribution under `ORDINARY_USER` (T-45) | Organizational; closed only by `ORG_ENFORCED_READ_ONLY` |
| R-8 | Browser profile bytes on disk during a session and after a crash (F-17) | Inherent to running a real browser; bounded by ephemeral paths and crash-path cleanup |

Note that `R-1` ("a production side effect invisible in source") has been
partially converted from a residual into a **preventable defect**: F-01 is a
side effect that *is* visible in source, and was missed only because the
analysis was rooted in the wrong place. `R-1` should be narrowed to effects
genuinely invisible in source — database triggers, downstream services' own
writes, infrastructure-level analytics — and should no longer absorb
middleware-level effects.

---

## 13. Recommended master-plan edits

Applied by this review (planning documents only):

| # | Document | Edit | Class |
|---|---|---|---|
| E-01 | `audit.md §A.8`, `§A.11`, `B-6` | Annotate: SSE **is** subscribed (`App.tsx:365`); retract `B-6` | SHOULD FIX |
| E-02 | `audit.md B-8` | Annotate: severity LOW → **HIGH**; `SOURCE_FILE_COUNT_EXCEEDED: 1` is a flag, not a count; ~2,000 `ouchan` files never enumerated | MUST FIX BEFORE IMPLEMENTATION |
| E-03 | `audit.md §A.11`, `B-7`, `§B.3`, `U-6` | Annotate: `parseOpenApiRoutes` is reachable; `openapiv2/apidocs.swagger.json` measured (591 ops, 1,179 definitions); `U-6` settled | MUST FIX BEFORE IMPLEMENTATION |
| E-04 | `audit.md §A.13` | Add the measured company-repo finding: production webhook URL with embedded token on the live GET path (`MarketplaceSubscriptionMiddleware.php:18,26,36`) — referenced, not reproduced | MUST FIX BEFORE IMPLEMENTATION |
| E-05 | `MASTER_PLAN §0` | Annotate the `≥ 900` and `≥ 200` targets as unreachable/coercive as scoped | MUST FIX BEFORE IMPLEMENTATION |
| E-06 | `MASTER_PLAN §2` | Add C-00, C-02a/C-02b split, C-08b; assign `G-16` and EIG | MUST FIX BEFORE IMPLEMENTATION |
| E-07 | `MASTER_PLAN §3` | Revised critical path (§10); resolve the C-05 inconsistency; advance C-15 truncation surfacing | **RESOLVED** — `MASTER_PLAN §3` now carries the revised critical path as authoritative, the `F-29` resolution (new ROOT inside an admitted repository → C-02a; new REPOSITORY → C-05), and C-15a shipped with C-01 |
| E-08 | `MASTER_PLAN §4` | `RG-13` becomes a hard requirement with a named owner exception; add `G-ORG`, the parameter-provenance gate, and the `DEPLOYMENT_FACT` binding gate | MUST FIX BEFORE PRODUCTION |
| E-09 | `THREAT_MODEL` | Add T-35…T-48 and R-6…R-8; narrow `R-1`; mark `T-13`'s flags as existing | MUST FIX BEFORE PRODUCTION |
| E-10 | `tasks.md` | Reflect C-00, C-02a/b, C-08b, revised acceptance criteria | MUST FIX BEFORE IMPLEMENTATION |

Recommended for the campaign that implements each item (not applied here,
because they are implementation-scope decisions):

| # | Change | Class |
|---|---|---|
| E-11 | `design.md §4.1` — root `W-EFFECT_CLOSURE` at the resolved middleware pipeline; disqualify any outbound call in the closure | MUST FIX BEFORE IMPLEMENTATION |
| E-12 | `design.md §4.2` — kind-diverse, effect-mandatory admission; bar `W-SPEC` from production | MUST FIX BEFORE IMPLEMENTATION |
| E-13 | `design.md §4.1` — replace binary write vocabulary with the effect-kind lattice | MUST FIX BEFORE IMPLEMENTATION |
| E-14 | `design.md §5.1` — production observation config external-only | MUST FIX BEFORE IMPLEMENTATION |
| E-15 | `design.md §5.3` — no inversion of `KNOWN_PRODUCTION_HOSTS`; separate allow structure | MUST FIX BEFORE IMPLEMENTATION |
| E-16 | `design.md §5.5` — precise P1 definition, L6 exemption, observation-scope admission chain | MUST FIX BEFORE PRODUCTION |
| E-17 | `design.md §5.6` — `ORG_ENFORCED_READ_ONLY` before P2 | MUST FIX BEFORE PRODUCTION |
| E-18 | `design.md §6.2/§6.4` — key-set rule; two digest families; parameter provenance | MUST FIX BEFORE PRODUCTION |
| E-19 | `design.md §7.2` — server-side content-addressed layout, pinned ELK version | MUST FIX BEFORE IMPLEMENTATION |
| E-20 | `design.md §8.3` — seven buckets; coverage-may-only-deny invariant | MUST FIX BEFORE IMPLEMENTATION |

---

## Appendix — measurement method

Every figure in §2 and §3 was produced read-only, without network,
authentication, database, cloud, IAM or Kubernetes access, and without modifying
any file outside this Nightwatch repository.

- Nightwatch source: direct file reads at working-tree `aacd63a`.
- `Routing.yaml` verb census: the parser's own anchored regex, applied with
  `sed`/`sort`/`uniq -c`.
- Proto census: `find … -name '*.proto' -not -path '*/vendor/*'` with
  `grep -cE '^[[:space:]]*rpc[[:space:]]+[A-Za-z_]'` and an anchored verb-key
  match; `google/` and `protoc-gen-openapiv2/` excluded, which accounts for the
  ±2 deltas against `audit.md`.
- OpenAPI artifact: `jq` over `paths`, `definitions` and `responses["200"].schema`.
- Repository file/byte sizing: `find … -printf '%s\n'` summed with `awk`.
- Git hygiene: `git ls-files -v`, `git worktree list`, direct reads of
  `.git/info/exclude` and `.git/hooks`.

No Nightwatch campaign, census or test command was executed by this review; the
first explorer's live census figures were accepted where this review had no
independent means to re-derive them, and are labelled as such.
