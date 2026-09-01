# REPORT.md — C-06(PHP) mechanically sound read-only proof

Status: COMPLETE

Every figure below was measured; none was targeted.

Starting SHA: `93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57`
Validated implementation SHA: `7ce2cf91a00f1916ea1e04790dc395a809ef8727`

## What changed and why

Read-only authority for `mobingilabs/ripple-api` was an eleven-row
hand-authored operation catalog consulted at parse time, before any handler,
middleware or join had been read. D-79 had already reproduced two
false-positive admissions from that surface, and the independent review's F-01
measured a deeper defect: Ripple attaches its middleware per route group, so
the pipeline sits outside every handler closure, and
`MarketplaceSubscriptionMiddleware.__invoke` carries no HTTP-method guard and
performs an outbound call on every request. A handler-rooted proof therefore
declares such a route read-only while the request leaves the analysable
region on every invocation.

Four data-only modules and one wiring change replace that:

- `src/core/source/effectVocabulary.ts` — eight effect kinds
  (`PURE_READ`, `DATA_WRITE`, `AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`,
  `MESSAGE_PUBLISH`, `EXTERNAL_CALL`, `UNCLASSIFIED`), one explicit
  owner-approved admission per kind, identifier tables seeded from the
  measured `ripple-api` DAO/cache/mail/notification/outbound-HTTP wrapper
  declarations, the dynamic-dispatch and control-construct lists, the analyzer
  bounds and a deterministic vocabulary digest. Classification is by
  identifier, so an identifier carries the most disqualifying kind among every
  declaration bearing that name: the analyzer may over-approximate effects,
  never under-approximate them.
- `src/core/source/phpPipeline.ts` — mechanical route → middleware pipeline
  resolution from the route provider's attachment table and each route's
  routing flags. An unresolved attachment, an unknown flag or an unstated flag
  is terminal. There is no handler-only fallback.
- `src/core/source/phpEffectClosure.ts` — the bounded walk over the resolved
  pipeline entrypoints PLUS the handler, with depth 6, 96 declarations, 4,096
  callsites, 32 files and 400,000 tokens, each its own categorical refusal.
  Recursion never crosses a file boundary — that is the D-79 defect made
  structurally impossible.
- `src/core/source/readOnlyProof.ts` — the kind-diverse, effect-mandatory
  lattice. `READ_ONLY_PROVEN` requires ≥ 1 declaration witness AND ≥ 1 effect
  witness; the join, inventory-completeness and pipeline preconditions can
  only deny.
- `src/core/source/surfaces.ts` — classification moved from parse time to the
  post-join proof stage; the surface descriptor advanced `v4 → v5` to carry
  the proof; counters read the proven operations.

## Measured result

| figure | before | after |
|---|---|---|
| operations projected | 814 | 814 |
| operations truncated | 0 | 0 |
| `READ_ONLY_PROVEN` | **5** | **0** |
| mutation-capable | 548 | 549 |

`mobingilabs/ripple-api` (223 operations): 222 `MUTATION_CAPABLE`, 1
`UNKNOWN`. Classifications: 143 `PROVEN_MUTATION_CAPABLE`, 79
`CONDITIONAL_MUTATION`, 1 `UNSUPPORTED`. First disqualifying kind: 79
`EXTERNAL_CALL`, 72 `DATA_WRITE`, 71 `CACHE_WRITE`. Effect-ledger occurrences:
`PURE_READ` 7,506; `UNCLASSIFIED` 15,232; `DATA_WRITE` 272; `EXTERNAL_CALL`
230; `CACHE_WRITE` 150. 6,114 distinct unclassified callee identities were
reached, every one of which denies its proof with
`CALLEE_CLASSIFICATION_INCOMPLETE`.

`alphauslabs/blueapi` (591 operations): 406 `MUTATION_CAPABLE`, 185
`READ_ONLY_SINGLE_WITNESS`. No effect analyzer exists for a generated Swagger
document, so all 591 report `EFFECT_CLOSURE_ANALYZER_ABSENT` and all 591 are
`DENIED`. C-02a's generated-artifact route evidence grants no effect proof.

