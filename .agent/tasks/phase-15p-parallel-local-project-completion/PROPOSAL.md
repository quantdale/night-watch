# PROPOSAL — Phase 15P Parallel Local Project Completion

Task ID: phase-15p-parallel-local-project-completion
Phase: 15P-PARALLEL-LOCAL-PROJECT-COMPLETION
Authorization class: PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Proposal

Replace the previously planned four sequential Phase-15 implementation
sessions with ONE coordinated parallel implementation campaign driven by a
parent integrator agent and up to 16 specialized sub-agents (A01–A16), each
working in an isolated local Git worktree on its own temporary branch,
delivering reviewed patches that only the parent integrates into canonical
main in dependency waves.

The four-session package
(`.agent/tasks/phase-15-four-session-local-project-completion/`) remains the
historical design input; this task supersedes only its EXECUTION SHAPE, not
its architectural or safety requirements. Sessions 1–2 are complete and
closed on main; the remaining Sessions 3–4 architectural backlog is absorbed
into assignments A10–A16 below.

## Desired end state

PHASE_15_PARALLEL_IMPLEMENTATION:
IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING — with a fully
populated HARDENING_HANDOFF.md and a machine-readable changed-file list from
the Phase-15P starting SHA to the final implementation SHA. This is NOT the
final whole-codebase hardening campaign and must never be reported as CI
verified, DEV accepted, production ready, fully hardened, Phase 11B complete,
or Phase 13B complete.

## Non-goals

No DEV/NEXT/production/real-campaign/data-plane/infrastructure/AI-authority/
selfDev-promotion authority; no Alphaus sibling writes; no publication; no
new endpoint/target authority; no catalog mutation; no variant-B adoption;
no Phase 11B; no Phase 13B. Integrated hardening stays separately owner-gated.
