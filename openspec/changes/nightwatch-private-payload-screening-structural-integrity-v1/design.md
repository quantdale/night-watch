## Context

containsPrivatePayloadShape combines token/sentinel regexes with a labeled-value regex. Callers commonly pass JSON.stringify(value). JSON quotes property names, but the labeled expression has no quote between its label and colon, so it misses the ordinary object form. The store accepts unknown, serializable values and relies on this screen before publication; readers apply the same screen to raw JSON/text.

## Goals / Non-Goals

**Goals:** schema-aware structural admission; bounded recursion; safe text defense; complete writer/reader ownership; categorical privacy failures; non-vacuous ordinary-value tests.

**Non-Goals:** detecting arbitrary unlabeled customer values by entropy heuristics, storing raw payloads encrypted, changing owner-scope policy, or implementing now.

## Decisions

### Structure is validated as structure

JSON/DTO inputs are checked before serialization. Each artifact family has a closed schema with exact keys, types, bounds, vocabularies, and provenance. Sensitive-key classes are rejected regardless of quoting, case, separators, nesting, aliases, or value shape. Unknown fields and non-plain/prototype-hostile objects fail.

### Safe DTOs cross the store boundary

Generic unknown values do not enter durable store APIs. A family-specific constructor produces a branded immutable safe DTO after validation. Store and reader boundaries independently validate the DTO/schema version; text scanning remains an additional tripwire, not admission authority.

### Text checks are bounded and canonicalized

Fields intentionally carrying bounded text are normalized across safe encodings before scanning for credential/token/sentinel/labeled forms. Limits apply before regex work to prevent resource abuse. Failures report only categorical codes, never matched content.

### Total consumer census

Hardening syntax-discovers every import/call of screening, private store write, findings reader, and run-evidence reader. Every call has an artifact profile. New, stale, duplicate, or bypass paths fail with a non-zero census receipt.

## Risks / Trade-offs

- Closed schemas require migrations for generic store users; generated registries keep the boundary explicit.
- Some owner-local artifacts may intentionally carry bounded prose; those fields need dedicated safe constructors rather than a global arbitrary-string exception.
- Historical artifacts that cannot prove schema/privacy remain unreadable until explicitly migrated offline.

## Migration Plan

1. Census writers/readers and define artifact schemas/safe DTOs.
2. Implement bounded recursive validation and defense-in-depth text scanning.
3. Migrate store APIs and readers; refuse legacy unknown shapes.
4. Add adversarial/mutation proof and update docs/receipts.

## Open Questions

None. Regex over serialized unknown data is not structural privacy proof.
