# Durable Artifact + Control Center Truth Hardening — Execution Report

Status: COMPLETE
Task ID: `nightwatch-durable-artifact-and-control-center-truth-hardening-v1`
Phase: DURABLE-ARTIFACT-AND-CONTROL-CENTER-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `42ea9723c10f60cc02c663748c493c6c34f73116`

This report is the terminal handoff. The fresh tracked-file audit, pre-fix
reproductions, implementation, full local/clean acceptance, safety/privacy
review, and validated Git closure are complete.

## Current evidence

- Requested fast-forward pull completed at the clean starting SHA above.
- M0 is complete. The fresh task is now terminal; the implementation and
  closure evidence are recorded below.
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

### M2 strict dossier validation

- Added one bounded runtime validator for v1/v2 dossier JSON and delegated
  semantic evidence to its existing owners. It checks complete scalar,
  collection, nested-record, prototype, exact-key, cross-field, safety,
  privacy, recipe, AI-ready, and source-candidate contracts without walking an
  arbitrary attacker-controlled graph or mutating input.
- The producer-built v1 `40/40` and v2 `50/50` mutation rows are now rejected
  by both the owning validators and `validateArtifact('dossier')`. The valid
  v2 `UNRESOLVED` control, v1/v2 producer corpus, and valid incomplete stub
  remain accepted.
- The facade semantic identity remains
  `nightwatch.artifact-validation.private.v1`. No source/test consumer uses it
  as a load-bearing cache, fingerprint, or currentness contract; dossier wire,
  source, semantic, replay, selector, and Phase-24 identities were not changed.

### M3 facade and currentness evidence

- [`FACADE_AUDIT.json`](./FACADE_AUDIT.json) records every static registry kind:
  `14/14` canonical fixtures were accepted, `55/55` bounded nested mutations
  were rejected, and `55/55` original fixture inputs remained unchanged. The
  reserved replay-result-envelope registration path rejected its malformed
  synthetic payload with `ARTIFACT_REPLAY_ENVELOPE_INVALID`.
- The all-kind audit reproduced one adjacent project-health contract gap: the
  current readiness producer emits additive `analyzer`, `verification`, and
  `externalCiClassification` sections that the old validator did not admit,
  and the old validator did not tie per-target currentness back to aggregate
  counts/lists. The validator now checks these sections compatibly and the
  focused audit proves both positive acceptance and negative mutation behavior.
- The callsite audit covered `validateArtifact('dossier')`,
  `validateDossierArtifact`, `validateBugDossier`, and `parseBugDossierV2` in
  the findings reader, AI review, triage pipeline, campaign readback, phase-13
  shadow compatibility, and facade dispatch. Campaign casts are immediately
  preceded by a runtime parse/validation; no shallow unknown-to-trusted
  consumer or facade-version consumer was found.
- Findings currentness is now owned by
  `src/controlCenter/authorities/findingsCurrentness.ts`. The adapter uses the
  same reducer only for its retained direct raw-dossier compatibility seam and
  otherwise projects authority metadata. The meaning is freshness-only;
  correlation relevance and confidence remain separate facts.

### Currentness before/after

The pre-fix focused probe recorded `CURRENT` for both current+stale and
current+unknown on raw, authority, projected, and collector paths. After the
repair, the expanded matrix covered `18` order/permutation cases, a duplicate
candidate case, and the `256`-member bound:

| Required freshness facts | Public result |
| --- | --- |
| non-empty, all current-class (`SOURCE_CURRENT_LOCALLY` / `REMOTE_FRESHNESS_CONFIRMED`) | `CURRENT` |
| any `LOCAL_TRACKING_REF_ONLY`, no unknown | `SOURCE_STALE` |
| any `UNKNOWN`, malformed freshness, or empty | `SOURCE_UNAVAILABLE` |

All raw, authority, projected, and normal collector outputs matched this
table. Changing the source currentness changed the findings generation digest.

### M4 Control Center integration evidence

- A mixed owner-local directory containing valid v1/v2 dossiers, malformed JSON,
  and a parseable malformed dossier remains explicit `UNKNOWN`; only valid
  sanitized rows survive and no file path, source text, raw evidence, or
  validator detail is projected.
