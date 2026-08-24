# Phase 22 Living Plan

Task ID: phase-22-contained-dev-semantic-calibration
Phase: 22-CONTAINED-DEV-SEMANTIC-CALIBRATION
Authorization class: PHASE_22_CONTAINED_DEV_SEMANTIC_REALITY_CALIBRATION_ONLY
Status: BLOCKED
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Build a truthful, bounded bridge from current real-source semantic contracts
to a frozen DEV acceptance campaign without weakening any historical phase.

## Starting State

- `main` and `origin/main` are clean and synchronized at
  `c06ecd0183c9f6b25297f8f830d7e00e2fe0578c`.
- Phase 19, Phase 20, and Phase 21 are terminal and immutable historical
  records.
- Phase 9B-R1 and Phase 10B proved the fixed common-exchange shape/deep
  journeys; Phase 11A.x proved collection admission/evaluation locally and
  stopped before DEV.
- No DEV contact occurs during bootstrap or before M6.

## Scope

Additive eligibility, source freshness, manifest, preflight, privacy,
projection, replay, calibration, dossier, operator, and synthetic validation
work described by SPEC.md, plus one explicitly gated DEV campaign.

## Non-Goals

No NEXT/production, mutation, database/datastore, cloud/infra, sibling writes,
publication, AI authority, self-development, arbitrary crawling, or changes to
Phase 19–21 history.

## Milestones

- [x] M0 — bootstrap, authority reconciliation, historical contained-DEV
  review, and v2 task activation.
- [x] M1 — real-eligibility classifier, fresh source re-derivation, and
  drift/currentness evidence.
- [x] M2 — immutable bounded manifest planner and Preflight V2 receipt.
- [x] M3 — runtime privacy firewall, projection/replay seams, and hostile
  synthetic privacy tests.
- [x] M4 — collection/membership/differential real-acceptance adapters and
  safe minimization policy.
- [x] M5 — confidence calibration, Dossier V6, operator UX, and dry-run.
- [x] M6 — COMPLETE — mandatory local validation, fresh source re-derivation,
  frozen manifest, dry-run, and final pre-DEV gates. No DEV contact occurred.
- [x] M7 — COMPLETE AS BLOCKED_BEFORE_DEV — the required exact green Actions
  gate failed externally with zero steps, so the single DEV launcher was not
  invoked.
- [x] M8 — COMPLETE AS NO-CONTACT TERMINAL AUDIT — synthetic privacy/dry-run
  receipts and safety vector were audited; no real artifacts or calibration
  observations exist to interpret.
- [x] M9 — COMPLETE — post-gate local regressions and canonical/isolated parity
  are green; post-DEV-specific evaluation was not applicable because M7 did
  not execute.
- [x] M10 — COMPLETE — implementation pushed, one Actions inspection recorded,
  task terminalized, and handoff prepared. Final state is
  `PHASE_22_STATUS: BLOCKED_BEFORE_DEV`.

## Workstream map

| Workstream | Milestone | Authority |
|---|---|---|
| eligibility/source freshness | M1 | semanticCoverage + phase22 pure core |
| manifest/preflight | M2 | phase22 pure DTO/planner + guarded runner |
| privacy/projection/replay | M3 | phase22 privacy bridge + existing Phase 9–21 readers |
| collection/membership/differential | M4 | Phase 11A.3 + Phase 21 additive adapters |
| confidence/dossier/operator | M5 | existing confidence/dossier/CLI composition |
| dry run/freeze/preflight | M6 | exact manifest and local synthetic adapter |
| bounded DEV and audit | M7–M9 | existing L0–L5 runtime only |
| terminal records | M10 | v2 continuity + project state |

## Safety Constraints

Unknown, stale, malformed, unsupported, ambiguous, privacy-unsafe, or
authority-blocked inputs fail closed. Pure cores have no fs/network/eval/
child-process/DB/AI/persistence authority. Runtime contact is serial, fixed,
read-only, and manifest-bound. Raw authenticated data remains ephemeral and
never enters artifacts, findings, fingerprints, dossiers, errors, task files,
or Git.

## Architecture / Approach

Pure DTO/classifier/manifest/preflight/privacy cores remain deterministic and
authority-free. Existing Phase 9–21 evaluators and L0–L5 runtime boundaries
are composed only through explicit injected adapters. A frozen manifest is the
sole source of target execution; a synthetic dry run proves its shape before
the one optional launcher invocation.

## Validation Strategy

After every milestone: focused tests, typecheck/hardening as affected, inspect
diff/privacy surface, update STATE.md with exact evidence, then proceed. Before
M7 run all mandatory local gates and the exact dry-run. If the stronger
executable CI gate fails, stop before the launcher and terminalize
`BLOCKED_BEFORE_DEV`; no post-DEV claims may be inferred from synthetic or
local evidence.

## Decision Log

- M0: start a fresh Phase 22 task at the requested synchronized SHA; preserve
  Phase 19–21 history.
- M0: real campaign target selection is manifest-only and capped at six;
  selectors cannot discover live targets.
- M0: executable repository safety gates outrank this authorization.
- M1–M5: keep source derivation, manifest admission, privacy, replay,
  calibration, dossier, and operator surfaces additive; the Phase 22 launcher
  remains the only real-contact authority.
- M6–M10: retain the frozen three-target manifest as owner-local external
  state, record the exact CI blocker, and do not invoke the DEV launcher. The
  manifest is not a license to run after this task closes.

## Discoveries

Bootstrap confirms the repository is at the requested synchronized SHA and
that historical contained-DEV records provide reusable seams but no authority
to expand their fixed target sets.

Fresh read-only source discovery on 2026-08-24 resolved
`mobingilabs/ripple-api@85e400a8b32fc23c05464033a2a6d5fff2a2890c`; a disposable
detached snapshot was clean. Four collection expectations re-derived with
zero failures. Three existing DEV runtime bindings are eligible; billing-group
exchange has no runtime binding, and billing-groups / legacy billing-groups
remain synthetic-only. No real membership contract or mechanically proven
second real differential surface is currently admitted.

## Deferred Work

Uneligible source contracts, unresolved source drift, missing runtime bindings,
missing auth, unavailable CI when required by current authority, and any real
anomaly requiring route expansion, DB/infra, or sibling coordination stay
explicitly deferred. Phase 23 recommendation is decided only from sanitized
calibration evidence.

## Completion Criteria

All local gates, focused tests, dry-run, privacy/safety audits, continuity, and
project-state checks are green. DEV execution is conditional on the stronger
executable gates. This task reached the truthful alternative: exact
pre-DEV blocker recorded, zero DEV contact, and historical phases unchanged.
