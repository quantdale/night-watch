# Plan — nightwatch-reviewer-surface-and-intel-scale-v1

## Purpose

Close the FC-1 deferred frontier: repair DEF-FC-04 and harden
task/continuity metadata against cross-campaign drift; surface the
certified finding intelligence in the Control Center reviewer experience;
and establish a measured scale envelope for finding intelligence before
any corpus reaches the sizes in question.

## Starting State

- HEAD == origin/main == `868761d2128d5155db454623bc2fa01622a57d33`.
- Predecessor `nightwatch-frontier-completion-reliability-v1` COMPLETE,
  validated implementation `8265ace`, project verdict
  `OPERATIONALLY_ACCEPTED` (PRESERVE).
- `src/core/findingIntel/` and `src/core/findingReview/` exist and are
  certified, reachable only through the human filing report.
- `src/controlCenter/` and `ui/control-center/` exist and are read-only
  by construction; neither carries reviewer intelligence.
- No scale measurement of finding intelligence exists at any corpus size.
- `.agent/ACTIVE_TASK.md` carried a predecessor routing block (DEF-FC-04).

## Scope

`.agent` continuity tooling and hardening rules; `src/core/findingIntel`,
`src/core/findingReview`; `src/controlCenter` authorities and adapters;
`ui/control-center`; repository-owned synthetic scale corpora and
measurement harnesses; tests, browser and endurance lanes; documentation
and OpenSpec.

## Non-Goals

- Live C-12 / C-13 / C-14 execution, DEV, NEXT, production contact.
- C-08b; C-07 DEV.
- External filing (Slack / Leslie / Pondr / Notion).
- Any bounty-scoring surface.
- Optimization not justified by a recorded measurement.
- A retry policy invented to close the campaign.
- Rewriting the finding cones or the Control Center authorities.

## Safety Constraints

- The Control Center stays read-only by construction.
- No raw customer value crosses the reviewer projection boundary, into
  payloads or into error messages.
- UNKNOWN is first-class, never grants authority, never renders as a weak
  affirmative.
- A duplicate suggestion is advisory; the final verdict authority remains
  `HUMAN_ORGANIZATIONAL`.
- Local review carries `organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`.
- Synthetic scale corpora never enter the owner-only finding store.
- No force push, no history rewrite, no sibling writes.

## Architecture / Approach

Continuity. The routing/safety block becomes structured and checked
rather than prose trusted by convention: it declares `CAMPAIGN` and
`SESSION WORKTREE`, and the continuity checker binds both to the active
task's own identity for every non-NONE active task, failing closed on
drift and on absence.

Reviewer surface. A new projection adapter over the existing
`findingsAuthority` reads `findingIntel` / `findingReview` output. The
cones keep their purity and hardening isolation; no authority is widened.
Every projected element carries an `epistemicClass` of `FACT`,
`RECOMMENDATION` or `UNKNOWN` derived from the same mechanical provenance
the cone already computes, so no rendering decision can promote a
recommendation to a fact.

Scale. Measurement precedes optimization. A deterministic synthetic
corpus generator plus a fresh-process harness records CPU time, peak RSS
and wall latency per stage at 1k / 5k / 10k. Pairwise relationship
analysis is the expected quadratic; the harness locates the actual
threshold instead of assuming it. Any index lands against a recorded
measurement and is re-measured at the same sizes afterwards.

## Milestones

### M1 (W0) — repository truth, DEF-FC-04, continuity hardening — COMPLETE

- [x] Reconcile Git and verify the predecessor's claims.
- [x] Prove DEF-FC-04 from Git history rather than by assertion.
- [x] Repair the drifted `.agent/ACTIVE_TASK.md` routing block.
- [x] Campaign-binding rule in the continuity checker; predecessor block
      and missing block both fail closed.
- [x] Regression that fails on the unrepaired historical document.

### M2 (W1) — reviewer projection — COMPLETE

Relationships, probable duplicates, recurrence, defect classes,
expectation provenance, confidence, Alphaus recommendations, local review
state, and `epistemicClass` on every element.

### M3 (W2) — Control Center reviewer UI — COMPLETE

### M4 (W3) — scale measurement at 1k / 5k / 10k — COMPLETE

### M5 (W4) — measurement-justified optimization — IN_PROGRESS

### M6 (W5) — large-corpus Control Center testing and endurance — NOT_STARTED

### M7 (W6) — privacy red team, mutation probes, fresh `npm ci` clean gate, full regression, deterministic fresh-process certification — NOT_STARTED

### M8 (W7) — documentation reconciliation — NOT_STARTED

### M9 (W8) — certification, REPORT, STOP — NOT_STARTED

## Validation Strategy

`npm run typecheck`, `hardening:check`, `agent:check`, `handoff:check`,
`project:check`, `workspace:check`, `control-center:ui:typecheck`,
`control-center:ui:test`, `control-center:ui:browser`, `gate:local`,
`node bin/frontier-determinism.mjs 20`, the scale harness at all three
sizes in fresh processes, the endurance lane repeated to a statistically
useful bound, a reversible mutation campaign requiring 0 survivors, full
regression, and `gate:clean` on a fresh `npm ci`.

## Decision Log

- D-REV-1: DEF-FC-04 is allocated for the cross-campaign routing-block
  drift. `DEF-FC-01..03` were taken by FC-1; no `DEF-FC-04` existed in the
  repository before this campaign. Recorded because the identifier enters
  durable records.

## Discoveries

- The routing block drifted because campaign-open commits rewrite the
  identity fields and leave the prose. This is invisible to review by
  inspection, exactly like DEF-FC-02's dead hardening rules.
- `project-state-check` and `planner-handoff-check` both spawn
  `bin/agent-state.mjs`, so a continuity rule lands in three suites at once.
- The `campaignTaskPattern` in `config/campaign-certification.v1.json` is
  `-(c|r)[0-9]+[a-z]*-v[0-9]+$`, so named campaigns like FC-1 and this one are
  exempt from suite-registration totality. Their regressions therefore run in
  the full regression only, not in a required `gate:local` group. The
  DEF-FC-04 *rule* is gate-enforced because it lives inside `agent:check`,
  which `AGENT_CONTINUITY` runs; its negative probes are not. Recorded rather
  than silently accepted.

## Deferred Work

(none recorded yet)

## Completion Criteria

All milestones terminal; DEF-FC-04 repaired with a regression that fails
on the unrepaired document; the reviewer surface complete and
privacy-clean; the scale envelope measured at all three sizes with any
optimization backed by before/after numbers; 0 mutation survivors; full
regression green on the committed tree; every durable document
reconciled; safety accounting all zero; STOP before any live C-12 / DEV /
NEXT / production work.
