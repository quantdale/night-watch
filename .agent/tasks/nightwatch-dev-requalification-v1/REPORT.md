# DEV Requalification Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: 247b27ae9e48279692359a29147a51cc7fa2bc2a
Last substantive checkpoint SHA: 247b27ae9e48279692359a29147a51cc7fa2bc2a
Last documentation checkpoint SHA: 247b27ae9e48279692359a29147a51cc7fa2bc2a

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
unknown traffic. A narrower settlement-tracking repair is now required before
more DEV observations.

## Safety and verdict

The task remains read-only and serial. `OPERATIONALLY_ACCEPTED` is preserved
through explicit `PROJECT_VERDICT_EFFECT: PRESERVE` while the bounded sample
is collected. Any invalidating evidence will be recorded and handled through
the explicit project-state protocol.
