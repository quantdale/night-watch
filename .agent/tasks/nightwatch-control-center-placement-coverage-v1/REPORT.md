# REPORT — nightwatch-control-center-placement-coverage-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-control-center-placement-coverage-v1
Status: COMPLETE

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced.

## Campaign identity

- Task: `nightwatch-control-center-placement-coverage-v1`
- Session branch: `session/nightwatch-control-center-placem-f8abc223`
- Session identity: `sess-36f4ca096045`
- Starting SHA: `ceb8fe21f9dd90666190c9272030a0dbfabc458f`
- Scope: P-01 through P-05 as registered in the OpenSpec `audit.md`.

## M0 — execution truth

Owned session created and claimed on base `ceb8fe2`. `session:status` verdict
PASS with all seven workspace invariants PASS. Predecessor
`nightwatch-control-center-ui-completion-v1` re-verified terminal COMPLETE.
Planning route written and committed.

## M1 — the placement guard

The name-level assertion in `ui/control-center/src/contractCoverage.test.ts`
was replaced by the carrier model. For each `function` component the guard
builds a carrier text: the component body plus the bodies of functions it
invokes with explicit type arguments, so `usePagedCollection<RunListSnapshot,
…>` makes the shared collection part of every view that binds it. Carriage
closes transitively over containment: `SafetyView` never names
`SafetySnapshot`, but it carries `OverviewSnapshot` and reads `safety`, so it
carries the nested contract.

Before the repairs the guard failed on exactly the 16 fields the audit
measured. Two mutations were run and restored:

| Mutation | Result |
| --- | --- |
| `{surface.repositoryId}` replaced with `{surface.surfaceId}` | FAIL on exactly `SourceSurfaceSnapshot.repositoryId`; restore passes 4/4 |
| the `truncated` property removed from the hook's return | FAIL on exactly the four paged `truncated` fields; restore passes 4/4 |

A weaker mutation that kept the word but changed its role still passed: the
check is name-scoped inside a carrier by design, and its header says so.

## M2 — render the exposed fields

All 16 gaps closed, each in a carrier of its contract:

| Field | Rendered in |
| --- | --- |
| `HealthSnapshot.status` | Safety Center service panel (`Service status`) |
| `MetaSnapshot.service`, `.executionAuthority`, `.mutationAuthority`, `.limits` | Safety Center service panel and the declared-limits grid |
| `ReadinessSnapshot.status`, `SafetySnapshot.status` | readiness detail and Safety Center owner-scope rows |
| paged `truncated` (four lists) | M3 |
| `ExecutionGraphSnapshot` edge `proof` | new execution-graph edge inventory |
| `CampaignSummarySnapshot.ownerScopeStatus`, `.ownerScopeReason` | Campaign Intelligence owner panel, replacing the hardcoded row |
| `CampaignCoverageSnapshot` row `gapReasons` | coverage matrix row note |
| `SourceSurfaceSnapshot.repositoryId` | source surface row |

`passed` and `layer` remain exempt with reasons. The placement guard passes
with exactly five exemptions, and its exempt assertion fails if any of them
becomes rendered.

## M3 — paged truncation disclosure

`PagedSnapshot<T>` gained `page.truncated`; `PagedCollection` exposes
`truncated`; `usePagedCollection` reads the declared field (never infers it
from `nextCursor`); `LoadMoreControl` states the server truncation beside the
continuation control. The regression pages a truncated list through to its
complete end and asserts the statement appears, the control remains, then the
statement disappears and `All loaded.` is stated by the final page.

## M4 — source-graph undrawn-edge parity

`SourceGraphCanvas` counts edges whose endpoints are outside the projection,
the footer reports `drawn of received`, and a disclosure callout names the
count and attributes it to the projection. The source regression now carries
one endpoint-less edge and asserts `1 of 2 edges · depth 2 · zoom 1.00x` and
`1 edge(s) reference a node outside this projection`, matching the execution
graph's wording.

## M5 — placeholder coverage and declared limits

`PlaceholderView` is exported and rendered directly by a test that asserts the
view it stands in for and `Snapshot not connected`. The Source Intelligence
limits card reads `meta.limits.maxGraphNodes` / `.maxGraphEdges` and a
regression asserts `1000 / 2000` from the declared fixture; the hardcoded
`250 / 500` default-as-maximum is gone.

## M6 — certification

`gate:local` returned all eleven groups PASS at the implementation commit
`51da8c411dc7ebe0ec2929e456235777e2c009f2`, receipt
`receipt:sha256:c3dd3cf51709c4fe02f5ba1f`: SEMANTIC_COMPATIBILITY
2083/2070/13/0, OWNER_PROVENANCE 91, SYNTHETIC_CAMPAIGN 1797/1797/0 with
`deepContainmentLane: PROVEN`. UI typecheck, 58 of 58 tests and the build
passed before the gate; root typecheck, `hardening:check` and
`validation:universe` passed; the browser workflow lane passed 4/0 in 4.1
minutes.

## Integration

Performed by fast-forward from the owned session per the campaign's Git and
reporting contract, with `HEAD == origin/main` verified after the push
(`SESSION_INTEGRATED`). No force, no history rewrite.

## Safety events

NONE. No product contact, no network egress, no execution or mutation
authority, no publication. No server bound, contract field or sanitizer
changed.
