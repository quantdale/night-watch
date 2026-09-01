# SPEC.md

**Task:** nightwatch-php-readonly-proof-c06-v1
**Campaign:** C-06(PHP) — mechanically sound read-only proof
**Objective:** Replace the hand-catalog read-only authority for `ripple-api`
PHP routes with a mechanically derived, fail-closed two-witness proof rooted at
the route's fully resolved middleware pipeline plus handler, classified through
a versioned data-only effect-kind vocabulary, so that `PROVEN_READ_ONLY` is
earned by declaration evidence AND effect evidence and never by membership in
an eleven-row hand-authored catalog.

**Scope:**

- A versioned, digest-bound, data-only PHP effect-kind vocabulary with the
  eight explicit kinds `PURE_READ`, `DATA_WRITE`, `AUDIT_WRITE`, `CACHE_WRITE`,
  `SESSION_WRITE`, `MESSAGE_PUBLISH`, `EXTERNAL_CALL`, `UNCLASSIFIED`.
- A mechanical PHP route → middleware-pipeline resolver derived from
  `RouteProvidor.php` and the per-route `middleware` config in `Routing.yaml`.
  An unresolvable pipeline is `AMBIGUOUS` and fails closed; there is no
  handler-only fallback.
- A bounded PHP effect-closure analyzer over the resolved pipeline plus the
  handler, with explicit depth, breadth and budget bounds. Dynamic dispatch,
  unresolved callees, unclassified callees, and bound overflow all fail closed.
- Witness assembly and the kind-diverse, effect-mandatory admission lattice:
  `UNKNOWN`, `READ_ONLY_SINGLE_WITNESS`, `READ_ONLY_PROVEN`, `MUTATION_CAPABLE`.
  Every proof carries its route→handler join precondition, its repository
  inventory-completeness assertion, its vocabulary digest and its effect-kind
  ledger.
- Wiring the proof into surface discovery so `readOnlyClassification` and every
  downstream consumer read the proof rather than the catalog.
- A negative corpus with zero false positives and a positive corpus proving the
  analyzer is not trivially "everything UNKNOWN".
- A read-only measurement of the real `ripple-api` result, reported per
  repository and per effect kind.

**Non-goals:**

- No `W-EFFECT_RPC` Go/gRPC effect proof — that is C-03; it stays `UNKNOWN`.
- No `W-DECLARED_VERB` protobuf witness — that is C-02b.
- No `W-SPEC` admission path for production; C-09 owns spec-derived evidence.
- No privacy firewall (C-10), no deployment-fact binding (C-08/C-08b), no
  `PROD_OBSERVE` kernel (C-11), no production observation (C-12…C-14).
- No new repository admission (C-05); no numeric `READ_ONLY_PROVEN` target.
- No DEV, NEXT or production contact; no credential, datastore, cloud, IAM or
  Kubernetes access; no sibling-repository writes; no publication.

**Safety constraints:**

- Company repositories are READ-ONLY source inputs, reached only through the
  existing confined `SiblingSourceAccess` boundary.
- No source text, literal value, URL, token or customer value may enter a
  descriptor, proof, digest input, diagnostic or error message.
- The proof must be a pure function of the bounded source snapshot; the
  analyzer never executes application source.
- Fail-closed is the default in every branch: absence of evidence is `UNKNOWN`
  and `UNKNOWN` is never safe.
- Coverage and completeness may deny authority and may never grant it.
- The resulting `READ_ONLY_PROVEN` count is reported, never targeted. No
  mechanism that reduces the count may be weakened to raise it.
- All work happens in the owned C-00 session worktree; the canonical checkout
  is never used for implementation.

**Acceptance criteria:**

- Zero false positives on a negative corpus containing at least: the two
  historical D-79 admissions, a GET whose resolved closure reaches a write, a
  GET whose middleware performs an external call
  (`MarketplaceSubscriptionMiddleware`), an unclassified callee, a depth-bound
  overflow, a dynamic-dispatch callee, and an ambiguous join.
- Every callee identifier reached in an admitted closure is classified;
  `UNCLASSIFIED > 0` blocks promotion, and vocabulary classification coverage
  is measured and reported per repository.
- Every proof is kind-diverse and effect-mandatory: at least one declaration
  witness AND at least one effect witness. A GET declaration plus a
  specification sentence is not a production proof; `W-SPEC` is barred from
  production admission.
- Each proof carries its join precondition, its inventory-completeness
  assertion, its vocabulary digest and its per-kind effect ledger.
- The eleven-row `PHASE5_API_CATALOG` no longer grants any read-only
  classification.
- `SOURCE_FACT (GENERATED_ARTIFACT)` OpenAPI evidence cannot independently
  grant a read-only effect proof.
- A positive corpus proves the analyzer admits a genuinely provable route.
- The real `ripple-api` `READ_ONLY_PROVEN` count is measured and reported as an
  observation, per repository and per effect kind, with no numeric floor.
- Full validation stack green: typecheck, hardening, full regression,
  `gate:local`, clean Node 20 gate.

**Deliverables:**

- Implementation in the owned C-06 session worktree.
- `tests/unit/c06PhpReadOnlyProof.test.ts` with the negative and positive
  corpora.
- Truthful continuity-v2 SPEC / PLAN / STATE / REPORT.
- Updated durable docs and master-programme checklist truth.
- Validated commit integrated through C-00 tooling.

**## Declared Deletions:**

NONE
