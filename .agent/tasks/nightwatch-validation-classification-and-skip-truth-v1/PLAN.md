# Nightwatch validation classification and skip-identity truth

## Purpose

Make a green semantic-compat run and an `UNAVAILABLE` validation class facts
the executor actually obeys: skips are allowlisted identities, and a class the
default runner executes is never carried as unavailable.

## Starting State

- Change planned at `ebe26ce`; task record created by the
  `nightwatch-open-spec-truth-closure-v1` campaign.
- `expectedSkipPolicy` is declared but never enforced; six fixture smokes are
  classified `LIVE_APP_SMOKE` / `UNAVAILABLE_CAPABILITY` while default
  `testMatch` executes them; `BROWSER_WORKFLOW.evidenceLane` names a
  non-existent script; `playwright.capture.synthetic.config.ts` is unbound;
  two race-child fixtures fork the TypeScript loader.

## Scope

Skip-identity enforcement, universe/lane-state rules and reclassification,
config binds, fixture loader convergence, and the 18→12 spec amendment.

## Non-Goals

`lanes:manual` delivery, manual harness changes, hardening decomposition,
production-completion box ticks.

## Safety Constraints

No skip is silently accepted; no same-run classification is trusted where the
runner proves otherwise.

## Architecture / Approach

Pure classification helpers over universe/lane-state/package.json data,
called from the hardening check; semantic-compat parses Playwright skip
locations and compares them to the canonical identity list.

## Milestones

- [x] M1 — Skip-identity enforcement (tasks 1.1–1.4).
- [x] M2 — Universe class vs default runner and spec supersession (tasks
  2.1–2.6).
- [x] M3 — Playwright config bind and fixture loaders (tasks 3.1–3.4).
- [x] M4 — Digest and closeout (tasks 4.1–4.4).

## Validation Strategy

Focused tests for each rule, `node bin/hardening-check.mjs`, the
semantic-compat cone, `npm run validation:universe`, and strict OpenSpec
validation.

## Decision Log

- 2026-09-14 — Reclassify the six fixture smokes into an executed lane rather
  than excluding them from `testMatch`; `npm test` already runs them.

## Discoveries

- (recorded as measured)

## Deferred Work

- `lanes:manual` for the 12 `MANUAL_OWNER` harnesses remains production
  completion G2 work.

## Completion Criteria

Every box ticked with evidence; the new rules negative-probed; the programme
specs corrected without ticking programme boxes.
