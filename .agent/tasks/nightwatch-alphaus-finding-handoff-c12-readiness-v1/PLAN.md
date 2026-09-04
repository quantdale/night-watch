# AH-1 Alphaus Finding Handoff + C-12 Operator Readiness

## Purpose

Give Nightwatch a projection-only, privacy-safe bridge from its canonical
BugDossier to an Alphaus-compatible human-review artifact (severity, catch
stage, source, reproduction, expected/actual, evidence — recommendation-only,
never filing, scoring, or publishing), plus a C-12 operator-readiness
package (runbook, configuration contract, local-only preflight, evidence
checklist, prerequisite truth). Afterward, durable documentation describes
implementation truth instead of the pre-campaign state.

## Starting State

- Task ID: `nightwatch-alphaus-finding-handoff-c12-readiness-v1`
- Starting Nightwatch SHA: `4ca990f9bead33ae5626c4ae4f21dc833f41aec2`
- Relevant architecture: `src/core/triage` (BugDossier), `src/core/aiReview`
  (bug drafts), `src/core/prodObserveP1` (MA-8 scope chain, consumed
  read-only), `src/core/prodPrivacy` + `src/core/prodEvidence` (C-10
  firewall, consumed read-only), `config/campaign-certification.v1.json`
  (R-12 registration authority), `bin/hardening-check.mjs` (cone rules).
- Dependencies: MA-8/F-13 COMPLETE (P1 cone certified, anchor `4642c16`).
- Established facts that must not be rediscovered: dossier identity is
  `candidateId` (no `dossierId` exists); only the P1 cone and tests may
  import P1 machinery; gate lanes are manifest-driven; GitHub Actions
  currently yields zero-step external blocks.

## Scope

Handoff cone (`src/core/alphausHandoff/`), readiness cone
(`src/core/c12Readiness/`), `bin/c12-preflight.mjs`, runbook + Alphaus
context docs, OpenSpec change, AH-1 certification registration, AH-1
hardening rule, matrices + seeded properties + 16-probe mutations,
CURRENT_STATE/DECISIONS reconciliation, full validation, REPORT,
integration, release.

## Non-Goals

Production/DEV/NEXT contact; C-12/C-13/C-14 execution; C-08b
organizational access; credential handling; Slack/Leslie/Pondr writes;
bounty scoring; team/code-owner inference; organizational duplicate or
genuine verdicts; sibling-repository writes; modifying the
triage/P1/C-11/C-10 cones.

## Safety Constraints

Zero production reads/writes; zero DEV/NEXT execution; no external
submission imports in the AH-1 cones; no bounty-scoring surface; authority
literals stay literal; privacy firewall stays downstream; C-00 worktree
discipline; no force push; no history rewrite.

## Architecture / Approach

Pure projection (`projectAlphausFindingHandoff`) from BugDossier with
facts/recommendations/authority separation and UNKNOWN first-class; pure
advisory preflight (`evaluateC12Readiness`) over caller-supplied
descriptors; thin CLI compiling the cone fresh per run; cone isolation
enforced by `checkAlphausHandoffBoundary` (defined and invoked);
certification via the R-12 registry + synthetic lane; verification by
matrix + seeded properties + reversible mutations with byte-identical
restore.

## Milestones

### M1 — Recon

- Objective: reconcile repository truth; map dossier/privacy/publication architecture; task record.
- Files/areas: docs/, .agent/, src/core/triage, src/core/prodObserveP1.
- Implementation actions: session start/claim; SPEC/PLAN/STATE; scout recon.
- Acceptance criteria: starting SHA verified; recon gaps recorded.
- Validation commands: `npm run session:status`
- Status: DONE

### M2 — Handoff + preflight implementation

- Objective: versioned contracts, projector, evaluator, matrices, registration, hardening rule.
- Files/areas: src/core/alphausHandoff, src/core/c12Readiness, tests/unit/alphaus*, tests/unit/c12*, config/, bin/hardening-check.mjs.
- Implementation actions: implement cones; 36+24 tests; registry + lane; boundary check.
- Acceptance criteria: typecheck clean; focused suites green; hardening PASS.
- Validation commands: `npm run typecheck`, `npm run hardening:check`
- Status: DONE

### M3 — Adversarial verification

