# nightwatch-system-atlas-v1 — PLAN

1. `model.ts`: provenance/record constructors, `COMMUNICATION_EVIDENCE`
   refusal, `INFERENCE`-links refusal, relabel gate, `validateSystemAtlasRecord`.
2. `overlay.ts`: `createSystemAtlasOverlay` (dup-conceptId refusal, frozen,
   deterministic order), `createAtlasQuery`, `querySystemAtlas`,
   `querySystemAtlasByKind`, `linkConceptToTechnicalNodes` (known-ids only,
   unproven ids dropped and counted, never stored).
3. `fixtures.ts`: synthetic billing-group / payer / invoicing-workflow /
   membership-dependency fixtures, all `synthetic.*`, all link-honest.
4. `tests/unit/systemAtlas.test.ts`: seven adversarial describes (systemMap
   untouched, kinds, upgrade refusal, link honesty, bounds, communication
   evidence unused, fixture provenance).
5. Typecheck + focused tests + `hardening:check` (read-only expectation) +
   `STATE.md`/`REPORT.md`, commit on session branch.