Source facts behind the counterexample: `Routing.yaml:488-491` sets
`x-header: true` by default; exactly one of 118 routes (`get:/version` at
`:505-513`) overrides it, and that route is declared in the class form so it
resolves no handler join; `RouteProvidor.php:73-76` attaches the subscription
middleware under that flag; `MarketplaceSubscriptionMiddleware.php:26` has no
method guard and `:100-119` performs the outbound call. The endpoint constant
is referenced by file and line and is not reproduced anywhere in Nightwatch.

## Acceptance criteria

| criterion | evidence |
|---|---|
| zero false positives on the eight-case negative corpus | `tests/unit/c06PhpReadOnlyProof.test.ts` N1…N8 plus the whole-corpus case; 38/38 green |
| both D-79 admissions refused, catalog grants nothing | N1/N2: both rows asserted `KNOWN_READ`, both routes not `PROVEN_READ_ONLY`, `readOnlyProvenOperations === 0`, runtime binding still `RUNTIME_BOUND_EXACT` |
| middleware external call disqualifies a pure handler | N4: identical handler is `PROVEN_READ_ONLY` with the flag off and `CONDITIONAL_MUTATION` with it on |
| `UNCLASSIFIED > 0` blocks promotion; coverage measured | N5 and the 6,114-identity measurement; `CALLEE_CLASSIFICATION_INCOMPLETE` |
| kind-diverse, effect-mandatory; `W-SPEC` barred | lattice tests: one declaration witness alone is `READ_ONLY_SINGLE_WITNESS`; a documentary-only witness set can never admit |
| join / inventory / vocabulary carried on every proof | lattice tests over four join states and two completeness states; digest asserted equal to `phpEffectVocabularyDigest()` |
| generated OpenAPI evidence cannot grant an effect proof | dedicated lattice test plus the 591-operation measurement |
| positive corpus proves non-triviality | P1 admitted; admission revoked by one added `deleteHashData` |
| count reported, never gated | no test asserts a floor; the figure appears only in `audit.md`, `STATE.md`, `DECISIONS.md` D-107 |

## Validation

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- `npm run handoff:check` — PASS.
- `tests/unit/c06PhpReadOnlyProof.test.ts` — 38/38.
- Full canonical regression — 2,809 tests. One fixture failure
  (`phase25SyntheticCampaign`) was a legitimate consequence: the synthetic
  repository declared no route provider, so its GET route was no longer
  provable. It was repaired by giving the fixture the pipeline the new proof
  requires, through the shared `tests/helpers/phpPipelineFixture.ts`. No
  validator was weakened.
- `npm run gate:local` at `7ce2cf91a00f1916ea1e04790dc395a809ef8727` — PASS,
  all eleven required groups.
- `npm run gate:clean` at the same SHA — Node 20 clean checkout, install PASS,
  gate PASS, all eleven groups.

## Defects discovered

- The route provider's `x-header` default means **every** `ripple-api` route
  except `get:/version` carries the outbound-call middleware, and
  `get:/version` is declared in the class form and so resolves no handler
  join. There is consequently no `ripple-api` route that is both free of the
  outbound call and joinable. This is stronger than the review's F-01
  prediction and is recorded in `audit.md` §A.2.
- Callee-classification coverage over `ripple-api` is far from complete
  (6,114 unclassified identities). This is reported rather than closed:
  closing it is vocabulary work, and enlarging the vocabulary to raise the
  proven count is exactly the pressure F-08 warned against.

## Authority

C-06 grants no new product or runtime authority; it removes one. No DEV, NEXT
or production contact, credential inspection, datastore, cloud/IAM/Kubernetes
access, sibling-repository write, or publication was authorized or performed.
Sibling Alphaus repositories were read only, through the existing confined
`SiblingSourceAccess` boundary, and are unmodified.

## Deferred

- `W-EFFECT_RPC` (C-03), `W-DECLARED_VERB` (C-02b) and `W-SPEC` (C-09) remain
  unimplemented and report `UNSUPPORTED`. 100 % callee classification for a Go
  repository is therefore not attainable inside C-06 and belongs to C-03.
- Vocabulary expansion for `ripple-api`'s application-level helpers is
  deliberately not attempted here.
- An unanalysable closure projects to `READ_ONLY_METHOD_ONLY`, the same
  surface value as "no analyzer ran". The distinguishing reason code lives on
  the proof; a future surface-vocabulary revision could expose it directly.

## Safety events

None.
