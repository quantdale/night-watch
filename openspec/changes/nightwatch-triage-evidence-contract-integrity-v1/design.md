## Context

Validation and construction currently repeat related bounds. Plan v2 permits any non-negative integer ordinal; the identity token and envelope permit only 0..999,999. Minimality parsing rebuilds with empty survivor IDs and then overwrites the derived digest with an arbitrary non-empty input. Semantic replay validation checks enum membership but only a subset of cross-field implications.

## Goals / Non-Goals

**Goals:** representability before execution; exact current schemas; canonical identity recomposition; total coherence; safe historical migration.

**Non-Goals:** change minimization algorithms, replay real products, or rewrite historical bytes.

## Decisions

### Share identity domains

One exported contract owns maximum occurrences, ordinal range, action ID grammar, fingerprint/contract identity forms, and collection bounds. Every producer and parser consumes it.

### Validate evidence before effect

A validated replay value proves that plan identity, retained occurrences, and the eventual envelope are representable. Envelope construction after an executor call cannot fail for a pre-existing plan-shape defect.

### Recompose durable identities

Current minimality evidence includes sufficient bounded occurrence identity to recompute its digest. Parsers reject unknown/extra fields, wrong primitives, duplicates, unsorted collections, unknown enums, and digest mismatch.

### Make semantic coherence total

Each replay outcome has required and forbidden binding/currentness/safety/determinism/observed-identity/rejection fields. Current positive authority requires the current schema; historical permissiveness is isolated and cannot promote.

## Risks / Trade-offs

Some currently accepted malformed records become unreadable as current evidence. They remain classifiable as historical-invalid rather than silently repaired.

## Migration Plan

1. Add shared bounded primitives and exhaustive matrices.
2. Strengthen current plan/envelope/minimality/semantic schemas.
3. Add historical dispatch with non-promotable status.
4. Add property, mutation, and cross-layer representability tests.
5. Run local/clean/full validation.

## Open Questions

None. Execution evidence must be constructible before execution begins.
