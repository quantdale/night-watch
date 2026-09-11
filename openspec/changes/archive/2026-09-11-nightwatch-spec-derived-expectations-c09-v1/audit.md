# Audit — C-09

Read-only at `da369dad6c96472820790ffa4b69a773d2d26033`. No sibling repository
was written to and no runtime was contacted.

## The OpenSpec corpus

`openspec/` contains `changes/` and `config.yaml` only. No `openspec/specs/`
and no archive directory exist.

| Measure | Value |
|---|---|
| change directories | 32 |
| markdown files | 165 |
| `spec.md` files | 37 |
| `### Requirement:` headings | 190 |
| `#### Scenario:` headings | **332** |

The historical `~823` figure is refuted. It is preserved as a historical
estimate rather than reconciled away.

### Subject matter, which decides everything downstream

Sampled scenario headings: "Optimization is accepted", "an unresolvable
package qualifier", "Evidence invalidates acceptance", "Equivalent callers
migrate safely", "Different semantic contract does not merge", "Auth expires
during execution", "Contradictory live fields fail", "Unknown or stale
live-looking field is present".

Every one is a claim about NIGHTWATCH — its admission rules, its evidence
handling, its authority lifecycle. The corpus lives under
`openspec/changes/<nightwatch-campaign>/specs/`, i.e. it is the campaign record
of this tool. It contains no claim about an Alphaus product operation, so no
scenario can be bound to one.

Classification: all 332 `OUTSIDE_SCOPE`. Not dropped, and not force-fitted.

## The product specification corpus

The generated OpenAPI artifacts, both admitted (`blueapi/openapiv2` by C-02a,
`blueinternal/openapiv2` by C-05) and both classified
`SOURCE_FACT (GENERATED_ARTIFACT)`.

| | `blueapi` | `blueinternal` |
|---|---|---|
| swagger version | 2.0 | 2.0 |
| operations | 591 | 51 |
| definitions | 1,179 | 84 |
| operations whose response `$ref` resolves to a definition | **591** | **51** |
| typed response properties | 1,756 | 135 |
| enum definitions with a value set | 28 | 2 |
| nested `$ref` object properties | 523 | 11 |
| array-typed properties | 470 | 20 |
| `required` key entries | **0** | **0** |

Sample enum definition: `AwsOnboardingFeatureCheckAwsOnboardingFeatureStatus`
with five values (`..._UNSPECIFIED`, `..._AVAILABLE`, `..._WARNING`,
`..._MISSING`, `..._UNKNOWN`).

### Why `required` is zero

These are gRPC-gateway generated documents. Protobuf3 removed field
presence/required semantics, so the generator emits no `required` array. The
absence is a property of the generator and the IDL, not of this extraction, and
no required-key expectation will be claimed from it.

## The existing expectation machinery

Phase 9A.1 (D-55) established the only route from real Alphaus source to a
real-product semantic expectation: a versioned data-only recipe, a fixed
bounded syntax-aware extractor, a deterministic `ev:sha256:` source-evidence
digest, an approved read-only target, and an exact current source snapshot,
admitted through `deriveRealSourceExpectations`, failing closed on contract
drift. Phase 10A added item-level field type contracts and the `TYPE_IN_SET`
invariant.

C-09's classes are chosen to match what that vocabulary can already represent
rather than to require a new invariant kind.

## The read-only witness lattice

`src/core/source/readOnlyProof.ts`:

- `READ_ONLY_WITNESS_KINDS` = `W-DECLARED_VERB`, `W-DECLARED_ROUTE`,
  `W-EFFECT_CLOSURE`, `W-EFFECT_RPC`, `W-SPEC`
- classes: `DECLARATION`, `EFFECT`, `DOCUMENTARY`, with `W-SPEC` →
  `DOCUMENTARY`
- the admission rule is kind-diverse and effect-mandatory: at least one
  DECLARATION witness AND at least one EFFECT witness
- `W-SPEC` currently pushes `UNSUPPORTED` with reason
  `SPEC_EXPECTATION_ANALYZER_ABSENT`

So the §46 boundary is already structural: a `DOCUMENTARY` witness satisfies
neither required class, and W-SPEC alone therefore cannot reach
`READ_ONLY_PROVEN`. C-09 turns W-SPEC on and adds the test that proves this,
rather than adding a second guard that would duplicate the authority.
