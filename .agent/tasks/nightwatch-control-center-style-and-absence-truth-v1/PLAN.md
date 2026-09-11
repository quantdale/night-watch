# Control Center Style and Absence Truth — Plan

## Purpose

Close the last three verification limits the render-truth campaign recorded —
family assertions, runtime class effect, and collection absence — and resolve
the one real divergence recon found: the system map's evidence tone classes
cannot match their stylesheet rules. The observable outcome: an unstyled or
inert class fails a mechanical check, and an empty collection that looks like
a short one fails another.

## Starting State

- Task ID: `nightwatch-control-center-style-and-absence-truth-v1`
- Starting SHA: `d904dc96156f8376c772e6c43a75ce8cde3fad04`
- `ui/control-center` is a Vite + React 19 + vitest package; the browser lane
  runs the built bundle over a synthetic authority composition in Chromium.
- Baseline measured here: UI 63/63, browser 4/4, `gate:local` 11/11 receipt
  `receipt:sha256:fd0ddcf782fd34ba027b6854`, full regression 4789/18/0.
- `styles.test.ts` excludes seven interpolation prefixes and asserts three
  concrete families; `styles.css` has no `.status-neutral`, no
  `.stage-neutral`, and four map tone rules that no rendered value can match.
- `contractRender.test.tsx` flips scalar leaves only; arrays are never
  emptied.

## Scope

- `ui/control-center/src/styles.test.ts` — family assertions.
- `ui/control-center/src/App.tsx`, `ui/control-center/src/styles.css` — A-04
  removal when confirmed.
- `tests/browser/controlCenterBrowser.browser.ts` — computed-effect coverage.
- `ui/control-center/src/contractRender.test.tsx` — absence pass.
- `config/validation-universe.v1.json` — registration and digest if needed.
- `.agent/**`, `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/**`,
  `docs/**` — task and project truth.

## Non-Goals

- No visual redesign; A-04 removes inert markup instead of inventing a colour
  taxonomy.
- No server, route, adapter, contract or authority change.
- No broad dead-CSS detection beyond the map family registered here.
- No execution, mutation, product contact, publication or network egress.

## Safety Constraints

- LOCAL only; loopback UI reads; sibling repositories read-only.
- Owner-local findings, raw evidence, credentials, traces and customer values
  stay outside the boundary.
- C-00: implementation happens in this campaign's owned session worktree.
- Never weaken a guard or delete a test for green output.

## Architecture / Approach

### Family assertions

`styles.test.ts` keeps the fragment exclusion for the prefix token itself and
adds a per-family concrete-value assertion built from the same `tones`
vocabulary the app produces. Families whose neutral value deliberately rides
the base class state that in the suite with a reason, so the absence of a rule
is a decision rather than an oversight. The system-map family is decided by
A-04: with the interpolation removed, no family assertion is needed for it.

### Runtime class effect

In the browser lane, after each view settles, a page evaluation collects every
class in the DOM. For each class and its first carrying element: the class is
toggled off with `setAttribute` (works for HTML and SVG), the full computed
style is read, the class is restored, and the two styles are compared by
property name. A class that changes no property on any element that carries it
is ineffective and must appear in a reasoned base-only list. Transitions and
animations are disabled during the check so no interpolated value is read.

### Absence pass

The fixture generator records every array field with its path. After the
scalar matrix, each recorded array is emptied in a fresh fixture, the owning
view is re-rendered, and the DOM must change. An array whose emptiness is
indistinguishable is exempt with a reason.

### A-04 resolution

The map's `node-${evidenceStatus}` and `edge-${evidenceStatus}` interpolation
is removed and the dead `.map-node.node-{proven,unproven,unknown,refuted}`
rules deleted; `.node-selected`, `.map-node` and `.map-edge` remain. This is
the predecessor's dangling-modifier decision applied again: no rule is
invented and no pixel changes.

## Milestones

### M0 — execution truth

- **Status:** COMPLETE
- Objective: an owned session on the current base, a clean workspace, the
  predecessor re-verified terminal COMPLETE, and this route committed.
- Files: `.agent/**`, `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/**`.
- Acceptance: `session:status` verdict PASS with `owned=true`, `drift=false`,
  `base=CURRENT`.
