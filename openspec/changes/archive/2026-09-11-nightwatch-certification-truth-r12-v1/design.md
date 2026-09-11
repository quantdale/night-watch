# Design — R-12

## The rule being added

> Every campaign named in the campaign task ledger declares its certification
> suites in one registry; every declared suite exists on disk; every declared
> suite is registered in an authoritative gate lane.

Three conjuncts, one rule, one place.

## Registry

`config/campaign-certification.v1.json`:

```
{
  "schemaVersion": "nightwatch.campaign-certification.v1",
  "lanes": {
    "SYNTHETIC_CAMPAIGN":      "config/synthetic-campaign.v1.json",
    "SEMANTIC_COMPATIBILITY":  "config/semantic-compatibility.v1.json"
  },
  "campaigns": [
    { "id": "C-01", "task": "nightwatch-truncation-truth-discovery-paging-c01-v1",
      "lane": "SYNTHETIC_CAMPAIGN", "suites": [ ... ] },
    ...
  ]
}
```

`lanes` maps a lane id to the manifest that selects its suites, so the checker
resolves registration without knowing any manifest's internal shape twice.

## Lane choice

Both remaining lanes are required gate groups, so either satisfies "the gate
runs it". `SYNTHETIC_CAMPAIGN` is chosen for all six additions because every
existing campaign certification suite (C-10, C-11, C-02b, C-03, C-04, C-15b)
already lives there, and `config/semantic-compatibility.v1.json` is
phase-indexed with a `requiredPhaseRange` of 9..26 — a C-numbered campaign has
no phase number to occupy, so putting it there would require inventing one.

## Totality

The completeness conjunct compares the registry's campaign set against the
directories under `.agent/tasks/` matching `-(c|r)\d+[a-z]*-v\d+$`. That set
is the campaign ledger: real metadata a campaign must create anyway under the
task protocol, and bounded at eleven today.

A campaign with genuinely no certification suite of its own is not silently
skippable: it must appear with an empty `suites` array and a `reason`, so the
absence is a declared fact rather than an omission. This is what makes
"certification-suite metadata cannot silently disappear" mechanical — deleting
a registry entry fails the totality conjunct, and emptying one requires
writing down why.

## Retiring the four loops

`checkC02bProtobufBoundary`, `checkC03GrpcTopologyBoundary`,
`checkC04FrontendConsumerBoundary` and `checkC15bSystemMapBoundary` each end
with a registration loop. Only the loops are removed; every other assertion in
those four functions is a genuine campaign boundary rule and stays. Keeping the
loops beside the registry would leave two authorities for one rule, and the
existing divergence is precisely what R-12 is repairing.

## Why not a filename heuristic

A rule of the shape "every `tests/unit/c*.test.ts` must be registered" would be
a filename heuristic: it would miss C-01's four suites entirely (none is named
`c01*`), and it would misfire on any suite whose name merely starts with `c`.
The task ledger is both more accurate and more meaningful.

## Negative probes

Nine mutations, each expected DETECTED, each restored:

| # | Mutation | Detected by |
|---|---|---|
| 1 | deregister C-02a from its lane | registry lane conjunct |
| 2 | deregister C-06 | registry lane conjunct |
| 3 | deregister C-15b | registry lane conjunct |
| 4 | deregister a C-11 suite | registry lane conjunct |
| 5 | delete a declared suite from disk | registry existence conjunct |
| 6 | drop a campaign entry from the registry | registry totality conjunct |
| 7 | stale active-task status | `agent:check` |
| 8 | stale substantive anchor | `agent:check` |
| 9 | fake campaign status in the machine block | `project:check` |
