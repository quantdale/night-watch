# Design — PHP Read-Only Proof (C-06)

## 1. Where the decision happens

Read-only classification moves from parse time to the post-join stage of
`discoverSourceSurfaces`. A parse-time descriptor has read no handler, no
middleware and no join, so it cannot carry a read-only property; it now
carries `UNSUPPORTED` until the proof stage replaces it.

The proof stage runs once per projected operation, after
`resolveSurfaceJoins`, and has exactly three inputs beyond the operation
itself: the join state, the analysed repository's enumeration completeness,
and the bounded source read view. It has no access to the operation catalog.

## 2. Effect kinds and their admission policy

Eight kinds, with one explicit owner-approved admission per kind
(`effectVocabulary.ts`):

| kind | admission |
|---|---|
| `PURE_READ` | `ADMISSIBLE` |
| `DATA_WRITE`, `AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`, `MESSAGE_PUBLISH`, `EXTERNAL_CALL` | `DISQUALIFYING` |
| `UNCLASSIFIED` | `FAIL_CLOSED` |

The distinction between `DISQUALIFYING` and `FAIL_CLOSED` is a distinction
between a decided fact and an absence of knowledge. Both deny.

Classification is by identifier, not by resolved receiver type, so an
identifier carries the MOST disqualifying kind among every declaration that
bears that name. The analyzer may over-approximate a route's effects; it may
never under-approximate them. An identifier the table does not name is
`UNCLASSIFIED` — never assumed to be a read — so deleting a write identifier
turns the closures that reach it `AMBIGUOUS`, never proven.

## 3. Pipeline resolution

`phpPipeline.ts` reads the route provider's attachment table and each route's
flags:

- `use A\B\C;` establishes a class alias; `$v = new C(...)` binds a variable;
  `$x->add(new C())` and `$x->add($v)` are attachments; an `if` whose
  condition contains exactly one string literal scopes the attachments in its
  block to that flag.
- An `add` whose argument does not resolve to a class makes the whole model
  `AMBIGUOUS`. An attachment inside a condition the parser does not model is
  treated as unconditional, which can only widen a pipeline and therefore
  cannot manufacture a proof.
- A flag the routing table declares but the provider never reads, and a flag
  the provider reads but the route never states, are both
  `PIPELINE_FLAG_UNKNOWN`. "Not mentioned" is not evidence of absence.

The provider is located structurally (`Route/Providor/RouteProvidor.php`), not
through a hand-maintained per-repository path. Zero or several matches leave
the model unresolved.

## 4. Bounded effect closure

`phpEffectClosure.ts` walks the resolved middleware entrypoints AND the
handler. Bounds: depth 6, declarations 96, callsites 4,096, files 32, tokens
400,000. Each is a distinct categorical refusal.

Recursion is confined to a declaration of the same name in the SAME file. The
D-79 defect was exactly a same-class `$this` binding that crossed a file
boundary, and it is structurally impossible here.

Terminal for the closure: a member access whose name is a value
(`$x->$name()`, `$x->{expr}()`), a variable function (`$fn()`), any
callback-taking library function, any magic-member declaration in a walked
file, and any include/require. Object construction is an unclassified callee,
not an assumed read.

Outcome precedence: an observed disqualifying kind ⇒ `EFFECTFUL` (decided);
otherwise any refusal ⇒ `AMBIGUOUS`; otherwise `PURE_READ_PROVEN`.

## 5. The admission lattice

`readOnlyProof.ts` assembles five witnesses over three classes. Only
`W-DECLARED_ROUTE` (declaration) and `W-EFFECT_CLOSURE` (effect) are
implemented by C-06; `W-DECLARED_VERB` (C-02b), `W-EFFECT_RPC` (C-03) and
`W-SPEC` (C-09) are `UNSUPPORTED` — an absence, never a pass.

Admission is kind-diverse and effect-mandatory: at least one DECLARATION
witness AND at least one EFFECT witness. Counting to two is not the criterion,
and a documentary witness can never carry an admission on its own.

Three named preconditions can only deny: the route → handler join must be
`PROVEN`, the analysed repository's enumeration must be `COMPLETE`, and the
pipeline must be `RESOLVED`. Decision order:

1. a refuted declaration or effect witness ⇒ `MUTATION_CAPABLE`;
2. both classes held, preconditions satisfied ⇒ `READ_ONLY_PROVEN`;
3. both classes held, a precondition unsatisfied ⇒ `AMBIGUOUS`;
4. any single held witness ⇒ `READ_ONLY_SINGLE_WITNESS` (DEV only);
5. otherwise `UNKNOWN`.

Every proof records its witnesses with categorical reason codes, its three
preconditions, the vocabulary digest it was decided under, the per-kind effect
ledger, the per-kind admission policy, the unclassified-callee count, and an
explicit production admission with sorted denial reasons.

## 6. Projection

`PROVEN_READ_ONLY` is reachable from `READ_ONLY_PROVEN` and from nowhere else.
A closure disqualified ONLY by an outbound call projects to
`CONDITIONAL_MUTATION` rather than `PROVEN_MUTATION_CAPABLE`: Nightwatch
proved the request leaves the analysable region, not that it writes. Both
values deny identically in every downstream consumer, so the distinction costs
no safety and avoids asserting a mutation that was never observed.

## 7. What C-06 does not do

No Go/gRPC effect witness, no protobuf declaration witness, no spec-derived
witness, no privacy firewall, no deployment-fact binding, no `PROD_OBSERVE`
authority, and no numeric target of any kind.
