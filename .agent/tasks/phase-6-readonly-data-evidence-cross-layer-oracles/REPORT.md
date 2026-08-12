# Nightwatch Phase 6 — Read-Only Data-Layer Evidence + Cross-Layer Oracles

Status: `IN_PROGRESS` — native task created after independently reconciling
Phase 5 COMPLETE. No Phase 6 implementation or datastore query has run.

## Phase 5 handoff

Phase 5 is complete at its own task boundary. Its source-generated API catalog,
restricted OOPS adapter, native relay fallback, six-operation first/replay
ledger, zero safety/privacy counts, historical malformed-JSON status, and
Alphaus integrity findings remain authoritative. Phase 6 will link to those
artifacts, not reinterpret them.

## Initial Phase 6 audit

The mandatory datastore documents were read in order: Investigation Router,
DB Schema Reference, Triage Query Playbook, and Read-Only Investigation Rules.
PIPELINE_MAP, Nightwatch safety/architecture docs, repository routing guidance,
and KB index were then consulted. The approved read-only wrappers are present,
but their capability checks are not sufficient for Nightwatch: Dynamo's wrapper
warns rather than blocks protected scans, and the BQ wrapper has no real
`--dry-run` mode. These facts are frozen as validator requirements.

The report will be expanded with source lineage, synthetic matrices, optional
real-query status, final safety/privacy accounting, and adversarial review at
closure. No Phase 7 work belongs here.
