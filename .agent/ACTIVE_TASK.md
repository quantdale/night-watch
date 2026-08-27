# Active Task

Task ID: nightwatch-variant-b-adoption-and-cli-hardening
Phase: VARIANT-B-ADOPTION-AND-CLI-HARDENING-V1
Title: Variant B Canonical Promotion + Control Center CLI Hardening
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-variant-b-adoption-and-cli-hardening
Starting SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
Last validated implementation SHA: (pending)
Last checkpoint: (pending)
Current milestone: M1 — Fix Control Center CLI loader for Node 22
Next action: Patch bin/lib/typescript-runtime-loader.mjs to add Module._resolveFilename override for .ts extension fallback
Authorization class: NIGHTWATCH_VARIANT_B_CANONICAL_PROMOTION_AND_CLI_HARDENING_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
LAST_VALIDATED_IMPLEMENTATION_SHA: (filled at close)
LAST_SUBSTANTIVE_CHECKPOINT_SHA: (filled at close)
LIVE_HEAD_AUTHORITY: GIT

## Routing and safety

This task is local/source/synthetic only, with one authorized canonical source write (variant B adoption) and zero runtime Git write authority. No DEV/NEXT/production contact, auth state, product mutation, data/infrastructure access, sibling-write, publication, or AI runtime. All Control Center testing uses loopback synthetic fixtures only.