- The collector now rejects a malformed authority snapshot currentness value
  to an explicit `UNAVAILABLE` findings response instead of accepting an
  `AVAILABLE` snapshot. Existing partial-corruption handling remains explicit.
- Existing snapshot-coordinator tests prove that failed refreshes serve only
  the caller's unavailable fallback, preserve the previous generation only as
  diagnostic `lastKnownGoodGeneration`, and never mark that old generation
  `CURRENT`. Existing server tests retain GET/HEAD, loopback, exact Host/Origin,
  body rejection, bounded static assets, and notification-only SSE proofs.

Focused validation after these changes:

- `durableArtifactTruthHardening.test.ts`: `7 passed / 0 failed`.
- `phase15pArtifactValidation.test.ts`: `25 passed / 0 failed`, including the
  55-row facade audit.
- Control Center adapters, findings authority, contracts, authority
  integration, server, and snapshot coordinator: `21 passed / 0 failed`.
- `phase15pPrivacyAuthority.test.ts`: `23 passed / 0 failed`; prior triage and
  semantic compatibility slice: `55 passed / 0 failed`.
- `npm run typecheck`: PASS; `npm run hardening:check`: PASS; `git diff
  --check`: PASS.

The focused implementation and integration evidence is complete; the final
acceptance and terminal closure are recorded below.

### UI/browser qualification

- `npm run control-center:ui:typecheck`: PASS.
- `npm run control-center:ui:test`: `2 test files / 11 tests passed`.
- `npm run control-center:ui:build`: PASS; the verifier accepted `3` built
  files totaling `259566` bytes with no external references or embedded
  content.
- `npm run control-center:ui:browser`: PASS, `1/1` built-server browser test.
  The synthetic authority composition visibly rendered `Source Stale` and
  `Source Unavailable` labels while exercising all seven views, with zero
  page/console errors and zero non-loopback requests.
- A separate bounded agent-browser smoke against the local loopback launcher
  reached the Findings view and was closed without credentials, storage state,
  or external navigation.

### M5 full acceptance and terminal closure

- The first exact serial command at `c3d69039d4f2a9969118d877b432c6b4a2f5d09c`
  exposed one observer semantic-ledger timing failure and one telemetry retry
  classified flaky. The observer test passed in a `--repeat-each=5` narrow
  reproduction, so no assertion was weakened.
- The required rerun of the exact native command
  `npm test -- --project=nightwatch --workers=1` passed `2548` of `2564`
  discovered tests, skipped `16`, and failed `0` in `6.4m`. The observer and
  telemetry tests passed without retries.
- Full `npm run gate:local` passed all `9` groups at the implementation/test
  checkpoint. Semantic compatibility was `1903 total / 1890 passed / 13
  skipped / 0 failed`; owner provenance was `91`; synthetic campaign was
  `66`; receipt `receipt:sha256:008de731687cf9671286ecea`.
- `npm run gate:clean` passed in a fresh Node20 checkout with no reuse, auth,
  owner finding state, or sibling writes. All `9` groups passed; semantic
  compatibility was `1903 / 1890 / 13 / 0`; gate receipt
  `receipt:sha256:60a27b3b75965259bc684a56`; clean receipt
  `clean-receipt:sha256:8e6a911a40c6383f722c965c`.
- Final focused and project checks remain green: typecheck, hardening,
  project/continuity checks, gate definition/inventory, privacy, UI/build/
  browser, and `git diff --check`. External CI was not required by current
  policy, was not observed, and is not claimed green.

## Terminal disposition

`COMPLETE_LOCAL_NOT_CI_VERIFIED`. The strict durable artifact boundary rejects
all reproduced v1/v2 malformed dossier mutations, the Control Center uses one
conservative currentness reducer, and the bounded facade audit covers all
registered kinds. No new runtime, DEV, data, infrastructure, publication,
authentication, sibling-write, or AI authority was introduced. The terminal
next action is STOP; any successor requires a fresh census and authorization.
