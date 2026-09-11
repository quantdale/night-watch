# Design — C-15c

## Route shape

```
/api/v2/system-map/{l1|l2|l3|l4}[?focus=<id>]
/api/v2/system-map/query/{one of eight segments}[?focus=<id>]
```

V2 segments are matched BEFORE the v1 prefix check. An unrecognised level or
query segment parses to `unknown` — never to a nearest match, because guessing
which map the operator meant is how a description becomes a fabrication.

The query allowlist is exactly `['focus']`. Path traversal is rejected before
any lookup.

## Focus discipline

L1 is the company; a focus makes no sense there, so L1 with a focus returns
null. L2, L3 and L4 are each a view of something, so each without a focus
returns null. Both are null rather than an empty map, so the server answers
`CONTROL_CENTER_NOT_FOUND` rather than an empty success — an empty success is a
claim, and this is a malformed request.

## Bounds

| Level | Nodes | Edges |
|---|---|---|
| L1_COMPANY | 64 | 128 |
| L2_PRODUCT | 128 | 256 |
| L3_SERVICE | 256 | 512 |
| L4_OPERATION | 256 | 512 |
| Query | 1000 | 2000 |

`ProjectionBound.total` and `.dropped` are BOTH nullable on the wire. That is
deliberate and it is the hardest constraint in this change: when the upstream
population is unknown, the number of dropped items is unknowable, and the wire
type must be able to say so. A non-nullable number would force the transport to
invent one.

## Progressive disclosure is a transport property, not a UI trick

The client asks for exactly the level it is displaying. There is no
whole-company payload fetched up front and filtered in the browser. A client
that cached everything would have the same privacy and scale profile as an
unbounded API no matter how little it drew on screen.

## Rendering rules the UI may not violate

- `total === null` renders "unknown". Never `0`.
- `dropped === null` renders "unknown". Never `0`.
- `truncated` with `remainingUnknown` says the remainder is unknown.
- `measurement === 'UNMEASURED'` gets a banner distinguishing "not measured"
  from "measured and clean".
