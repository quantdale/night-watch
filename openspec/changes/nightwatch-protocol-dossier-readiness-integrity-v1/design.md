## Context

`createBugDossier` hard-codes READY. `triageAnomaly` writes the dossier whenever a store is supplied. The campaign then truthfully marks replay failure in the lifecycle but still pushes the dossier, writes a READY ledger entry, adds its candidate ID, and records readiness READY. Generic confidence receives `freshContextReproductions: 2` when browser and API failure booleans agree.

## Goals / Non-Goals

**Goals:** one derived readiness authority; no ready/promotion side effect after failed replay; explicit unresolved artifacts; context-independent confidence evidence; compatibility-safe parsing.

**Non-Goals:** remove v1 readers, change anomaly semantics, alter semantic v2, or run a campaign.

## Decisions

### Derive one protocol triage verdict before persistence

The pipeline derives `READY | UNRESOLVED` from fresh exact reproduction, admissible minimization state, clean safety/privacy, known-false-positive state, and declared critical gaps. Persistence, ledger state, bug-candidate insertion, promotion result, summary selection, and final campaign class all consume that value.

### Preserve failed attempts without promoting them

Failed or incomplete attempts may be retained as a separately versioned incomplete/unresolved record. They cannot use the READY v1 schema, appear in ready dossier collections, or make a campaign `COMPLETE_WITH_FINDINGS`.

### Count contexts from identities, not channels

Fresh-context confidence accepts distinct attested context-generation identities only. Browser/API agreement remains differential evidence and never increments a context count.

## Risks / Trade-offs

Historical v1 READY artifacts remain readable. New producers become stricter, and consumers must distinguish historical compatibility from current promotion authority.

## Migration Plan

1. Introduce the canonical protocol verdict and unresolved record.
2. Move persistence after verdict derivation.
3. Bind campaign ledger/promotion/summary paths to the verdict.
4. Replace inferred context counts with provenance-backed inputs.
5. Add negative matrices and full local validation.

## Open Questions

None. A failed fresh replay cannot produce a current READY finding.
