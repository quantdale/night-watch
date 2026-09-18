# Task Spec — Certification Closure and Validation Integrity v1

Task ID: nightwatch-certification-closure-and-validation-integrity-v1
Phase: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
Authorization class: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
Frozen intent. Living execution order lives in `PLAN.md`.

## Mission

Remove the concrete blockers and validation blind spots left after the G16.9
hardening-rule-engine decomposition and the Control Center design-system
campaign, then obtain a truthful green local certification **if the repository
actually qualifies for one**.

This is an implementation + certification campaign. It does not redesign the
UI, does not start new feature work, and does not broaden Nightwatch's runtime
authority.

## Objectives

- **A. Session `--dry-run` contract.** `start --dry-run` mutates: it creates a
  branch, a worktree and an ownership record while reporting a plan, silently
  consuming `maxWorktrees` capacity. Audit the whole flag surface, make the
  public CLI contract truthful, and prove zero mutation adversarially.
- **B. `hardening:rules` becomes gate-authoritative.** The probe campaign is a
  declared npm script that no gate group, lane, validation-universe class or CI
  workflow selects. That is why probe HC-059 could rot invisibly. Wire it into
  the authoritative gate through the gate-definition machinery, not by
  appending a command.
- **C. G16.5 rule-quantifier audit.** Audit all 83 registered rules; make
  TOTALITY rules evaluate every occurrence and report every failing line.
- **D. `ripple-api` re-derivation and re-admission.** Owner-authorized. Measure
  the live sibling SHA, diff the admitted contract, re-derive expectations, and
  re-admit on evidence — never by substituting a SHA.
- **E. Control Center focus-ring qualification** at every declared width
  (carried task 6.4). No redesign.
- **F. Close production-completion tails** whose only remaining requirement is
  validation, integration or release evidence.

## Non-goals and hard boundaries

- No UI redesign; no information-architecture change.
- No new feature group, API route, adapter, runtime authority or dependency.
- The sibling `mobingilabs/ripple-api` checkout is READ ONLY. No checkout,
  reset, rebase, fetch, or file edit; no execution of its application code; no
  dependency installation inside it.
- A gate is never weakened and an exemption list is never lengthened to pass.
- Historical documents and fixtures that intentionally describe the historical
  `27bb007a` baseline remain historical. Current-source truth moves forward;
  historical evidence stays historical.
- Owner-gated items stay open. This campaign does not self-authorize CI route
  selection, evidence reclaim, branch disposition, network egress, Phase
  9B/10B, provider-dependent yield, status naming, or `dtoFramework`.

## Authorization

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
DEV / NEXT EXECUTION:                  NOT AUTHORIZED
SIBLING WRITES:                        NOT AUTHORIZED
CLOUD / DATASTORE OPERATIONS:          NOT AUTHORIZED
EXTERNAL PUBLICATION:                  NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
CREDENTIAL STORAGE:                    NOT AUTHORIZED
SIBLING READ (ripple-api, read-only):  AUTHORIZED for one Phase-9A.1-style
                                       re-derivation and re-admission pass

## Declared Deletions

- NONE
