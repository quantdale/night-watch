# REPORT — nightwatch-control-center-style-and-absence-truth-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-control-center-style-and-absence-truth-v1
Status: IN_PROGRESS

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced.

## Campaign identity

- Task: `nightwatch-control-center-style-and-absence-truth-v1`
- Session branch: `session/nightwatch-control-center-style--5e5ddb63`
- Session identity: `sess-d0b803f0afbe`
- Starting SHA: `d904dc96156f8376c772e6c43a75ce8cde3fad04`
- Scope: A-01 through A-04 as registered in the OpenSpec `audit.md`.

## M0 — execution truth

Owned session created and claimed on base `d904dc9`. `session:status` verdict
PASS with all seven workspace invariants PASS. Predecessor
`nightwatch-control-center-render-truth-v1` re-verified terminal COMPLETE.
Planning route written and committed.

## M1 — family assertions and the map divergence

`styles.test.ts` gained `status-*` and `stage-*` concrete-family assertions
with `status-neutral`/`stage-neutral` stated as intentionally base-only, and
the fragment set was trimmed to the prefixes still produced. The map
divergence was confirmed statically (the 13-value core vocabulary cannot
lowercase to the four styled values) and resolved by removal: the
`node-${...}`/`edge-${...}` interpolation and the four dead `.map-node.node-*`
tone rules are gone, while `.map-node`, `.map-edge` and `.node-selected`
remain. No pixel changes: the removed rules never matched. Mutation proof:
deleting `.stage-warning` failed the assertion with exactly that class.
UI suite 63/63.

## M2 — runtime class effect

`tests/browser/helpers/classEffect.ts` toggles every rendered class off its
carrying element and compares the full computed style with and without it,
including up to twelve descendants so descendant-selector anchors count.
Native form controls are excluded with a reason (the browser forces their
computed colours), and transitions are disabled through a CSSOM `insertRule`
on the app's own sheet because the page's CSP blocks injected styles.

Three real defects were found and fixed: `.run-detail-panel` lost its
intended border to the later `.panel` rule (now `.panel.run-detail-panel`);
`.campaign-metrics` restated `.metric-grid` exactly and was removed; and
`.graph-node-neutral` restated the base stroke and was removed with the
family assertion updated. Four base-only classes are declared:
`status-neutral`, `stage-neutral`, `text-neutral`, `graph-node-neutral`. Both
browser lanes run the sweep; the full lane passes 4/4 in 4.9 minutes. Deleting
the `.mini-state` rule fails the lane with exactly that class.

## M3 — absence observability

_To be filled during execution._

## M4 — registration and full UI validation

_To be filled during execution._

## M5 — certification

_To be filled during execution._

## Safety events

NONE. No product contact, no network egress, no execution or mutation
authority, no publication. No server bound, contract field or sanitizer
changed.
