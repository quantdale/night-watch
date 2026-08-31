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

## Initial next action

Begin with M0 from the task PLAN/STATE and OpenSpec. Prove the current
three-journey -> fresh candidate -> reproduction reserve ->
BUDGET_EXHAUSTED-before-executor behavior in a local regression before making
any executable source change.
