# EXECUTION PROMPT — Replay Budget and Dossier Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-replay-budget-and-dossier-closure-v1
OpenSpec: openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/
Planned-From: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Target Branch: main
Predecessor Task ID: nightwatch-dev-soak-replay-yield-v1
Predecessor Status: COMPLETE

## Mission

Repair the specific bounded Phase 7 budget starvation proven by the completed
DEV soak: fresh DVR-011-admitted product candidates were created, but all four
reproduction queues stopped before replay executor entry because the three
required collection journeys had already consumed journeyContexts=3/3.

First reproduce that boundary deterministically. Then implement the smallest
safe replay-reservation model that preserves finite total execution authority,
checkpoint correctness, source currentness, privacy, containment, and strict
candidate admission. Finally confirm the new budget on a fresh guarded DEV
campaign and, when a fresh candidate naturally appears, carry it through
attack replay and—if reproduced—bounded minimization and sanitized dossier
generation.

Do not simply raise limits. Do not replay historical candidates. Do not weaken
DVR-011.

## Current next action
Run final continuity, project, privacy, local, and clean gates for the
freshly closed starved confirmation; update terminal records, then push and
verify clean `main`/`origin/main` parity. Do not start another campaign,
retry authentication, use alternate credentials, or reuse historical
candidates.

## Fresh DEV confirmation result
The owner completed one guarded headed auth capture for the designated DEV
state. Post-login verification, atomic state/provenance writes, validation,
and cleanup passed; secret values and storage-state contents were not printed
or copied.

The fresh current-source campaign
`campaign:sha256:37aca1e950ab804e3a6fd592` prepared and resumed successfully
against implementation source
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`. It completed all five selected
read-only work items with `COMPLETE_CLEAN`, zero safety counters, and privacy
`PASS`.

The campaign observed two protocol-only anomaly candidates and two clusters,
but both were rejected before candidate replay because
`REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`. The reproduction queue and persisted
candidate replay-reservation ledger were empty; no attack replay,
minimization, dossier, or product finding is claimed. The two source-bound API
work items each completed their ordinary first-plus-fresh replay pair, which
used two of the campaign's aggregate replay units and is distinct from
candidate attack replay.
