# PLAN — Phase 16CH Portfolio Runtime Binding Hardening

Task ID: `phase-16ch-portfolio-runtime-binding-hardening`
Authorization at publication: NOT_GRANTED
Authorization granted at activation: PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY (2026-08-23, recorded in STATE.md before any source mutation)
Required execution token: `PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`

## Purpose

Turn Phase 16C's focused-green runtime binding into an evidence-backed local release candidate before any contained DEV retry.

## Starting State

Live HEAD == origin/main == `70443a3b5d599b011c2a40d612dd701652e566a4` (clean tree) after fast-forward from the Phase-16C closure descendant `122ff7dc7ea21b88d9af80fee473222a3ef9cfc6`. Predecessor implementation checkpoint: `8e8684dcf93bb01b3fe52e56355b2aa59f13567e`. Phase 16C focused/moderate evidence is predecessor evidence only; canonical and topology-isolated full regressions are owed here.

## Scope

Repair-and-proof of the existing Phase-16C runtime binding seam (W1–W8 of WORKSTREAMS.md): real-universe provenance, admission/authorization, budget mapping, work-item binding, fingerprint compatibility, prepare/resume ordering, launcher file boundary, single-executor static proof, adversarial corpus/determinism/privacy, affected compatibility, canonical + isolated complete regressions, closure gates, Git/CI truth, durable closure.

## Non-Goals

No DEV/NEXT/production contact; no real campaign; no authenticated browser or storage-state loading; no new endpoint/target/operation authority; no budget-policy relaxation (mapping v1 semantics preserved); no CampaignVersionFingerprint convenience extension that breaks historical exact-key compatibility; no Phase 6 expansion; no Phase 11B/13B; no Alphaus sibling writes; no database/data-plane/cloud/infra work; no AI/model authority; no selfDev/promotion/catalog mutation.

## Safety Constraints

LOCAL / SOURCE / SYNTHETIC only. All execution via WSL node v22 with injected synthetic executors and temp directories. No credentials/customer data in source, artifacts, corpus, or `.agent` files. Errors stay categorical/sanitized. Any escape to a second executor or pre-admission/pre-owner-policy executor use is a hard defect, never a workaround target.

## Architecture / Approach

The architecture under test is fixed (docs/design/PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING.md): canonical runtime profile -> real approved universe -> portfolio plan + inert handoff -> strict admission + independent authorization -> monotone-restrictive budget mapping -> exact selected-member binding -> CampaignManifest optional portfolioBinding -> prepareCampaign -> checkpoint -> resumeCampaign -> owner policy -> existing executor. Adversarial corpus first, affected compatibility next, then canonical full regression, then topology-correct isolated regression, then closure. New production source is allowed ONLY for observed defects.

## Milestones

### M0 — Bootstrap / continuity / predecessor reproduction
Status: IN_PROGRESS
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

## Validation Strategy

Typecheck first (first executable hardening gate). Every observed failure: preserve exact reproducer, root-cause from CURRENT source, classify, repair source if real, add/repair a permanent regression, rerun narrow, rerun affected broader gate, record in DEFECT_LEDGER.md. Corpus >=100 deterministic scenarios; complete binding seam x>=3 byte/digest identical; all thirteen Phase-16CH quality floors zero. Canonical `npx playwright test --project=nightwatch --workers=1` failed=0 with skip inventory; topology-correct isolated rerun with exact parity of enumeration/counts/skips.

## Decision Log

- D-16CH-candidate (pending evidence): none yet. Record only decisions actually made during execution, with current-source evidence.

## Discoveries

- npm/node cannot run from the Windows UNC working directory; repository commands execute inside WSL Ubuntu (`wsl.exe -d Ubuntu --cd <repo> -- bash -lc ...`, nvm node v22.22.1).
- Dormant STATE/PLAN templates lacked continuity-v2 required headings; extended at activation before any source mutation.

## Deferred Work

- Phase 16D contained DEV acceptance retry: NOT_AUTHORIZED in this task; requires a separate fresh owner authorization after local-green closure.
- docs/CURRENT_STATE.md stale top-level Last-updated narrative (Phase 16H anchor): repaired truthfully during continuity closure.
- GitHub Actions: single inspection per pushed SOURCE checkpoint; never retry the external billing/spending block.

## Completion Criteria

- All M0–M11 milestones COMPLETE with evidence recorded in STATE.md.
- All thirteen Phase-16CH quality floors measured zero from actual runs.
- Canonical complete regression failed=0; topology-correct isolated run exact parity (enumeration/counts/skip inventory).
- Closure gates green: typecheck, hardening:check, campaign:synthetic, owner-provenance, agent:check/audit strict errors 0, project:check PASS, catalog count+digest unchanged, promotion authority NONE, git diff --check clean.
- Terminal classes (choose by actual CI truth):
  - local green + CI zero-step external block: `PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` and `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED`.
  - real CI steps green for the exact validated implementation SHA: `PHASE_16CH_STATUS: COMPLETE` and `PHASE_16C_RUNTIME_BINDING: VERIFIED_LOCAL_AND_CI`.
  - unresolved local defect: `PHASE_16CH_STATUS: BLOCKED_LOCAL_GAP` with exact defects enumerated.

Phase 16D DEV retry remains separately authorized and must not start here.