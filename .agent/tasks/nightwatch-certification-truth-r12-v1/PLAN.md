# R-12 Certification Manifest + Project Truth Closure

## Purpose

After R-12, a campaign cannot ship a certification suite that the
authoritative gate never runs. The registration rule becomes a totality over a
declared registry instead of a per-campaign courtesy, and the project-truth
documents state the completion that the repository actually reached.

## Starting State

Task ID `nightwatch-certification-truth-r12-v1`; starting SHA
`cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0`; predecessor
`nightwatch-system-map-v2-c15b-v1` COMPLETE and certified at CI run
`33750522362`.

Established and not to be rediscovered:

- Three of the eleven required gate groups execute tests; none runs the full
  canonical regression.
- 238 suites on disk, 173 registered, 65 unregistered; 6 of the 65 are
  campaign certification suites (C-01 x4, C-02a, C-06).
- C-06 is fully deterministic; C-02a self-skips exactly one real-source block;
  the four C-01 suites are fully deterministic.
- The synthetic-campaign runner reports `skipped` truthfully and does not fail
  on it.
- Registration is enforced by four hand-written loops in
  `bin/hardening-check.mjs` (C-02b, C-03, C-04, C-15b).
- 11 campaign task directories match `-(c|r)N[a-z]*-vN`, all COMPLETE.

## Scope

Registration lanes; one declarative registry; totality enforcement; master
ledger status reconciliation; CURRENT_STATE checkpoint prose reconciliation;
negative probes.

## Non-Goals

No new campaign, no repository admission, no source-analysis change, no rule
weakened to make a suite register, no production or NEXT contact.

## Safety Constraints

Production contact 0; NEXT contact 0; DEV contact 0; sibling writes 0; no
force push; all implementation inside the owned session worktree
`session/nightwatch-certification-truth-r-cd8904c5`.

## Architecture / Approach

`config/campaign-certification.v1.json` carries
`schemaVersion: nightwatch.campaign-certification.v1`, a `lanes` map from lane
id to its manifest file, and a `campaigns` array of
`{id, task, lane, suites[]}`. One new `hardening:check` rule,
`checkCampaignCertificationRegistry`, enforces four properties: schema and
uniqueness; existence on disk; registration in the declared lane; and
totality against the campaign task directories discovered under
`.agent/tasks/`. The four hand-written loops are deleted, because a rule that
is also enforced generically is a second source of truth.

The registry's completeness rule derives its campaign set from the task
ledger — real campaign metadata — rather than from test filenames.

## Milestones

- M1 Task record, OpenSpec change, session claim — COMPLETE
- M2 Register the six suites in their correct lanes — NOT_STARTED
- M3 `config/campaign-certification.v1.json` + totality rule; retire the four
  loops — NOT_STARTED
- M4 Master task ledger normative status (C-02b, C-03, C-04, C-11, C-15b) — NOT_STARTED
- M5 CURRENT_STATE checkpoint prose reconciliation — NOT_STARTED
- M6 Negative probe matrix, all restored — NOT_STARTED
- M7 Validation: regression, gate:local, gate:clean — NOT_STARTED
- M8 Integrate, exact-head CI, project truth, close, release — NOT_STARTED

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `workspace:check`, `gate:inventory`,
`test:semantic-compat`, `campaign:synthetic`, the six newly registered
suites, the full canonical regression, `gate:local`, `gate:clean`, exact-head
GitHub Actions.

## Decision Log

- 2026-09-04 — Register C-02a as-is rather than build a deterministic CI
  counterpart. Reason: only one of its five describe blocks touches siblings
  and that block already self-skips; the synthetic runner records the skip in
  the receipt. Evidence: `test.skip` at `c02aOpenApiAdmission.test.ts:313`;
  runner skip accounting in `bin/campaign-synthetic.mjs`. Consequence: no
  fabricated counterpart, and no claim of real-source execution in CI.
- 2026-09-04 — Derive registry completeness from the campaign task ledger, not
  from test filenames. Reason: §17 forbids a filename-only heuristic where
  stronger campaign metadata exists; `.agent/tasks/<id>/` is that metadata and
  is a bounded set of 11. Consequence: a future campaign that adds a task
  directory but no registry entry fails closed.
- 2026-09-04 — Delete the four hand-written registration loops rather than
  keep them alongside the registry. Reason: two authorities for one rule drift;
  C-15b's loop is exactly the pattern that let C-01/C-02a/C-06 through.

## Discoveries

- C-01's four certification suites are unregistered too. C-15b's report named
  only C-02a and C-06, so the recorded debt understated itself by four suites.
- `docs/CURRENT_STATE.md`'s checkpoint prose table carries a malformed row:
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` has six cells in a five-column table,
  with a C-11 "Why" and an R-11 "Why" concatenated.

## Deferred Work

C-15c owns the System Map V2 transport. C-16 owns the G-16 / EIG ownership
resolution that the master ledger still lists as unowned.

## Completion Criteria

The eight acceptance rows of `SPEC.md`, each carried in the REPORT ledger with
exact evidence.