- Objective: seeded properties; 16-probe mutation campaign with zero survivors.
- Files/areas: tests/unit/alphausHandoffProperties.test.ts, /tmp/ah1_mutation.py (driver, untracked).
- Implementation actions: property suites; reversible mutations with digest-verified restore.
- Acceptance criteria: 22 introduced, 22 detected, 0 survivors; tree pristine after.
- Validation commands: `python3 /tmp/ah1_mutation.py`
- Status: DONE

### M4 — Operator surface + context docs

- Objective: preflight CLI + operability tests; runbook; Alphaus context doc; OpenSpec change.
- Files/areas: bin/c12-preflight.mjs, docs/C12-OPERATOR-RUNBOOK.md, docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md, openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/.
- Implementation actions: CLI with fresh-compile-per-run; runbook ledger + template; context provenance.
- Acceptance criteria: CLI READY/BLOCKED/error paths verified; docs committed.
- Validation commands: `npm run c12:preflight -- --input <descriptor>`
- Status: DONE

### M5 — Documentation reconciliation

- Objective: CURRENT_STATE/DECISIONS describe implementation truth; stale-phrase sweep; freshness hardening.
- Files/areas: docs/CURRENT_STATE.md, docs/DECISIONS.md, .agent/ task files.
- Implementation actions: live-state block update; header/CI/critical-path prose; stale search; narrow check.
- Acceptance criteria: `npm run project:check` PASS; `npm run agent:check` PASS with zero strict errors.
- Validation commands: `npm run project:check`, `npm run agent:check`
- Status: DONE

### M6 — Full validation + closure

- Objective: gate:local, gate:clean, full regression, clean-clone, CI inspection, independent review, REPORT, integrate, release.
- Files/areas: repo-wide.
- Implementation actions: run all gates; repair; REPORT.md; push; verify HEAD == origin/main; release session.
- Acceptance criteria: every gate green at the integrated head; REPORT complete; tree clean.
- Validation commands: `npm run gate:local`, `npm run gate:clean`, `npm test`
- Status: DONE

## Validation Strategy

Focused suites per milestone; typecheck + hardening after every code change;
project/agent checks after every continuity change; gate:local baseline at
base SHA already recorded (`receipt:sha256:f55ec47acdc38825941c2061`);
full regression + clean gates only at M6 to avoid stale-SHA evidence.

## Decision Log

- 2026-09-04 — Decision: handoff projects BugDossier (no parallel model); reason: scout-confirmed canonical abstraction; evidence: FindingPipeline recon; consequence: types reference triage, hardening asserts BugDossier presence.
- 2026-09-04 — Decision: team type-level UNKNOWN, no code-owner field; reason: no evidence source exists; consequence: absence-tested.
- 2026-09-04 — Decision: preflight self-contained (no P1 imports); reason: MA-8 reverse-isolation rule; evidence: checkP1ObservationScopeBoundary; consequence: duplicated literals pinned by unit test.
- 2026-09-04 — Decision: no tracked CLI via extensionful imports; fresh tsc-compile-per-run instead; reason: repo extensionless convention; consequence: bin/c12-preflight.mjs + operability tests.
- 2026-09-04 — Decision: M16 mutation widened to combined barrier probe; reason: single-gate removal survived via redundant shape check; consequence: 16/16 with documented defense-in-depth.

## Discoveries

- BugDossier carries no `dossierId`; identity is `candidateId` (verified by grep, not assumed).
- Draft `summaryDraft` is dropped by projection, so whole-draft sentinel scanning was added (caught by the private-key probe test).
- `*.alphaus.cloud` rejection is enforced twice (explicit wildcard check + hostname shape); the shape alone suffices, kept both for diagnostics.

## Deferred Work

- `nightwatch.quality-gate` lane for the C-12 synthetic rehearsal receipt (mega-campaign W5 territory).
- Finding lifecycle/review-state persistence (mega-campaign W1 territory).

## Completion Criteria

SPEC acceptance (16-probe zero-survivor, property suites, runbook, context
doc, OpenSpec, reconciled docs, full validation green, REPORT, integrated
HEAD == origin/main, session released) plus `C-12 WAS NOT EXECUTED BY THIS
CAMPAIGN`.
