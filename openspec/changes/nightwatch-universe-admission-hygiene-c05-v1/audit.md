# Audit — C-05

Audited read-only at `210cd0c8732a7ea5ba5aa5b7eef146d4f001d277`, before any
implementation. No sibling repository was written to.

## Discovery census

Sibling root `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES`, 6 top-level
entries (`alphauslabs`, `mobingilabs`, `nightwatch`, plus three
sibling-root-shaped leftovers noted below). **149** git repositories at depth
≤ 3. **6** admitted, **143** discovered and unapproved.

Admitted today: `mobingilabs/ripple-ui`, `mobingilabs/ripple-api`,
`mobingilabs/ouchan`, `alphauslabs/blueapi`, `alphauslabs/blue-sdk-go`,
`alphauslabs/grpc-chunk-parser`.

## Admission authority

`src/core/source/approvedScan.ts` computes

```
PHASE25_APPROVED_REPOSITORY_IDS =
  RIPPLE_REPOSITORIES.filter(scope === 'IN_SCOPE' && APPROVED_ROOTS[repoId] !== undefined)
```

so membership requires agreement between `src/core/changeIntelligence/map.ts`
and the local `APPROVED_ROOTS` literal. Neither file is the authority; the
authority is an unstated intersection. There is no discovery concept.

## Source population

`nightwatch-intelligence source-gaps`:

| Measure | Value |
|---|---|
| operations | 1,745 |
| blueapi / ouchan / ripple-api | 1,181 / 341 / 223 |
| limit / dropped / truncated | 4,096 / 0 / false |
| enumeration | **TRUNCATED**, 4,655 examined, `totalFiles: null`, limit 12,288 |
| contentRead | COMPLETE — 4,655 candidates, 4,087 read, 4,052 admitted, 0 unreadable |
| population state / coverageState | UNKNOWN / UNKNOWN, `remainingUnknown: true` |

Three of the six admitted repositories contribute operations; `ripple-ui`,
`blue-sdk-go` and `grpc-chunk-parser` contribute other fact classes.

## Persisted mutable Git state

Compared against live Git, local refs only, no fetch:

| Field class | Fields | Result |
|---|---|---|
| checkout-local | `checkedOutSha`, `branch`, `dirty` | 18/18 accurate |
| remote-tracking | `trackingSha`, `ahead`, `behind` | **10/18 diverged** |

| Repository | persisted `behind` | live `behind` |
|---|---|---|
| `mobingilabs/ouchan` | 25 | **310** |
| `mobingilabs/ripple-ui` | 21 | **74** |
| `alphauslabs/blueapi` | 2 | **15** |
| `mobingilabs/ripple-api` | 0 | **12** |
| `alphauslabs/blue-sdk-go` | 1 | **6** |
| `alphauslabs/grpc-chunk-parser` | 0 | 0 |

The finding is precise: the fields describing the checkout are accurate because
the working copies have not moved, and the fields describing the relationship
to a remote have decayed because the remotes did. Nothing detects it. So the
defect is a missing divergence check, not a stale value — stating it as "the
data is stale" would be false today.

## Unapproved-read evidence

The current guarantee is expressed as `operations = 0` for unapproved
repositories. That is an output property. `src/core/source/siblingSource.ts` is
the single read path and is path-confined, but it keeps no per-repository read
ledger, so no evidence exists that a read was never ATTEMPTED.

## Admission target: alphauslabs/blueinternal

Present. `openapiv2/apidocs.swagger.json`, 111,416 bytes, Swagger 2.0, title
"Blue Internal API reference": **46 paths, 51 operations** (21 GET, 25 POST, 3
DELETE, 2 PUT), all 51 carrying an `operationId`, **84 definitions**.

The historical `~57` estimate is HISTORICAL and is refuted by measurement. The
existing `parseOpenApiRoutes` consumed `blueapi/openapiv2` in C-02a, so no new
parser is required.

## Admission target: wave-api

Its exact identity from workspace truth is **`mobingilabs/wave-api`** — NOT a
top-level `wave-api` directory. This matters because §28 requires the identity
be established from workspace truth, and the literal name does not resolve.

PHP: 59 `.php`, 2 `.yaml`, 1 `.json`. HEAD `46790c25`, branch `master`. Its
layout is identical to the already-admitted `mobingilabs/ripple-api`:

```
src/App/Route/Config/Routing.yaml
src/App/Handler/            src/App/Middleware/
src/App/Route/Providor/     src/App/Core/{Dao,Enum,Utility,Factory}
```

Its route keys use the same quoted `"get:/path":` form with `action:`,
`class:`/`client:` children that the existing YAML parser already consumes; the
only difference is 2-space rather than 4-space indent, and the parser is
indent-relative. **55 route keys**, against ripple-api's 223.

So the justified root is `src`, the existing parser applies unchanged, and the
C-06 PHP read-only-proof pipeline should apply for the same structural reason.

## Observation, outside C-05's authority

Three sibling-root-shaped directories sit beside the real org directories:
`nightwatch-isolated-20-sibling-root`,
`nightwatch-isolated-20-final-sibling-root`, and
`nightwatch-reliability-yield-and-state-protocol-v1`. They appear to be
campaign or test fixture roots that were not torn down, but they may equally be
deliberately pinned fixtures. They are OUTSIDE the Nightwatch repository, so
C-05 reports them and changes nothing; classification belongs to R-13 §105 and
no removal is authorized here.
