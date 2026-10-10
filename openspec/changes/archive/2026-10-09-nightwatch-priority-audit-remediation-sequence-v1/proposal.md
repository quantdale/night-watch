## Why

The exhaustive repository audit produced forty-five strict-valid remediation
changes, but planning completion is not implementation. Five High/Medium
findings — NW-AUD-010 release evidence lineage, NW-AUD-014 child-process
boundary totality, NW-AUD-019 private-payload structural screening, NW-AUD-018
authenticated evidence minimization, and NW-AUD-020 semantic request
admission — remain unimplemented on live source while claiming boundaries that
current code does not enforce. The owner has authorized a single serial
implementation campaign for exactly these five, in a fixed order that places
structural privacy primitives before authenticated-evidence reuse and places
the largest runtime-blast-radius change last.

## What Changes

- Establish one umbrella implementation campaign
  (`nightwatch-priority-audit-remediation-sequence-v1`) that owns C-00
  orchestration, cross-phase integration audit, and final certification for
  the five named remediations.
- Implement NW-AUD-010 through its existing OpenSpec identity:
  exact-checkpoint evidence binding, categorical Git lineage, snapshot-bound
  HEAD, effective-state certification, verdict digest, synthetic Git matrix,
  and non-vacuous mutations.
- Implement NW-AUD-014: total invocation-based child-process census, closed
  execution profiles, minimal explicit environments, offline acquisition
  policy, and deadline/output/termination bounds.
- Implement NW-AUD-019: structural private-payload validation as primary
  authority, closed family schemas/safe DTOs, total writer/reader consumer
  census, bounded text defense-in-depth, and adversarial corpus.
- Implement NW-AUD-018: provenance-bound route identity, one total typed
  persistence firewall for every authenticated writer, authenticated-mode
  transition integrity, and safe publication (reusing Phase 3 structural
  primitives where architecture permits without merging the policy domains).
- Implement NW-AUD-020: pre-effect semantic request admission with immutable
  admission handles, finite initialization exemptions, causal generations
  instead of a fixed intent timer, and transport-total enforcement across
  Playwright route, CDP redirect, WebSocket, relay, and L5 proxy with
  zero-upstream refusal proof.
- After Phase 5, run a cross-phase integration audit, one full certification,
  honest OpenSpec/task closure for all five changes, and the C-00
  integrate/release/remove lifecycle.

## Capabilities

### New Capabilities

- `priority-audit-remediation-sequence`: Defines the umbrella campaign's
  serial phase order, per-phase admission gates, cross-phase integration
  audit, single final certification, and terminal stop condition for the five
  owner-authorized audit remediations.

### Modified Capabilities

None at the umbrella layer. Each remediation continues to own its own
capability delta under its existing OpenSpec change
(`release-evidence-lineage-integrity`, `child-process-boundary-totality`,
`private-payload-screening-structural-integrity`,
`authenticated-evidence-minimization-integrity`,
`semantic-request-admission-integrity`).

## Impact

- Affects Nightwatch source, tests, hardening rules/probes, schemas, and
  synthetic fixtures across release certification, child-process tooling,
  private artifacts, authenticated evidence, and browser/API admission
  surfaces, plus umbrella and per-change continuity records.
- Does not contact Alphaus DEV/NEXT/production, use real credentials or
  customer data, mutate sibling repositories, publish externally, force-push,
  or rewrite history.
- Does not authorize any audit remediation beyond the five named; remaining
  findings stay enumerated backlog.
