# PLAN — Phase 16C Portfolio Runtime Binding & Real Approved Universe

Task ID: `phase-16c-portfolio-runtime-binding-real-universe`
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY`

## Purpose

Remove the exact blocker proven by Phase 16B without contacting DEV: build a real-approved-universe portfolio and safely bind the hardened portfolio handoff into the one existing Phase-7 prepare/resume runtime.

## Milestones

### M0 — Bootstrap / source truth
Status: NOT_STARTED
- clean fetch/ff main;
- record authorization;
- read Phase 16A/16H/16B terminal evidence;
- reproduce the Phase-16B blocker against current source;
- freeze starting SHA.

### M1 — Real approved universe
Status: NOT_STARTED
- inventory current runtime-capable approved read-only identities from canonical registries;
- implement deterministic real-universe builder;
- explicitly separate fixture/demo universe;
- prove every real member maps to an existing runtime identity.

### M2 — Admission contract
Status: NOT_STARTED
- strict handoff + plan + universe + authorization admission;
- categorical fail-closed reasons;
- handoff remains executable:false;
- no plan mutation.

### M3 — Budget mapping + work-item binding
Status: NOT_STARTED
- versioned monotone-restrictive mapping into current campaign budget dimensions;
- unambiguous selected-member -> runtime-work-item binding;
- prove no expansion beyond existing fixed Phase-7 profile.

### M4 — Prepare integration
Status: NOT_STARTED
- integrate admission/binding into existing prepare-only flow;
- freeze portfolio/binding/budget fingerprints in campaign state;
- no executor/browser/network activity.

### M5 — Resume integration + launcher
Status: NOT_STARTED
- require runtime authorization again on resume;
- fail closed on portfolio/binding/budget/version mismatch before executor;
- add one minimal explicit opt-in launcher input path;
- preserve legacy launcher behavior.

### M6 — Local synthetic seam rehearsal
Status: NOT_STARTED
- complete local end-to-end plan->handoff->admission->prepare->checkpoint->resume->synthetic-executor path;
- adversarial blocker matrix;
- >=3 deterministic repeats;
- all Phase-16C quality floors zero.

### M7 — Compatibility / moderate pack
Status: NOT_STARTED
- typecheck, hardening;
- Phase-16C focused suites;
- affected Phase 7/12/13/15/16 compatibility;
- campaign:synthetic;
- owner-provenance if touched;
- continuity/project/diff checks;
- static proof of single executor path.

### M8 — Source checkpoint / closure
Status: NOT_STARTED
- commit validated local implementation;
- push ff;
- inspect Actions once if source checkpoint triggers it, never retry-loop billing block;
- complete STATE/REPORT/RUNTIME_BINDING_HANDOFF;
- route ACTIVE_TASK to NONE at terminal.

## Testing scope

This is focused implementation + moderate validation. Full canonical and topology-isolated repository regressions are intentionally deferred to the next hardening campaign unless required to diagnose a discovered broad regression.

## Successor ordering

Do not retry DEV immediately from this task. After Phase 16C implementation closes, run a dedicated Phase 16CH hardening task over the binding seam. Only after that may a separately authorized Phase 16D contained DEV acceptance retry consume the hardened seam.
