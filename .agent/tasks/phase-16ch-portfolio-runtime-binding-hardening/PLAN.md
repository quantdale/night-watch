# PLAN — Phase 16CH Portfolio Runtime Binding Hardening

Task ID: `phase-16ch-portfolio-runtime-binding-hardening`
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`

## Purpose

Turn Phase 16C's focused-green runtime binding into an evidence-backed local release candidate before any contained DEV retry.

## Milestones

### M0 — Bootstrap / continuity / predecessor reproduction
Status: NOT_STARTED
- clean fetch/ff main; record authorization before mutation;
- read Phase 16C STATE/REPORT/RUNTIME_BINDING_HANDOFF;
- reproduce implementation/closure SHAs and changed cone from Git;
- repair stale durable docs only if current evidence contradicts them.

### M1 — Compiler/static/universe baseline
Status: NOT_STARTED
- typecheck first;
- static single-executor/caller inventory;
- real-universe provenance and synthetic-exclusion hardening.

### M2 — Admission / authorization / parser hardening
Status: NOT_STARTED
- complete handoff+manifest+runtime-plan negative matrix;
- categorical/sanitized errors;
- no plan mutation.

### M3 — Budget / work-item binding hardening
Status: NOT_STARTED
- exhaustive monotone budget grid;
- exact-one work-item mapping and ambiguity rejection;
- current profile reserve/restriction edge cases.

### M4 — Identity / fingerprint / prepare-resume hardening
Status: NOT_STARTED
- every binding field load-bearing where intended;
- drift/tamper matrix;
- fresh resume authorization before executor;
- prepare zero-executor proof;
- legacy byte/digest compatibility.

### M5 — Launcher / file-boundary / single-executor hardening
Status: NOT_STARTED
- option/path/file/EOL/failure fuzz;
- privacy-safe errors;
- static and synthetic proof of one runtime/executor path.

### M6 — Adversarial corpus + determinism
Status: NOT_STARTED
- >=100 deterministic Phase-16CH cases;
- >=3 full seam repeats;
- all Phase-16CH quality floors zero.

### M7 — Historical compatibility
Status: NOT_STARTED
- directly affected Phase 7/12/13/15/16 suites;
- campaign:synthetic;
- owner-provenance;
- fix observed regressions with permanent tests.

### M8 — Canonical complete regression
Status: NOT_STARTED
- `npx playwright test --project=nightwatch --workers=1`;
- zero failures; inventory skips; no new regression-hiding skip.

### M9 — Topology-correct isolated complete regression
Status: NOT_STARTED
- fresh clone/checkout; deterministic `npm ci`;
- recreate required sibling topology read-only;
- distinct proxy port if needed;
- exact canonical command and count/enumeration comparison.

### M10 — Closure gates / validated checkpoint / CI truth
Status: NOT_STARTED
- typecheck, hardening, synthetic, provenance, agent check/audit, project check, catalog, diff;
- commit validated source fixes if any; push ff; inspect exact Actions once.

### M11 — Durable closure
Status: NOT_STARTED
- populate DEFECT_LEDGER/REPORT/HARDENING_HANDOFF;
- update STATE/ACTIVE_TASK/current-state docs truthfully;
- push docs closure ff; clean HEAD==origin/main; STOP.

## Testing order

Use focused tests while repairing defects. Do not repeatedly run complete Playwright during early failure triage. Complete canonical and isolated regressions are mandatory at M8/M9 after the focused surface is green.

## Terminal classes

- local green + CI zero-step external block: `PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` and `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED`.
- real CI steps green: `PHASE_16CH_STATUS: COMPLETE` and `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_AND_CI`.
- unresolved local defect: `PHASE_16CH_STATUS: BLOCKED_LOCAL_GAP` with exact defects.

Phase 16D DEV retry remains separately authorized and must not start here.