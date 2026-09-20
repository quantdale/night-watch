## Context

`exactContexts` filters observations by journey/contract/fingerprint and uses unique `runId` values as its context count. `contextKind` is stored but ignored. Admission then maps two labels to L1 and three to L2. The replay comparator conditionally compares newer evidence channels only when both operands contain them, and incomplete fields can therefore vanish without disagreement.

## Goals / Non-Goals

**Goals:** mechanically proven context independence; ordered role/cardinality; exact generation binding; current evidence completeness; explicit historical compatibility; no label-based promotion; mutation-resistant producers and readers.

**Non-Goals:** change anomaly semantics, increase replay budgets, execute real replays, redesign browser containment, or migrate historical evidence in place.

## Decisions

### Mint context generations at the context authority boundary

The context factory mints a non-constructible generation handle only after atomic startup. Its safe durable attestation binds context generation, run/bundle generation, browser/runtime identity, proxy generation, selected environment/target, auth capability generation, source/contract identities, and creation ordinal. Callers can carry the attestation but cannot synthesize independence by changing a string.

### Define admission as an ordered proof sequence

For one exact anomaly identity:

1. `FIRST_OBSERVATION` establishes the baseline but no replay level.
2. L1 requires exactly one `FRESH_CONTEXT_REPLAY` whose attested context generation differs from the first and whose other bindings match.
3. L2 requires an additional `BOUNDED_REPETITION` in another distinct attested generation under the same frozen contract.

Duplicate roles, missing roles, repeated generations, inconsistent bindings, out-of-order observations, or extra unclassified observations do not increase admission. Run ID is a display key only.

### Require a complete comparison profile

A replay schema version declares its mandatory channels and comparator version. Current promotion requires both records to satisfy the same current profile: capture status, settlement status, semantic requests/evaluations, oracle observations, resources, safety and containment vectors, privacy, source/contract/context attestations, and declared bounded variance. Missing, unknown, overflowed, or incompatible fields return a non-match capture/schema defect.

Conditional comparison is permitted only for fields explicitly optional in the negotiated version; it is never inferred from simultaneous absence.

### Isolate historical compatibility

Legacy records can be parsed under named historical versions for display and historical reports. They cannot be relabeled current, supply context independence, or satisfy a current admission level. Conversion creates a new derived artifact with explicit incomplete/non-promotable provenance; it never invents missing evidence.

## Risks / Trade-offs

- Existing evidence may lose current promotion eligibility; that is intended because missing proof cannot be reconstructed.
- More bindings increase schema size; values remain categorical/digest identities and bounded.
- Context attestation depends on adjacent lifecycle/evidence generations; implementation sequencing must preserve fail-closed behavior until all are available.

## Migration Plan

1. Define context attestation and current replay/admission schemas with strict validators.
2. Update context factory and run producers to emit exact bindings.
3. Replace run-ID cardinality with ordered attested admission and complete comparison profiles.
4. Isolate historical readers and update campaign/manual consumers.
5. Add malformed/missing/relabel/reuse/mutation matrices and required local gates.

Rollback disables current promotion rather than falling back to label-based independence or optional-field matching.

## Open Questions

None. Historical records without an attested generation remain historical-only.
