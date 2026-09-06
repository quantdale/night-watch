# Lane G SPEC — Autonomous Finding Dossier (nightwatch-autonomous-finding-dossier-v1)

## Goal
Build `AutonomousFindingDossier` (protocol `src/core/agentProtocol/finding.ts`, frozen)
from autonomous evidence, and project it onto the existing alphausHandoff shape
without modifying or weakening that cone.

## Inputs
An `AutonomousFindingDraft`: title, description, S1–S4 recommendedSeverity,
severity confidence + rationale, catch_stage, source, team (or UNKNOWN),
reproduction, expected, actual, evidence/screenshot refs, source locations,
affected APIs, environment, confidence, alternative hypotheses,
false-positive checks, reproduction count, related historical bugs,
violated invariant, provenance.

## Rules
- Authority MUST be exactly `AUTONOMOUS_FINDING_AUTHORITY` (same reference):
  humanReviewRequired true, externalPublication PROHIBITED,
  autoFile/autoLeslie/autoSlack false, NONE_LOCAL_REVIEW_ONLY.
- AI severity is a recommendation only; the handoff projection MUST NOT map
  S1–S4 onto organizational severity vocabulary (stays UNKNOWN + basis).
- Bogus findings without evidence fail closed (`AUTONOMOUS_FINDING_INVALID:*`).
- No Leslie / Slack / Pondr / ticket surface anywhere in the cone (grep-level).
- No import of `src/core/alphausHandoff/**` from `src` (hardening AH-1 bans
  non-test imports of that cone); projection is structural and proven
  assignable in `tests/**` (which may import both sides).
- No I/O, no clock, no network. Pure builder + pure projector.
