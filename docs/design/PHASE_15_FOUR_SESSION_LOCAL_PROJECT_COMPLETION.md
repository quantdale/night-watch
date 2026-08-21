# Phase 15 — Four-Session Local Project Completion Architecture

## Intent

Phase 15 is a sequencing architecture, not a new product-environment authority. It converts the post-Phase-14 Nightwatch codebase into an implementation-complete local/source release candidate through four substantial sessions, followed later by one integrated hardening campaign.

## Why four sessions

The remaining work spans distinct dependency cones that should not be mixed into one unbounded agent run:

1. semantic/source contract platform;
2. campaign/replay/minimization/triage runtime;
3. local operator tooling and deterministic diagnostics;
4. cross-codebase convergence, cleanup, release-candidate rehearsal, and hardening manifest.

This ordering reduces churn: later sessions consume stabilized contracts from earlier sessions instead of repeatedly rewriting the same interfaces.

## Architectural end state after Session 4

Nightwatch should have:

- one explicit source/semantic contract lifecycle model;
- one explicit candidate lifecycle through campaign -> replay -> minimization -> triage -> dossier;
- deterministic local status/readiness/dry-run/validation tooling;
- a unified load-bearing version/schema registry;
- strict privacy-safe durable reason-code boundaries;
- a synthetic end-to-end project completion rehearsal;
- a complete dependency-cone manifest for final hardening.

Historical compatibility remains where proven necessary. Compatibility-only APIs should be labeled and blocked from new-code use where practical.

## What Session 4 does not prove

It does not prove:

- canonical full-regression green;
- topology-correct isolated full-regression green;
- every historical suite green;
- GitHub Actions green;
- DEV product behavior;
- real-campaign behavior;
- production behavior.

Those belong to the subsequent integrated hardening/acceptance work under separate owner authority.

## Safety

All four sessions remain Nightwatch-local/source-only. Alphaus siblings are read-only. Phase 6 stays frozen. Existing real-environment launchers remain gated and must not be invoked.
