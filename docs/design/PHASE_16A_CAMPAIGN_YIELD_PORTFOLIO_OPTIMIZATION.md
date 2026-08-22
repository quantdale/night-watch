# Phase 16A Architecture — Campaign Yield & Portfolio Optimization

## Position

Phase 15H locally verified the whole Nightwatch system. Phase 16A moves the optimization target from platform correctness to useful campaign selection under bounded read-only authority.

## Architecture

Existing hardened inputs feed a new pure local portfolio layer:

project snapshot + source movement/currentness + approved target registry + semantic coverage + historical sanitized campaign lifecycle evidence
-> portfolio members
-> explainable deterministic priority score
-> bounded budget allocator
-> versioned campaign-plan manifest
-> local shadow simulator / operator tooling
-> separately owner-authorized runtime handoff.

The planner never grants runtime authority. It only plans within the already-approved universe and must encode blockers explicitly.

## Identity

Member identity should derive from stable authorized target/journey identity plus normalized semantic/contract scope, not timestamps or raw source SHA alone. Source SHA remains provenance/currentness evidence.

## Scoring principles

Prefer mechanically justified value signals: relevant source movement, stronger semantic depth, under-covered surfaces, prior distinct-cluster yield, replayability, starvation age. Penalize duplicate pressure, invalid/transient history, execution cost, stale evidence. Owner/safety blockers are hard gates, not negative weights.

## Allocation principles

Budget allocation is a constrained deterministic selection problem, not a free-form heuristic. Caps/floors, total budget, reserved exploration share, retry bounds, and starvation logic must be explicit and auditable. No blocked member receives budget.

## Evidence truth

Synthetic/backtest metrics demonstrate planner properties only. They do not prove that a real DEV campaign will find more bugs. Real-yield proof requires a later separately authorized contained campaign.
