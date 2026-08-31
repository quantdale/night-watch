# DEV Requalification Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: de169c96c9244f7693493942f4a8b7c5dd50e778
Last substantive checkpoint SHA: de169c96c9244f7693493942f4a8b7c5dd50e778
Last documentation checkpoint SHA: de169c96c9244f7693493942f4a8b7c5dd50e778

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

Campaign prepare then passed with five selected bounded read-only work items
under campaign `campaign:sha256:394f3fd1ed3828e2914a6373` and manifest
fingerprint `manifest:sha256:35a5e608ac1339f8ea6cf8f9`. Exact resume failed
closed after the first payer work item with
`CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CHECKPOINT_EXECUTION_FINGERPRINTS:DUPLICATE:fp:sha256:bba7c1fd5564ece993a0238f`.
The first observation contained two repeated anomaly occurrences with one
stable identity fingerprint. This is DVR-006, a High Nightwatch defect at the
execution-summary/checkpoint boundary: repeated occurrence evidence must be
preserved, but the summary identity list must be canonicalized before strict
checkpoint validation. The owner-local checkpoint remained `IN_PROGRESS` at
ordinal 2 with the first work item `RUNNING`, no completed work, and zero
safety/privacy counters. The repair at
`3cbe5f2f36dcaf4d94aa0a203649126aedb26be3` canonicalizes only the execution
summary fingerprint set, while preserving duplicate occurrence evidence. The
focused regression, full 30-test campaign suite, 30-test checkpoint/triage
cone, typecheck, and hardening pass. Exact resume of the original prepared
campaign was then refused before any executor callback because its frozen
source SHA was stale. The guarded result was
`PARTIAL_RUNTIME_INFRA_FAILURE` with `stopReason=CAMPAIGN_VERSION_DRIFT`, zero
work completed, and clean safety/privacy counters. The launcher/brief
previously mislabeled this expected refusal as `NIGHTWATCH INTERNAL DEFECT`;
the truthful classification repair is checkpointed at
`c1f5f529e830757cc2c3124aae46047bda863173` with a local regression. A fresh
current-source campaign is now required for the remaining real-system
campaign observation. This stale manifest is retained as evidence and will not
be reused; the next real campaign must be freshly prepared against the
current source checkpoint.

A second prepare-only attempt, `campaign:sha256:ceae02f22573c85f4a6d6c5e`,
passed its gate but exposed DVR-008 before resume: the implementation-source
fingerprint advanced to `af56ef1a83e61ef7f8ce7c59e0fd0c7b19dd022b` solely
because an OpenSpec task-document commit was the latest non-excluded Git
change. Executable Nightwatch source had not changed. The manifest was not
resumed and no product execution occurred. The source-identity pathspec must
be corrected and revalidated before the next real cycle.

DVR-008 is repaired at
`374ad71e0ebbaadecf17b1c9a767f36b6f054552`. The executable campaign-source
pathspec is centralized and excludes only the non-runtime continuity,
project-documentation, and OpenSpec trees; runtime source, tests, launcher,
and dependency changes remain identity inputs. A temporary-Git regression
proves an OpenSpec-only commit leaves the identity at the runtime commit and a
subsequent runtime change advances it. The full campaign suite passed 31/31,
with typecheck and hardening also passing. The `ceae...` manifest is stale by
this real implementation change and remains unresumed; a fresh current-source
campaign is required.

After the DVR-008 repair, the bounded DEV preflight and fresh prepare passed.
The new campaign is `campaign:sha256:6134013e41664bf66911887a` with manifest
`manifest:sha256:f5c596b14f1561864b7db7f4`, five bounded work items, and
`nightwatchSourceSha=374ad71e0ebbaadecf17b1c9a767f36b6f054552`. The
documentation checkpoint did not change executable-source identity. No
product execution occurred during preparation; only this manifest may be
resumed.

The fresh current-source campaign `campaign:sha256:4b8372d920d9694ca6c67c77`
then completed all five selected work items exactly once and passed the
launcher. Both selected API items completed their first-plus-fresh-replay
pairs. The account-inventory browser item retained one sanitized product
anomaly, `fp:sha256:d491c1b9779adfbcd030cc23`, matching the earlier Phase 4
browser evidence. The run stopped at `PARTIAL_BUDGET_EXHAUSTED` /
`BUDGET_EXHAUSTED` before reproduction, with one cluster, no dossier, zero
safety counters, and privacy `PASS`; this is a bounded result, not a clean
all-budget certification. One independent fresh cycle remains for
cross-campaign identity stability.

The independent fresh current-source campaign
`campaign:sha256:6134013e41664bf66911887a` then resumed successfully in 52.0
seconds as `PARTIAL_BUDGET_EXHAUSTED` / `BUDGET_EXHAUSTED`. All five selected
work items completed exactly once; both API items completed their first-plus-
fresh-replay pairs; payer/common browser journeys passed; and the account
journey retained one sanitized product anomaly. The checkpoint persisted one
anomaly observation, one cluster, zero dossiers, zero safety counters, and
privacy PASS; the reproduction reserve was blocked only by the bounded budget.
Its fingerprint `fp:sha256:d491c1b9779adfbcd030cc23`, cluster ID/key,
occurrence count, timing class, and work-item/replay ledger matched the first
fresh campaign exactly. This establishes stable finding identity across the
two bounded campaigns, not a product reproduction or all-budget certification.

The cache/property audit then closed a Low test-quality defect. The former
analyzer/taxonomy cases compared a synthetic expected digest rather than
performing a cache lookup under changed version inputs, and one property only
repeated identical input. The repaired key seam keeps authoritative runtime
defaults while allowing pure version-input testing; actual cache misses,
nested equivalent round-trips, bounded cycle diagnostics, and deep
non-mutation are now asserted. The 40-case cache/property/digest suite,
typecheck, hardening, and campaign suite passed at source checkpoint
`de169c96c9244f7693493942f4a8b7c5dd50e778`. This executable-source change
requires one fresh current-source DEV campaign before closure.

The focused reconciliation cone passed 292/292 with no skips or failures:
campaign/checkpoint/triage/replay compatibility passed 113/113, and continuity,
handoff, project-state, explicit verdict-effect, contradiction, status-parser,
and currentness coverage passed 179/179. No new Nightwatch Critical/High
defect was found in this cone; the remaining bounded limitation is that the
real campaign's reproduction reserve was exhausted before a dossier could be
admitted.

## Safety and verdict

The task remains read-only and serial. `OPERATIONALLY_ACCEPTED` is preserved
through explicit `PROJECT_VERDICT_EFFECT: PRESERVE` while the bounded sample
is collected. Any invalidating evidence will be recorded and handled through
the explicit project-state protocol.
