# Session 4 — Codebase Convergence & Implementation-Complete Release Candidate

Authorization required: PHASE_15_S4_IMPLEMENTATION_CLOSURE_LOCAL_ONLY
Precondition: Sessions 1-3 terminal markers and handoffs are present on live main.

## Objective

Converge the accumulated Phase 15 implementation into one coherent local/source release-candidate state and prepare the exact dependency cone for the future integrated hardening campaign. This is implementation closure, not final hardening.

## Required implementation work

A. Dependency and boundary audit with source fixes
- Audit imports and public APIs across source-contract, semantic, campaign, replay, minimization, triage, dossier, local tooling, continuity, and project-state modules.
- Fix circular/illegal dependencies, duplicated canonical constants, obsolete compatibility shims, unsafe cross-layer imports, and ambiguous public entry points.
- Preserve historical compatibility where still used.

B. Version/schema registry completion
- Produce one deterministic registry of load-bearing schema/version constants and ownership/module boundaries.
- Add tests preventing duplicate version strings owned by unrelated modules, missing campaign fingerprint bindings, or unregistered new durable schema versions.

C. Dead/legacy path cleanup
- Identify code proven unreachable/superseded after Sessions 1-3 and remove it only when caller search + focused tests establish no compatibility need.
- Otherwise label compatibility-only and block new-code imports mechanically where practical.
- Do not delete historical evidence/docs.

D. Error/reason-code convergence
- Inventory durable reason/error codes across the changed cone.
- Normalize duplicates where semantics are identical; preserve distinct codes where meaning differs.
- Add a typed registry or validator preventing accidental raw exception/message leakage into durable safe artifacts.

E. Privacy and authority-by-construction improvements
- Ensure new local DTOs/CLIs cannot persist raw bodies, credentials, customer values, auth state, DOM, screenshots, or arbitrary source text.
- Strengthen pure-core import guards for the changed cone.
- Add focused adversarial tests for secret-like values and forbidden capability imports.

F. Project completion rehearsal
- Build a synthetic-only end-to-end release-candidate rehearsal spanning source contract resolution -> project snapshot/readiness -> campaign planning -> synthetic execution -> semantic/protocol candidate lifecycle -> replay/minimization -> clustering/confidence -> dossier -> morning brief/status -> artifact validation.
- Include resume/version drift and stale-source variants.
- Run >=3 deterministic repeats, zero mismatches, zero privacy/safety floors.

G. Documentation and continuity convergence
- Update architecture/current-state/roadmap/decisions to distinguish implementation-complete from hardening-complete.
- Close obsolete WIP wording from Sessions 1-3.
- Create a complete final dependency-cone manifest in HARDENING_HANDOFF.md.
- Do not claim project COMPLETE, DEV accepted, or CI verified.

H. Hardening campaign manifest
- Enumerate every source/test/corpus/bin/config/workflow/doc path changed across all four sessions.
- Enumerate required full regressions, compatibility matrices, adversarial matrices, topology-correct isolated run, continuity audit, project/catalog checks, CI verification, and any fresh-source canaries needed later.
- The hardening campaign must be runnable from this manifest without rediscovering the four sessions.

## Testing cadence

Focused cleanup/registry/privacy/rehearsal tests plus one moderate cross-session integration pack. Run typecheck, hardening:check, campaign:synthetic, owner-provenance only if directly touched, agent:check, project:check, diff-check.

DO NOT run the final complete canonical Playwright, isolated complete Playwright, exhaustive historical compatibility, or full repository hardening. Those are the next separately authorized campaign.

## Required terminal state

PHASE_15_S4_IMPLEMENTATION_CLOSURE: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING
PHASE_15_INTEGRATED_HARDENING: REQUIRED_SEPARATE_OWNER_AUTHORIZATION
PHASE_13B_STATUS: NOT_AUTHORIZED
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP

Final Git state must be clean and HEAD == origin/main. HARDENING_HANDOFF.md must be complete enough for a fresh hardening session.