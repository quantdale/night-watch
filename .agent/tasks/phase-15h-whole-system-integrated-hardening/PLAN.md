# PLAN — Nightwatch Phase 15H — Whole-System Integrated Hardening

Task ID: `phase-15h-whole-system-integrated-hardening`
Authorization at execution: GRANTED — owner token `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY` (session directive 2026-08-22)

## Purpose

Turn the unvalidated whole-system Phase-15P mass implementation into an evidence-backed local/source-validated release candidate: compile first, treat every failure as hardening evidence, repair source without weakening architecture, prove historical all-phase compatibility, and produce exact CI truth.

## Starting State

Phase 15P mass implementation ended at source SHA `c2640cb08e7057eccab740942c3dc9991109ad1e` with terminal continuity descendant `5da4917c2ee67b30f6a5e6d3453c6ddbcc1fd9e5`. The mass round was intentionally unvalidated. Bootstrap HEAD after clean fetch/fast-forward: `7695b87c61890cabfe110e3d147a076c1b1ecea1`. The handoff records 105 changed files / 17 implementation commits from strategy-shift base `abc9bf9...`, with known risks treated as hypotheses until reproduced.

## Scope

All gates in SPEC.md H0–H10 and ACCEPTANCE_MATRIX.md A–M: continuity reconciliation, compiler recovery, static safety, A01–A16 contract matrices, risk-specific regressions, executable adversarial corpus with quality floors, all-phase 1–15 compatibility, campaign/provenance packs, canonical + topology-correct isolated complete Playwright, continuity/project/catalog integrity, validated checkpoint push with exact Actions inspection.

## Non-Goals

No DEV/NEXT/production product execution; no real campaign; no database/data-plane; no cloud/infra/Phase 6 expansion; no Alphaus sibling writes; no AI/model authority; no selfDev promotion/catalog mutation; no new endpoint/target authority; Phase 11B and Phase 13B remain NOT_AUTHORIZED. No new architectural breadth beyond hardening repairs.

## Safety Constraints

Fail-closed owner policy and read-only safety model preserved; no assertion relaxation, no new skips hiding failures, no blind snapshot regeneration, no deleting tests because A15 removed code; workflow changes must not weaken authority or remove meaningful gates.

## Architecture / Approach

Repair-and-proof campaign following SPEC §3 discipline per failure: narrow reproducer -> root cause -> Nightwatch source fix -> permanent regression -> narrow recheck -> broader gate. Parent is the sole integrator; any delegated lanes are read-only review/test lanes compared against parent findings. One canonical source of truth preferred over compatibility forks; historical readers retained only where serialized compatibility requires them.

## Milestones

### M0 — Bootstrap and truth reconciliation
Status: COMPLETE
- fetch/fast-forward clean main; record authorization; transition IN_PROGRESS/active; read Phase-15P handoff/state/ledgers; reconcile stale `IMPLEMENTED_FOCUSED_GREEN` labels; freeze starting head + changed-file manifest.

### M1 — Compiler recovery
Status: COMPLETE
- typecheck first (26 errors recorded); classify by lane/family; fix without weakening architecture; add regression coverage for semantic fixes.

### M2 — Static safety and authority hardening
Status: COMPLETE
- hardening:check PASS; owner-policy/pre-executor ordering, private-screening convergence, DTO/raw-value review, pure-core boundaries, frozen Phase-6 quarantine via existing suites.

### M3 — Phase-15P focused contract hardening
Status: COMPLETE
- A01–A16 focused suites green (367 passed / 0 failed after repairing 30 initial failures); handoff risks closed where reproduced (DEF ledger).

### M4 — Executable adversarial corpus
Status: COMPLETE
- all scenario classes bound to deterministic builders/executors or blocker assertions; >=3 repeats via matrix determinism x3 + rehearsal x3; all floors zero.

### M5 — All-phase compatibility
Status: COMPLETE
- complete unit sweep workers=1: 1955 passed / 0 failed / 4 skipped across phase families 1–15.

### M6 — Campaign/provenance packs
Status: IN_PROGRESS
- campaign:synthetic; test:owner-provenance; replay/minimality/checkpoint/resume matrices already covered by green unit sweep.

### M7 — Complete canonical regression
Status: NOT_STARTED
- complete Playwright workers=1 on canonical topology; zero failed required; raw counts recorded.

### M8 — Topology-correct isolated regression
Status: NOT_STARTED
- isolated clone (`nightwatch-isolated-15h`) fast-forwarded to the hardened checkpoint; deterministic install; same complete command with distinct proxy port; zero failed required.

### M9 — Continuity/project/catalog closure
Status: IN_PROGRESS
- agent:check strict conformance repairs underway; agent:audit; project:check; catalog integrity; git diff --check; cleanliness.

### M10 — Validated checkpoint and CI truth
Status: NOT_STARTED
- commit source-bearing hardening checkpoint; post-commit decisive local recheck; push fast-forward once ALL local gates green; inspect exact Actions run/job/steps once; terminalize BLOCKED_EXTERNAL_CI if the external billing block persists.

### M11 — Durable closure
Status: NOT_STARTED
- final REPORT with all-phase matrix, defect ledger, counts, SHAs, CI truth; docs updates from earned evidence only; docs closure push; STOP.

## Validation Strategy

Every PASS maps to a command executed in this session against the mass anchor or the relevant fix. Raw integer counts recorded in STATE Validation Ledger and REPORT. Historical pre-mass greens are background only. Quality floors must be zero; skips inventoried; canonical/isolated count differences evidenced by topology.

## Decision Log

- D-15H-1: DEF-06 fixed in the writer; validator kept strict.
- D-15H-2: stale pins updated only with proven deliberate mechanical growth.
- D-15H-3: lifecycle oracles extended to full 21-edge truth incl. GATE_BLOCK reason requirement.

## Discoveries

- A09 interrupted-work bookkeeping was broken for every multi-checkpoint run (stale carryover via state spread); single-checkpoint pre-integration runs masked it.
- A15 de-export sweep had one false negative (ReasonCode); EdgeMatch verified caller-free.
- NIGHTWATCH_PROXY_PORT overridable for isolated topology runs.

## Deferred Work

- Handoff risk 1 (same-named `validateUnifiedContractResultDto` exports): public-surface rename deferred to a dedicated compat task.
- Repository-wide adversarial fuzz beyond the corpus matrix; exhaustive static audit outside the touched cone: remain future hardening scope if separately authorized.

## Completion Criteria

Terminal states per SPEC §8:
- COMPLETE + VERIFIED_LOCAL_AND_CI only if an actual Actions run executes steps successfully;
- BLOCKED_EXTERNAL_CI + VERIFIED_LOCAL_NOT_CI_VERIFIED when every local/source gate is green but Actions still cannot execute (external billing/spending condition), recorded once without retry loops;
- BLOCKED + HARDENING_INCOMPLETE with the exact remaining defect if any local gate stays unresolved.
At terminal: REPORT complete, durable docs updated from earned evidence, HEAD == origin/main, working tree clean.
