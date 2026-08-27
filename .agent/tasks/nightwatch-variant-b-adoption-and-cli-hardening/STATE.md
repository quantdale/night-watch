# Task State

## Identity

Task ID: nightwatch-variant-b-adoption-and-cli-hardening
Phase: VARIANT-B-ADOPTION-AND-CLI-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
Last validated implementation SHA: (pending)
Last substantive checkpoint SHA: (pending)
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
LAST_VALIDATED_IMPLEMENTATION_SHA: (filled at close)
LAST_SUBSTANTIVE_CHECKPOINT_SHA: (filled at close)
LIVE_HEAD_AUTHORITY: GIT
PHASE_VARIANT_B_ADOPTION_AND_CLI_HARDENING_V1_STATUS: IN_PROGRESS

## Objective

Adopt variant B (EXPAND_THEN_COLLAPSE) into the canonical catalog via the proven Phase 8B.1 mechanism, and fix the Control Center standalone CLI for Node 22 module resolution.

## Current Milestone

M1 — Fix Control Center CLI loader for Node 22.

## Completed Milestones

(none yet)

## Work In Progress

M1 — Fix Control Center CLI loader.

## Exact Next Action

Patch `bin/lib/typescript-runtime-loader.mjs` to add `Module._resolveFilename` override for `.ts` extension fallback.

## Files Changed

(planned — to be recorded)

## Validation Ledger

(planned — to be recorded)

## Safety Events

NONE.

## Resume Recipe

If interrupted, verify git status, run typecheck, continue M1 (loader fix) then M2 (promotion chain).