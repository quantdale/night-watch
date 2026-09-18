# EXECUTION PROMPT — Certification closure and validation integrity

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-certification-closure-and-validation-integrity-v1
OpenSpec: openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/
Planned-From: 521210f706b9383e20dd08d1bfd2f3c47b34687d
Target Branch: main
Predecessor Task ID: nightwatch-control-center-design-system-v1
Predecessor Status: COMPLETE

## Mission

Remove the concrete blockers and validation blind spots that remain after the
G16.9 hardening-rule-engine decomposition and the Control Center design-system
campaign, then obtain a truthful green local certification if the repository
actually qualifies for one.

Every objective here is the same defect in a different place: a mechanism that
reports more than it proves. A `--dry-run` that mutates, a probe campaign that
nothing runs, a TOTALITY rule that stops at the first failure, a "code-only"
source view with real code missing from it, a focus ring nobody can see, and a
currentness pin that names a snapshot the sibling no longer has.

## Scope

`bin/nightwatch-session.mjs`, `bin/lib/hardening/**`, `bin/quality-gate*.mjs`,
`config/quality-gate.v1.json`, `config/hardening-rule-probes.v1.json`,
`config/validation-universe.v1.json`, `src/core/qualityGate/definition.ts`, the
real-source expectation and provenance surfaces required by one owner-authorized
`ripple-api` re-derivation pass, `ui/control-center/src/styles.css`, the Control
Center browser qualification lane, this change's OpenSpec artefacts,
`.agent/tasks/nightwatch-certification-closure-and-validation-integrity-v1/`,
and Nightwatch docs.

No UI redesign. No new feature group, route, adapter, authority or dependency.
No sibling write. No gate weakened and no exemption list lengthened to pass.

## Ordered workstreams

1. **M1 — session `--dry-run` contract.** Audit the whole flag surface, declare
   the contract once, enforce it at dispatch, prove zero mutation with a full
   before/after topology snapshot, and negative-probe the regression.
2. **M2 — `hardening:rules` becomes gate-authoritative.** Repair the rotted
   probe and the rot CLASS behind it; add a REQUIRED `HARDENING_PROBES` group
   through the gate-definition machinery; prove restore-cleanliness and vacuity
   failure.
3. **M3 — G16.5 quantifier audit.** Classify all 83 rules, make TOTALITY rules
   report every failing occurrence, and extend the engine self-check to the
   shape that actually shipped.
4. **M4 — `ripple-api` re-derivation.** Measure live source read-only, classify
   every occurrence of the old SHA, re-derive at both snapshots and compare, and
   re-admit on evidence rather than by substitution.
5. **M5 — focus-ring qualification.** Carried task 6.4 only: contrast at every
   declared width, from computed styles, across all nine views.
6. **M6 — tail closure.** Close only production-completion items whose exact
   remaining requirement is validation, integration or release evidence.
7. **M7 — certification.** Full validation at one SHA, fast-forward
   integration, session release, worktree removal, clean canonical checkout.

## Constraints

REAL PRODUCTION CONTACT, DEV/NEXT EXECUTION, SIBLING WRITES, CLOUD/DATASTORE
OPERATIONS, EXTERNAL PUBLICATION, FORCE PUSH, HISTORY REWRITE and CREDENTIAL
STORAGE are all NOT AUTHORIZED. The sibling `mobingilabs/ripple-api` checkout is
READ ONLY; read access is owner-authorized for one re-derivation pass and is
limited to `rev-parse`, `cat-file`, `archive`, `diff`, `status` and `log`
against committed objects.

C-00 governs: one writing agent, one owned worktree, one session identity.
Never adopt, edit or remove another session, and never create worktree capacity
by removing one.

## Validation

`session:status`, `session:check`, `workspace:check`, `typecheck`,
`typecheck:bin`, `hardening:check`, `hardening:rules`, `validation:universe`,
`agent:check`, `handoff:check`, `project:check`, the Control Center UI lanes and
browser lane, `gate:local`, full `npm test`, and strict OpenSpec validation.

Every new guard is negative-probed: it is shown to FAIL against a deliberately
broken input before it is trusted to pass.

## Acceptance and completion gates

A milestone is COMPLETE_LOCAL only when its defect is fixed, its guard is
negative-probed, and its evidence is recorded in `STATE.md`. The campaign is
COMPLETE only when the full validation list is green at ONE SHA, the work is
integrated by fast-forward with `HEAD == origin/main`, the session is released,
the owned worktree is removed and the canonical checkout is clean.

A green `gate:local` after this campaign is materially stronger than the one
before it: the gate now executes the rule probe campaign rather than merely
knowing the command exists. The changed group count and definition digest are
recorded truthfully.

## Git and reporting

Durable checkpoints only, pushed to `origin main` by fast-forward from the owned
session worktree. Never force-push, never rewrite history, never discard a newer
`origin/main`. Owner-gated programme items stay OPEN with the named owner action
each requires.
