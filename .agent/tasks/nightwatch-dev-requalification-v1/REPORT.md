# DEV Requalification Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: d1b9f31880ee22605f47d6c459c40287c5c491c3
Last substantive checkpoint SHA: d1b9f31880ee22605f47d6c459c40287c5c491c3
Last documentation checkpoint SHA: 6a5a7914206ea1cfae0f1f9aa5f3434081afbb04

## Scope

This report covers only the new bounded real-DEV requalification successor.
The prior reliability campaign remains a completed historical record. This
task uses the existing guarded launchers and records every observation as a
sanitized independent outcome.

## Authentication boundary

Owner-managed DEV authentication was refreshed through the guarded headed
capture command. Post-login verification, structural state validation,
provenance recording, and cleanup passed. Credentials and state contents were
not printed or copied into the repository.

## Current result

Successor activation, OpenSpec validation, continuity, handoff, project truth,
hardening, and bounded DEV preflight all passed at `2e7e84f`. The first
guarded Phase 2C invocation produced two payer observations with valid auth
and zero safety violations, but the bounded settlement barrier timed out and
capture was incomplete. Replay classified the pair as
`FRAMEWORK_CAPTURE_DEFECT` / `SETTLEMENT_TIMEOUT`; the pre-fix runner had
misreported each observation as a product anomaly. The shared classifier fix
and local regression are validated at `dd5ff766`. The next invocation confirms
that attribution repair, but both payer observations still time out because
`activeJourneyRequests` counts unfinished page subresources and passive
unknown traffic. The narrower settlement-tracking repair is validated at
`247b27a`. A third independent invocation then settled the payer pair, but
one observation had an unavailable body for a source-reviewed known-read
JSON/XHR response. Strict replay preserved the failure as
`FRAMEWORK_CAPTURE_DEFECT` / `CAPTURE_INCOMPLETE`; this was tracked as
DVR-003. The response observer now bounds body reads to five seconds and
propagates only categorical capture diagnostics. A local truncated-response
regression and the focused 41-test cone pass at implementation checkpoint
`1d3eb0a`. The following independent DEV run then showed a second scope
defect: both intentional known-read JSON responses completed, but a passive
unknown JSON/XHR body timed out in one context and the global capture status
still failed the pair. That evidence is tracked as DVR-004; its local scope
repair is now checkpointed at `224801f`. The following run confirmed the
payer pair passed strict replay, then exposed a common-journey bootstrap 5xx
and missing-read divergence whose `CAPTURE_STATUS_UNKNOWN` label masked the
stronger failure. That attribution repair is checkpointed at `d1b9f31`; post-
fix DEV confirmation completed at `nightwatch-20260831T094029Z-e57a`.
Payer and common journeys each produced two valid-auth, zero-safety, settled
observations with complete intentional capture. Payer replay was `MATCH`;
common replay was bounded `BENIGN_TELEMETRY_VARIATION`; both had no strict
invariant mismatches. The account-inventory pair produced the same settled
product oracle failure in both contexts and replay classified its bounded
difference as `EXPECTED_PRODUCT_STATE_DRIFT`. The sanitized matrix is
`artifacts/phase2c-nightwatch-20260831T094029Z-e57a-matrix.json`.

The first guarded Phase 4 run at `nightwatch-20260831T095007Z-246e` passed its
pre-real safety gate. The first payer-exchange context passed its anchor and
completed one bounded `status-local.set` transition with
`SAFE_FRONTIER_EXHAUSTED`, settled observation, complete capture, and zero
safety counters. The fresh second context had valid auth, route/structural
markers, settled observation, complete capture, and zero safety counters, but
failed the required anchor on repeated critical bootstrap HTTP 502 responses
classified as `PRODUCT_BEHAVIOR_ANOMALY`; a separate image 502 was classified
as non-causal `DEV_INFRA_TRANSIENT`. The sanitized manifests are
`artifacts/nightwatch-20260831T095007Z-246e-E1-J1-payer-exchange-0/manifest.json`
and
`artifacts/nightwatch-20260831T095007Z-246e-E1-J1-payer-exchange-1/manifest.json`.
The launcher stopped before later seeds and exact replay, so the Phase 4
reliability rate is not yet certified.

The bounded confirmation at `nightwatch-20260831T095337Z-c375` passed both
payer contexts and both common-exchange contexts, each with valid auth,
complete capture, settled observation, and zero safety counters. It then
stopped at account inventory on the already observed `malformed-json` product
oracle, again with valid auth, complete capture, settled observation, and zero
safety counters. Exact replay was unavailable after the failed account
anchor; this is recorded as a bounded product-oracle outcome rather than an
all-seeds Phase 4 PASS.

The guarded Phase 5 API run at `nightwatch-20260831T095813Z-09be` passed all
six source-generated first executions and six fresh replays in 27.4 seconds.
Every attempt was DEV-verified with 2xx status, valid JSON or complete JSON
chunks, stable first/replay fingerprints, and `ORACLE_PASS`. The native
Nightwatch relay fallback reported zero safety counters and the privacy
ledger reported no persisted credentials, customer identifiers, raw bodies,
or response bodies forwarded to OOPS. Account-inventory and billing-groups
API operations passed here, narrowing the malformed-JSON evidence to the
browser account-inventory context observed in Phase 2C/Phase 4.

## Safety and verdict

The task remains read-only and serial. `OPERATIONALLY_ACCEPTED` is preserved
through explicit `PROJECT_VERDICT_EFFECT: PRESERVE` while the bounded sample
is collected. Any invalidating evidence will be recorded and handled through
the explicit project-state protocol.
