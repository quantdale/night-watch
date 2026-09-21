## Context

Coverage status is currently recomputed from fields whose truth is supplied by callers. A digest authenticates serialization, not execution. Candidate maps and lifecycle maps are often last-writer-wins, and graph nodes turn boolean bindings into available capabilities. The synthetic lifecycle path creates replay identity and a minimization probe from fixture metadata, so its output does not establish that the real evaluator replayed or minimized the finding.

## Goals / Non-Goals

**Goals:** exact input validation; producer-bound evidence; independent replay/minimization; total generation binding; no boolean promotion; deterministic recomputation.

**Non-Goals:** real-world probability claims, DEV acceptance, external execution, or removal of useful local synthetic coverage.

## Decisions

### Use typed producer receipts, not authority booleans

Every lifecycle edge consumes a validated receipt issued by the responsible producer and bound to candidate, source evidence, contract definition, fixture/scenario, observation generation, and producer version. Boolean summaries are derived outputs only.

### Rebuild inventories and graphs from validated members

Admission validates and recomputes every candidate identity/digest. Contract constructors derive definitions from canonical candidate evidence. Duplicate IDs, orphan bindings, inconsistent shapes, stale currentness, and mixed generations fail closed before graph or quality construction.

### Make replay and minimization independent

Replay re-executes the bounded semantic evaluator against retained synthetic observations. Minimization probes replay the candidate sequence and compare canonical finding/contract identity. Fixture flags and required-ordinal membership cannot substitute for execution.

### Missing evidence remains missing

Omitted lifecycle evidence yields false/unknown replay, minimization, and confidence facts. Campaign and quality reports cannot fall back to unverified mutation-row booleans.

## Risks / Trade-offs

Existing synthetic fixtures and tests that construct DTOs directly need producer harnesses. Coverage counts may decrease until actual evidence is generated.

## Migration Plan

1. Inventory every authority-bearing DTO and promotion edge.
2. Define exact producer receipts and validators with bounded generations.
3. Route discovery, contract construction, graph, campaign, mutation, lifecycle, and quality through verified records.
4. Implement independent replay/minimization probes and remove compatibility defaults.
5. Add adversarial tests and run semantic coverage, campaign-local, artifact, hardening, local/clean, and full gates.

## Open Questions

None. A digest of a claim is not evidence that its operation occurred.
