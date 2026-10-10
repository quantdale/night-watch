## Context

The qualification validator currently accepts non-exact records and checks only that a gate-definition digest looks like a digest. Denial reasons are accepted from a global set rather than the set belonging to the named gate. A caller with exported sealing code can alter related fields and compute a new valid digest. P1 canonical configuration omits destination and expected implementation SHA, and its output lacks a strict deserialize/revalidate boundary.

## Goals / Non-Goals

**Goals:** exact current schemas; producer provenance; canonical recomposition; total gate/result coherence; complete P1 configuration identity; safe historical handling.

**Non-Goals:** treat a receipt as owner authorization, expose sensitive destinations, run qualification, or contact production.

## Decisions

### Distinguish tamper evidence from execution authority

Content digests remain deterministic integrity checks. Current authoritative receipts additionally require an opaque execution identity minted and registered by the qualification/rehearsal producer and tied to its input snapshot and terminal result. Public helpers may construct non-authoritative drafts but cannot confer current evidence status.

### Recompute all canonical identities

Validation recomputes the exact current chain definition, configuration identity, evidence digest, and terminal receipt digest from normalized fields. A well-shaped caller-supplied digest is never accepted by shape alone.

### Enforce a total gate matrix

Each gate has its own result and denial-code domain. Evaluation order is fixed; the first denial is terminal; all later gates are `NOT_EVALUATED`; successful prefixes have no denial; final qualification status and authorization lifecycle follow mechanically.

### Bind P1 without leaking destinations

The canonical P1 configuration identity includes a privacy-safe digest of the evidence destination plus expected implementation SHA and every other execution-affecting field. The receipt parser is exact-key, bounded, prototype-safe, and validates request/persistence/source/result coherence against the producer evidence.

### Isolate history

Historical receipts may be parsed by explicit legacy readers but remain non-authoritative and cannot be upgraded by resealing.

## Risks / Trade-offs

Existing receipts lacking producer evidence or omitted configuration fields become historical-only. That is an honest statement of their proof strength.

## Migration Plan

1. Freeze current acceptance gaps with adversarial fixtures.
2. Define exact current schemas and canonical identities.
3. Add producer execution capabilities and total gate/P1 coherence.
4. Route legacy receipts to non-authoritative historical classification.
5. Add property/mutation tests and run local/clean/full validation.

## Open Questions

None. A digest can detect byte changes but cannot prove who produced the underlying claim.
