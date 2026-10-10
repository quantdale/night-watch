# Shard temp isolation v1 — Report

Status: COMPLETE

- Starting SHA: `f41c6cc3c9e9e6a50f271acbd58ddb19b5afd6aa`
- Status: COMPLETE — isolation repaired and fully focused/adversarial green; broad lanes retain only 12 independent live-source failures
- Problem: concurrent shard children shared the same OS temporary namespace,
  allowing unrelated files to perturb validation tests.
- Evidence: the original parallel gate produced 12 independent source-drift
  failures plus one `reviewStore.test.ts` failure; isolated replay passed.
- Changes: one external run root, private per-shard temp directories, explicit
  shared proxy lease directory, bounded cleanup, environment declaration, and
  process/lease/containment regressions.
- Validation: focused 56/56; hostile shared-temp replay 54/54; typecheck, bin
  typecheck, schema, hardening, and strict OpenSpec pass. Corrected `gate:dev`
  reports 5459 passed / only the 12 independent source-drift failures.
- Safety: NONE; system-temp validation scratch and loopback lease files only.
- Broad validation: corrected `gate:dev` and clean `gate:milestone` each report
  5459 passed / 12 failed; no isolation, lease, or environment failure remains.
- Reassessment: empty-sibling replay produced 129 passes / 11 failures across
  the affected source files, selecting live-source test hermeticity as the next
  child. Popup L0 remains deferred pending lower-level target admission.

## Closure record (2026-10-10, parent campaign M13 task 14.2)

The BLOCKED status recorded above was accurate when written and is preserved
verbatim; it is closed here against receipts rather than rewritten. The blocker
was the independently reproduced live-source drift residual (12 failures on the
certified baseline), never a defect in this child's own scope. The parent
campaign's M3 live-source hermeticity work (tasks 4.1/4.2) cleared it. This
successor has no NW-AUD original: it was selected by the successor-campaign
engine's own evidence-ranked backlog (`7bacfb68`), so no original-to-successor
reconciliation row applies; the engine-discovered provenance is recorded in
audit.md's M13 14.1 record.
