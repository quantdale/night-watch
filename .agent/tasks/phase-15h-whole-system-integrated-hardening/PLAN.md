# PLAN — Nightwatch Phase 15H — Whole-System Integrated Hardening

Task ID: `phase-15h-whole-system-integrated-hardening`
Authorization at publication: NOT_GRANTED
Owner token: `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`

## Starting state

Phase 15P mass implementation ended at source SHA `c2640cb08e7057eccab740942c3dc9991109ad1e` with terminal continuity descendant `5da4917c2ee67b30f6a5e6d3453c6ddbcc1fd9e5`. The mass round was intentionally unvalidated. The handoff records 105 changed files, 17 implementation commits from strategy-shift base `abc9bf9...`, and known risks that must be treated as hypotheses until reproduced.

## Milestones

### M0 — Bootstrap and truth reconciliation
Status: NOT_STARTED
- fetch/fast-forward clean main;
- record authorization;
- transition this task to IN_PROGRESS and make active;
- read Phase-15P handoff/state/ledgers;
- reconcile stale `IMPLEMENTED_FOCUSED_GREEN` lane labels against mass-bulk `NOT_RUN_BY_OWNER_DIRECTION` truth;
- freeze starting head and changed-file manifest.

### M1 — Compiler recovery
Status: NOT_STARTED
- run typecheck first;
- classify every compiler error by A01–A16 lane / historical phase;
- fix source and test-type fallout without weakening architecture;
- add regression coverage for semantic fixes.

### M2 — Static safety and authority hardening
Status: NOT_STARTED
- hardening:check;
- owner-policy/pre-executor ordering;
- private-screening convergence;
- DTO/raw-value review;
- pure-core import boundaries;
- frozen Phase-6 quarantine.

### M3 — Phase-15P focused contract hardening
Status: NOT_STARTED
- run/fix A01–A16 focused suites;
- add missing tests for new public contracts and strict parsers;
- explicitly close all handoff risks 2–9.

### M4 — Executable adversarial corpus
Status: NOT_STARTED
- bind all Phase-15P scenario definitions to deterministic fixtures/executors or explicit non-executable blocker assertions;
- run >=3 repeats;
- all quality floors zero.

### M5 — All-phase compatibility
Status: NOT_STARTED
- run local/synthetic compatibility for every phase family 1–15;
- repair regressions;
- preserve frozen/gated phases.

### M6 — Campaign/provenance packs
Status: NOT_STARTED
- campaign:synthetic;
- owner-provenance;
- replay/minimality/checkpoint/resume matrices;
- semantic campaign/shadow matrices.

### M7 — Complete canonical regression
Status: NOT_STARTED
- complete Playwright workers=1;
- zero failed required;
- record raw counts.

### M8 — Topology-correct isolated regression
Status: NOT_STARTED
- clean isolated topology;
- deterministic install;
- complete Playwright workers=1;
- zero failed required.

### M9 — Continuity/project/catalog closure
Status: NOT_STARTED
- agent:check;
- agent:audit;
- project:check;
- catalog integrity;
- diff/cleanliness;
- update Phase-15P historical wording only from earned hardening evidence.

### M10 — Validated checkpoint and CI truth
Status: NOT_STARTED
- push source-bearing hardening checkpoint fast-forward;
- post-push decisive local recheck;
- inspect exact Actions run/job/steps;
- if external zero-step billing block remains, terminalize BLOCKED_EXTERNAL_CI only after every local gate is green.

### M11 — Durable closure
Status: NOT_STARTED
- final REPORT with all-phase matrix, defect/fix ledger, counts, SHAs, CI truth;
- update CURRENT_STATE/ROADMAP/DECISIONS when materially required;
- docs closure push;
- final exact Actions truth;
- STOP.

## Repair discipline

For each discovered failure capture: reproducer -> root cause -> code fix -> permanent regression -> narrow green -> broader green. Prefer one canonical source of truth over compatibility forks, but retain historical readers where serialized compatibility requires them.
