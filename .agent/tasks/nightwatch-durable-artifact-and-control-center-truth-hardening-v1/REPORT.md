# Durable Artifact + Control Center Truth Hardening — Execution Report

Status: IN_PROGRESS
Task ID: `nightwatch-durable-artifact-and-control-center-truth-hardening-v1`
Phase: DURABLE-ARTIFACT-AND-CONTROL-CENTER-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `42ea9723c10f60cc02c663748c493c6c34f73116`

This report is a live handoff. It will be completed only after the fresh
tracked-file audit, pre-fix reproductions, implementation, full local/clean
acceptance, safety/privacy review, and validated Git closure.

## Current evidence

- Requested fast-forward pull completed at the clean starting SHA above.
- M0 is complete. The task is active and no executable implementation change
  has been made.
- Safety scope is LOCAL / SOURCE / SYNTHETIC only.

### M0 baseline and exhaustive audit

- A NUL-safe `git ls-files -z` manifest reviewed all `1329` tracked paths;
  all `1329` were regular and reviewed. Total size was `14492957` bytes and
  newline count was `289822`. The ordered `path NUL fileSha256 NUL` manifest
  digest was `sha256:985856da8d5ab09f3ca752ee0857f3b5117854d297fe208fd56b5a32265cebc0`.
- All `11` paths changed from the OpenSpec planned-from SHA
  `49034831377f243054261361b4d1a7d783c0fc4f` through the live starting
  `HEAD` were re-reviewed. Subsystem dispositions covered the full manifest:
  agent continuity `434`, source `407`, tests/gates `283`, current
  runtime/source authority `165`, parser/currentness `94`, campaign/triage/
  portfolio/Phase-24 authority `77`, corpus/fixtures `113`, UI/control center
  `50`, config/workflow/metadata `32`, durable docs/history `45`,
  safety/product boundary `35`, and generated/lock metadata `1`.
- Baseline `npm run gate:local` passed at
  `d732cc51b96e3cfbb2d836508ca395bc9838b7a3`. All nine required groups passed:
  semantic compatibility `1888/1901` passed with `13` skips and `0` failures,
  owner provenance `91` passed, and synthetic campaign `66` passed. Agent
  check/audit, project truth, hardening, gate definition/inventory, and
  `git diff --check` also passed; only the documented historical warnings
  remain.

### M1 pre-fix red-team evidence

The focused producer-built mutation harness passed `3/3` tests before any
production behavior edit. Its machine-readable ledger is
[`BEFORE_PROBES.json`](./BEFORE_PROBES.json).

- v1: `40` independent mutations; the owning validator falsely accepted `38`
  and `validateArtifact('dossier')` falsely accepted `37`.
- v2: `50` independent mutations; both the owning validator and facade falsely
  accepted `43`. A producer-built `UNRESOLVED` v2 dossier remained accepted as
  a positive historical control.
- Confirmed false accepts included primitive/malformed scalar fields, invalid
  enums, missing or incomplete nested objects, non-array source candidates,
  malformed source-candidate entries, custom prototypes on v1, and incomplete
  v2 recipe/AI-ready/semantic-confidence shapes. Existing semantic validators,
  root unknown-field gates, sentinel gates, and v2 prototype/status gates
  already rejected their probes.
- The currentness table exercised raw adapter, findings authority, projected
  metadata, and normal collector paths for all required freshness multisets and
  order permutations. Before the fix, current+stale and current+unknown were
  `CURRENT` on every path; stale/unknown and empty cases were already
  conservative.

The captured interpretation is freshness-only: `relevance: UNKNOWN` and
`confidence: UNRESOLVED` remain causal-correlation dimensions and do not by
themselves rewrite the source checkout freshness category.

## Open evidence ledger

The mutation ledger, currentness truth table, facade-wide audit, validation
totals, identity decisions, regressions, performance receipts, and terminal
Git/Actions evidence will be added as each milestone completes. M2 is now
focused on implementing the reproduced strict runtime-validation defects.
