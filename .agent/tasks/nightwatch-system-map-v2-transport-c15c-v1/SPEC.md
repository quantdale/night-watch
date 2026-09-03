# SPEC — C-15c System Map V2 HTTP Transport + Complete Operator UI

Task ID: nightwatch-system-map-v2-transport-c15c-v1
Phase: SYSTEM_MAP_V2_TRANSPORT_C15C_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 0b62247c512b960715348b637ac99bf68a9f3b49
Predecessor Task ID: nightwatch-derived-semantics-dev-targets-c07-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_SYSTEM_MAP_V2_TRANSPORT_C15C_V1

## Frozen intent

C-15b built the System Map V2 model, its bounded projections and its
deterministic layout, but left them reachable only from inside the process.
C-15c carries them over HTTP and gives the operator a UI that can actually
navigate them, WITHOUT granting the map any authority it does not have.

The map describes. It never executes and never mutates. Every level and every
query answer carries `executionAuthority: NONE` and `mutationAuthority: NONE`,
and the transport adds no verb that could change that.

## Measured baseline

Taken in this session against real workspace data before any UI existed.

| Fact | Value |
|---|---|
| Operations in the projection input | 1,851 |
| `operationPopulationTotal` | `null` — the true population is UNKNOWN |
| L1 nodes / edges | 1 / 0 |
| Layout engine | `nightwatch.layered-layout` 1.0.0 |
| Layout digest stability across repeated calls | STABLE |
| `executionAuthority` / `mutationAuthority` | `NONE` / `NONE` |

### Level limits, as transported

| Level | Node limit | Edge limit |
|---|---|---|
| L1_COMPANY | 64 | 128 |
| L2_PRODUCT | 128 | 256 |
| L3_SERVICE | 256 | 512 |
| L4_OPERATION | 256 | 512 |
| Any query | 1000 | 2000 |

### The two baseline results that decide the honesty requirements

`MUTATION_CAPABLE_ROUTES` truncates, and its remainder is genuinely unknown:

```
nodeBound {"limit":1000,"total":null,"projected":1000,"dropped":null,"truncated":true,"remainingUnknown":true}
```

`total` is null because the upstream population total is null, and `dropped`
is therefore null as well — a drop count needs a total. The UI MUST render both
as "unknown". Rendering either as `0` would tell the operator they have seen
everything, which is the exact opposite of what the projection says.

`OBSERVED_PRODUCTION_PATHS` returns 0 nodes with `measurement: UNMEASURED`.
Zero production observation has occurred and none is authorized, so the empty
result is an ABSENCE OF MEASUREMENT, not a clean bill of health. The UI MUST
say so in words rather than presenting an empty list.

## Acceptance rows

| # | Requirement | Evidence required |
|---|---|---|
| 1 | V2 routes parse under `/api/v2/system-map`; v1 is untouched and not reinterpreted | Router truth table incl. `/api/v1/source/graph` still routing to `sourceGraph` |
| 2 | Unknown level and unknown query segments are rejected, not guessed | `l5` and `/query/made-up` both parse to `unknown` |
| 3 | Traversal and unsafe focus values are rejected | `../etc` rejected; unsafe focus yields `CONTROL_CENTER_PATH_REJECTED` |
| 4 | Focus discipline holds | L1 with a focus → null; L2/L3/L4 without a focus → null |
| 5 | Transport is GET/HEAD only and adds no mutation verb | Server verb test over every V2 route |
| 6 | Every answer carries `executionAuthority: NONE` and `mutationAuthority: NONE` | Assertion over all four levels and all eight queries |
| 7 | ProjectionBound survives the wire with null totals intact | `MUTATION_CAPABLE_ROUTES` bound transported with `total`/`dropped` null and `remainingUnknown` true |
| 8 | The UI renders an unknown total and an unknown drop count as "unknown", never as a number | UI test on the truncation note |
| 9 | An UNMEASURED empty result is labelled as unmeasured, not as clean | UI test on the measurement banner |
| 10 | The operator can navigate L1 → L4 and back, run all eight queries, search, filter, pan, zoom and drive it from the keyboard | UI tests + browser matrix |
| 11 | Layout is deterministic across repeated requests | Repeated-call digest equality |
| 12 | C-10 production-store exclusion is preserved | Prod-store exclusion proof re-run |
| 13 | The C-15c suite is registered in both manifests, so CI actually runs it | Registration check + observed CI skip delta |
