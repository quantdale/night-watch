# Active Task

Task ID: phase-6-readonly-data-evidence-cross-layer-oracles
Phase: 6
Title: Read-Only Data-Layer Evidence + Cross-Layer Oracles
Status: BLOCKED
Task directory: .agent/tasks/phase-6-readonly-data-evidence-cross-layer-oracles
Starting SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Current SHA: 6de063325f2afc1bafc14ce4889c6d53d2e76bed
Last validated implementation SHA: 6de063325f2afc1bafc14ce4889c6d53d2e76bed
Current milestone: M7 — pre-real data gate BLOCKED by unresolved runtime-to-
datastore environment mapping.
Last checkpoint: 9a2db449a4d1bdc93f86dcce8f95d4a29cacdb73 — deployment/source re-audit checkpoint; local Phase 6 architecture, synthetic matrix,
privacy review, and full validation completed; no datastore query has run.
Next action: obtain authoritative `mochi` deployment/config proof of the
selected DEV `ripple-api-micro` runtime's effective datastore environment and
designated Nightwatch scope before any auth probe or read-only query. The DEV
cluster is now confirmed, but checked-in service configuration does not carry
the effective AWS/API environment values. Do not guess or bypass the gate.

## Prior phase closure handoff

Phase 2A remains closed at implementation `a6d7c8b`, closure checkpoint
`9bf2c459`, terminal clean HEAD `ec4c143`. Phase 2B remains closed at
implementation `78e5d1f`, completion checkpoint `1b6e7a5`, terminal clean HEAD
`1760e594`. Phase 2C remains closed at validated implementation `efc03de`,
checkpoint `0f894d9`, terminal clean documentation HEAD `427f1029`. Phase 3
is independently reconciled at implementation `8d72ec9`, checkpoint
`058a1ab`, terminal clean HEAD `acdb4a2`; its source freshness remains
`LOCAL_TRACKING_REF_ONLY`. The three Phase 2B/2C journeys remain the only
anchors.
