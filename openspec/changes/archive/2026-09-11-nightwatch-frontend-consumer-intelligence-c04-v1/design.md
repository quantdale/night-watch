# Design — C-04

## Layering

```
.vue file ──▶ vueSfc.ts ──▶ script text ──┐
                                          ├──▶ frontendConsumer.ts ──▶ edges
.js file ─────────────────────────────────┘         │
                                                     ▼
                                            frontendJoin.ts ──▶ joined edges
```

Vue SFCs are not JavaScript, so the script is lifted out before any JS rule
sees the file. Comment and string handling then belongs to the existing
`tokenizeStaticSource` lexer, exactly as it does for C-03's Go reader — a
call written inside a comment or a string is invisible to every rule here.

## Instance recognition

`axios.create({...})` assigned to an exported const declares an instance. Only
identifiers bound that way are treated as HTTP clients, which is what stops
`Cookies.get(...)` — 56 call sites — from being read as an HTTP GET. That
distinction is the difference between 211 real edges and 267 mostly-false ones.

## Bounded local resolution

The argument of `<instance>.<verb>(<arg>)` is resolved as follows, and no
further:

1. a string or template literal argument — resolved directly;
2. an identifier assigned a literal or template *earlier in the same function
   body* — resolved by scanning backwards to the enclosing function boundary;
3. anything else — `UNRESOLVED`.

Resolution never crosses a function boundary, never follows an import, and
never evaluates. Crossing functions is exactly the case the campaign prompt
names as `UNKNOWN`, and the bound is what keeps it there.

## Path classification

| Shape | Class | Strongest evidence |
|---|---|---|
| every chunk literal | `LITERAL` | `SOURCE_FACT` |
| interpolations each fill one whole segment | `STRUCTURAL` | `SOURCE_FACT` |
| interpolation inside a segment | `PARTIAL_SEGMENT` | `INFERENCE` |
| concatenation with a call/unknown | `DYNAMIC` | `UNKNOWN` |
| argument unresolved | `UNRESOLVED` | `UNKNOWN` |

`STRUCTURAL` is admitted as a fact because the segment *structure* is
mechanically known — `/v1/accounts/${id}` is `/v1/accounts/{}` whatever `id`
holds — which is precisely the condition the prompt sets. `PARTIAL_SEGMENT`
(`/v1/acc${suffix}`) is not, because the segment boundary itself depends on a
runtime value.

Query and hash are stripped before classification and never persisted.

## Method

Taken from the call verb only. There is no default: a call whose verb cannot
be read yields no method rather than `GET`.

## Join

Consumer route → backend route by canonical structural identity (placeholders
normalised on both sides), with states `PROVEN`, `AMBIGUOUS`, `MISSING`,
`DYNAMIC`, `METHOD_MISMATCH`, `STALE`. An edge's evidence class is the weaker
of the path class and the backend fact's class — never the stronger. There is
no upgrade path.
