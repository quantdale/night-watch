# REPORT — nightwatch-control-center-style-and-absence-truth-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-control-center-style-and-absence-truth-v1
Status: COMPLETE

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

The fixture generator records every array its value carries, at every depth.
After the scalar matrix, the absence pass empties each one and requires a view
that can receive the contract to render a different DOM. Every recorded
collection was absence-observable; the exemption list is empty, and its
staleness check is mutation-proven. Two mutation proofs were run: disabling
array recording fails the vacuity assertion, and a fake exemption for an
observable array fails the staleness assertion. The source view's activation
became tolerant of an empty surface page, because that is the absence case it
must exercise. Harness 3/3 in 24.8 seconds.

## M4 — registration and full UI validation

UI typecheck, 63 tests and build pass; root typecheck passes;
`validation:universe` reports UI_LANE=5 with every discovered test classified
(the new browser helper is not a discovered test); `hardening:check` initially
failed on the `docs/CURRENT_STATE.md` header date, a real rule, and passed
after the header was bumped to the day its last change actually landed.

## M5 — certification

`gate:local` returned all eleven groups PASS at the implementation commit
`88e3c3f`, receipt `receipt:sha256:7945d6ad715fab8479e36d2a`:
SEMANTIC_COMPATIBILITY 2083/2070/13/0, OWNER_PROVENANCE 91,
SYNTHETIC_CAMPAIGN 1797/1797/0 with `deepContainmentLane: PROVEN`. The full
offline regression passed 4789 / 18 skipped / 0 failed in 11.8 minutes,
identical to the campaign's starting baseline.

## Integration

Performed by fast-forward from the owned session per the campaign's Git and
reporting contract, with `HEAD == origin/main` verified after the push
(`SESSION_INTEGRATED`). No force, no history rewrite.

## Safety events

NONE. No product contact, no network egress, no execution or mutation
authority, no publication. No server bound, contract field or sanitizer
changed.
