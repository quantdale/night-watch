# PROPOSAL — Nightwatch Phase 15H — Whole-System Integrated Hardening

Task ID: `phase-15h-whole-system-integrated-hardening`
Phase: `15H-WHOLE-SYSTEM-INTEGRATED-HARDENING`
Required owner authorization: `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`
Publication state: DESIGNED_NOT_STARTED_NOT_AUTHORIZED

## Problem

Phase 15P intentionally performed a mass implementation-only convergence across the Nightwatch codebase. The final implementation checkpoint is `c2640cb08e7057eccab740942c3dc9991109ad1e`, with terminal continuity descendant `5da4917c2ee67b30f6a5e6d3453c6ddbcc1fd9e5`. The mass round explicitly did not run typecheck, tests, hardening, full regression, or CI-equivalent validation.

The implementation touched 105 files and introduced or changed contract lifecycle, replay/minimality, campaign lifecycle/checkpointing, readiness, artifact validation, project snapshots, privacy policy, adversarial corpus, semantic vocabulary, and compatibility surfaces. The mass handoff records several expected integration risks.

## Objective

Turn the unvalidated whole-system implementation into an evidence-backed local/source-validated release candidate by:

1. reconciling continuity truth;
2. compiling and repairing source integration fallout;
3. validating every new Phase-15P contract and version;
4. exercising the new adversarial corpus architecture;
5. running exhaustive historical Phase 1–15 local compatibility where available;
6. running canonical and topology-correct isolated complete regressions;
7. auditing privacy/authority and deleted/legacy surfaces;
8. producing exact CI truth without claiming green if Actions remains externally blocked.

Source fixes discovered during hardening are authorized inside Nightwatch. The phase is test-heavy, but hardening findings must be fixed rather than papered over.

## Permanent boundaries

No DEV/NEXT/production product execution; no real campaign; no database/data-plane; no cloud/infra/Phase 6 expansion; no Alphaus sibling writes; no AI/model authority; no selfDev promotion/catalog mutation; no new endpoint/target authority; Phase 11B and Phase 13B remain NOT_AUTHORIZED.