- Validation: `node bin/nightwatch-session.mjs status`, `npm run workspace:check`.

### M1 — family assertions and the map divergence (A-01, A-04)

- **Status:** COMPLETE
- Objective: assert the rendered families' concrete values; remove the map's
  inert tone classes and dead rules after confirming the vocabulary
  divergence against the built composition.
- Files: `ui/control-center/src/styles.test.ts`, `App.tsx`, `styles.css`.
- Acceptance: every produced family value asserted or explicitly base-only;
  no map tone class without a possible rule remains; UI suite green.
- Validation: `npm --prefix ui/control-center run test -- styles`,
  `npm --prefix ui/control-center run test`.

### M2 — runtime class effect (A-02)

- **Status:** COMPLETE
- Objective: prove every class the composition renders changes a computed
  style, with a reasoned base-only list.
- Files: `tests/browser/controlCenterBrowser.browser.ts`.
- Acceptance: deleting a live class's rule fails the lane; a base-only class
  is listed with a reason; the lane passes 4/4.
- Validation: `npm run control-center:ui:browser`.

### M3 — absence observability (A-03)

- **Status:** IN_PROGRESS
- Objective: emptying every array field changes the DOM, or is exempt with a
  reason.
- Files: `ui/control-center/src/contractRender.test.tsx`.
- Acceptance: the absence pass is non-vacuous, staleness checked, and
  mutation-proven (removing an empty-state message fails it).
- Validation: `npm --prefix ui/control-center run test -- contractRender`.

### M4 — registration and full UI validation

- **Status:** NOT_STARTED
- Objective: register any new file, refresh the digest, and pass the UI,
  root, hardening and universe checks.
- Files: `config/validation-universe.v1.json`.
- Acceptance: `validation:universe` PASS; UI typecheck, tests and build PASS;
  root typecheck and `hardening:check` PASS.
- Validation: the commands above.

### M5 — certification

- **Status:** NOT_STARTED
- Objective: `gate:local` and the full offline regression at the
  implementation checkpoint, documentation reconciliation, fast-forward
  integration, session release.
- Files: task state, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`,
  `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`.
- Acceptance: all eleven groups PASS; findings CLOSED; `HEAD == origin/main`.
- Validation: `npm run gate:local`, `npm test`,
  `node bin/nightwatch-session.mjs integrate`.

## Validation Strategy

Per milestone, the smallest sufficient check with its exact command and result
in `STATE.md`: focused UI suites and browser lane for M1–M3; `validation:universe`,
UI typecheck/test/build, root typecheck and `hardening:check` for M4; the full
`gate:local` and offline regression for M5. No gate weakened, no test deleted.

## Decision Log

- Decision: keep the interpolation-fragment exclusion and add per-family
  concrete assertions rather than parsing interpolations.
  Reason: parsing interpolations is guesswork; the families are known from the
  code and their value sets are small and explicit.
  Evidence: `status-*` and `stage-*` are produced by `statusTone` and were
  never asserted.
  Consequence: base-only neutral values are stated with reasons.

- Decision: prove class effect by toggling the class on the live element.
  Reason: a cloned element changes cascade context; toggling on the same
  element compares like with like.
  Evidence: `setAttribute('class', ...)` works for both HTML and SVG elements.
  Consequence: transitions and animations are disabled for determinism.

- Decision: resolve A-04 by removal, not by inventing a tone map.
  Reason: the predecessor's dangling-modifier precedent, and no pixel changes
  today; the alternative colour taxonomy is an owner-facing design choice.
  Evidence: `EVIDENCE_STATUSES` cannot produce the four styled values, and no
  test or source references an `edge-*` class.
  Consequence: the map keeps `.map-node`, `.map-edge` and `.node-selected`.

## Discoveries

- To be filled during execution.

## Deferred Work

- A colour taxonomy for map evidence status (the alternative to A-04 removal)
  is an owner-facing design decision.
- Dead-rule detection across the whole stylesheet remains unperformed.

## Completion Criteria

Every acceptance criterion in `SPEC.md` met with evidence; A-01 through A-04
CLOSED or resolved into exactly one honest class; the browser lane and UI
suite green; state and docs reconciled; certified checkpoint integrated by
fast-forward; session released; clean tree on canonical `main`.
