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

Status: COMPLETE

- campaign:synthetic 27 passed / 0 failed (17.9s); test:owner-provenance 91 passed / 0 failed (10.7s); both re-run green at closure. No new defects; replay/minimality/checkpoint/resume matrices already covered by the green unit sweep.

### M7 — Complete canonical regression

Status: COMPLETE

- fresh complete Playwright workers=1 AFTER DEF-12/DEF-13 fixes: 2063 passed / 0 failed / 4 skipped, exit 0, 4.8m; all 4 skips inventoried as pre-existing environment guards; no new skip.

### M8 — Topology-correct isolated regression

Status: COMPLETE

- fresh no-hardlinks clone of 06ea7ca + npm ci + NIGHTWATCH_PROXY_PORT=19123; first attempt without sibling topology produced 2055/8/4 with all 8 failures proven topology-caused; after read-only sibling symlinks reproduced the REPOSITORIES topology: 2063 passed / 0 failed / 4 skipped, exit 0 — exact match with canonical.

### M9 — Whole-system closure gates

Status: COMPLETE

- typecheck PASS; hardening:check PASS; packs re-green (27/0, 91/0); agent:check PASS (0 strict errors); agent:audit strict_errors=0; project:check PASS with catalog count/digest unchanged and nextPromotionAuthority NONE; git diff --check PASS; adversarial floor batch 121 passed / 0 failed, all floors zero.

### M10 — Validated checkpoint and CI truth

Status: COMPLETE

- A15 deletion/de-export sweep verified (0 Git-level deletions; 147 de-exports / 55 files with 0 surviving external references; trust roots 46/46 transitively closed; restorations: 1 deliberate DEF-01 export only); privacy/authority review clean; earned hardening SHA recorded as validated anchor (06ea7ca62b1d5c8770d42622d4655e942ec68336 — every gate ran against exactly that tree); exact Actions inspection ONCE: run 32554139535 / job 96985562679 = failure with ZERO steps executed (external billing/spending block, log blob absent) -> BLOCKED_EXTERNAL_CI, no retry-loop.

### M11 — Durable closure

Status: COMPLETE

- evidence-backed REPORT.md written (all required sections); STATE/ACTIVE_TASK/docs updated truthfully; docs-closure fast-forward pushed; terminal tokens BLOCKED_EXTERNAL_CI / VERIFIED_LOCAL_NOT_CI_VERIFIED.

## Validation Strategy

Every PASS maps to a command executed in this session against the mass anchor or the relevant fix. Raw integer counts recorded in STATE Validation Ledger and REPORT. Historical pre-mass greens are background only. Quality floors must be zero; skips inventoried; canonical/isolated count differences evidenced by topology.

## Decision Log

- D-15H-1: DEF-06 fixed in the writer; validator kept strict.
- D-15H-2: stale pins updated only with proven deliberate mechanical growth.
- D-15H-3: lifecycle oracles extended to full 21-edge truth incl. GATE_BLOCK reason requirement.
- D-15H-4: terminal BLOCKED_EXTERNAL_CI adopted after single exact Actions inspection (run 32554139535 executed zero steps under the external billing/spending block); no retry-loop, no CI-green claim.

## Discoveries

- A09 interrupted-work bookkeeping was broken for every multi-checkpoint run (stale carryover via state spread); single-checkpoint pre-integration runs masked it.
- A15 de-export sweep had one false negative (ReasonCode); EdgeMatch verified caller-free.
- NIGHTWATCH_PROXY_PORT overridable for isolated topology runs.
- Git-level ground truth: the whole mass round deleted ZERO files (lane and integrated both pure A/M); mechanical extraction measured 147 removed exports across 55 files with zero surviving external references; historical backtests/smoke require sibling Alphaus repos under the parent REPOSITORIES directory (isolated checkouts must reproduce that topology).

## Deferred Work

- Handoff risk 1 (same-named `validateUnifiedContractResultDto` exports): public-surface rename deferred to a dedicated compat task.
- Repository-wide adversarial fuzz beyond the corpus matrix; exhaustive static audit outside the touched cone: remain future hardening scope if separately authorized.

## Completion Criteria

Terminal states per SPEC §8 — RESOLVED as the second (external-CI-blocked)
terminal state:

- `BLOCKED_EXTERNAL_CI` + `VERIFIED_LOCAL_NOT_CI_VERIFIED`: every
  local/source gate green on earned hardening SHA 06ea7ca62b1d5c8770d42622d4655e942ec68336;
  Actions run 32554139535 for that exact SHA never executed a step (external
  billing condition), recorded once without retry loops. Phase 6 remains
  FROZEN_BY_OWNER; Phase 11B/13B remain NOT_AUTHORIZED.
At terminal: REPORT complete, durable docs updated from earned evidence,
HEAD == origin/main, working tree clean.
