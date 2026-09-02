# Design — C-02b

## Layering

```
proto text ──▶ protoLexer.ts ──▶ tokens ──▶ protoDeclarations.ts ──▶ facts
                    │                                                  │
        (only module that knows                          ┌─────────────┴──────────────┐
         comment/string syntax)                          ▼                            ▼
                                              surfaces.parseProtoRoutes    protoCorroboration.ts
                                              (existing route path)        (per-operation compare)
```

Each arrow is a narrowing. Text becomes tokens, tokens become facts, facts
become either routes or corroboration outcomes. No later stage can reach back
past an earlier one, which is what makes "zero facts from comments" provable:
comments are discarded in the lexer and never enter the token stream, so no
declaration reader rule *can* see one.

## Bounding

Every ceiling is explicit and every exhaustion is categorical:

| Bound | Ceiling | On exhaustion |
|---|---|---|
| source bytes | `maxFileBytes` (existing, 2,000,000) | file body not admitted; content-read completeness records it |
| tokens | fixed `PROTO_MAX_TOKENS` | `PROTO_TOKEN_BUDGET_EXHAUSTED`, completeness ≠ COMPLETE |
| nesting depth | fixed `PROTO_MAX_DEPTH` | `PROTO_DEPTH_EXCEEDED`, enclosing declaration unproven |
| services / RPCs / bindings | fixed ceilings | recorded with an exact dropped count |

There is no unbounded `while`, no backtracking, and no regular expression run
over whole-file text as a parser. Regular expressions are used only to
validate an already-lexed identifier or literal against a safe character set.

## Fail-closed states

The declaration reader never defaults. Each fact is either proven or carries a
categorical reason:

- `httpBinding: PROVEN | ABSENT | MALFORMED | AMBIGUOUS | UNSUPPORTED_OPTION`
- `bodyPresence: PRESENT | ABSENT | WILDCARD | UNKNOWN`
- streaming is two independent booleans, both proven from the declaration's own
  `stream` modifiers; there is no "assume unary".
- multiple bindings on one RPC (`additional_bindings`) produce an ordered list
  and an `AMBIGUOUS` binding state; they are never collapsed to the first.

A `SOURCE_FACT` requires the RPC name, the request message and the response
message to all be proven. An HTTP binding is an additional, separable fact:
an RPC with an unparseable option is still a proven RPC with an unproven
binding, which is the honest decomposition.

## Durable evidence

The fact model carries: repoId, source SHA, source path, package, service
name, RPC name, canonical identity (`<package>.<Service>/<Rpc>`), request and
response message references, the two streaming booleans, binding state, method,
route template, body presence, extractor version, evidence digest, and
completeness state.

It carries no comment text and no arbitrary source text. Identifiers and route
templates are admitted only after passing a safe-character validation, which is
also what stops a route template from smuggling content.

## Corroboration

For each proven proto HTTP binding, the canonical identity is
`<Service>_<Rpc>` matched against the artifact's `operationId`, and
independently `(method, routeTemplate)` matched against the artifact's
`(verb, path)`. The pair of matches decides the outcome:

| operationId | method | path | outcome |
|---|---|---|---|
| matched | equal | equal | `MATCH` |
| matched | differs | equal | `METHOD_MISMATCH` |
| matched | equal | differs | `PATH_MISMATCH` |
| matched more than once | — | — | `AMBIGUOUS` |
| proto only | — | — | `PROTO_ONLY` |
| artifact only | — | — | `OPENAPI_ONLY` |
| binding not proven on either side | — | — | `UNCORROBORATABLE` |

Currency may leave `UNKNOWN` only when every operation on both sides is
`MATCH`. One `PATH_MISMATCH`, one `PROTO_ONLY`, one `OPENAPI_ONLY` — or one
`UNCORROBORATABLE` — keeps it non-`CURRENT`, regardless of totals agreeing.
This is the A-4 finding turned into a rule.

## What C-03 consumes

C-03 receives the canonical service identity `<package>.<Service>` and the
ordered RPC symbol set with streaming flags. That is a fact with a source SHA
and an evidence digest, not a name C-03 inferred. If this campaign cannot
produce it, C-03 is BLOCKED and says so.
