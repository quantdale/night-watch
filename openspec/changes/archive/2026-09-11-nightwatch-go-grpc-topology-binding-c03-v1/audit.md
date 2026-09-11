# Audit — C-03, before implementation

Audited at `03bab54e0758bb9aa4e9a44dacd7eb863e254e16` against the working tree
and the pinned sibling checkouts.

## A-1 — At the current budget, C-03 has no input whatsoever

`mobingilabs/ouchan` is configured with `maxFiles: 1024` over roots
`['services', 'pkg']`. Measured: the walk enumerates 857 entries, reports
`TRUNCATED` with `SOURCE_FILE_COUNT_EXCEEDED`, and enumerates **zero** of the
twelve registration daemons. Not "few" — zero.

Two mechanics combine to produce that. `canConsider` in `siblingSource.ts`
increments its counter for *every* considered directory entry, including
excluded directories and unsupported extensions, so a root costs its whole
tree rather than its useful files. And `createRealSourceScanConfig` sorts the
root list, so `pkg` (1,080 entries) is always walked before `services`.

Consequence: without a budget correction this campaign could only report that
it found nothing, and that finding would be about Nightwatch's own
configuration rather than about Alphaus.

## A-2 — COMPLETE enumeration of ouchan is unreachable, and that is a contract
limit rather than a tuning problem

Measured across variants:

| maxFiles | roots | state | examined | daemons visible |
|---|---|---|---|---|
| 1,024 | services, pkg | TRUNCATED | 857 | 0 of 12 |
| 4,096 | services, pkg | TRUNCATED | 3,156 | 8 of 12 |
| 4,096 | services | COMPLETE | 2,623 | 12 of 12 |

`MAX_SIBLING_SOURCE_SCAN_FILES` is 4,096 and a full walk of both roots needs
more considered entries than that. So no per-repository setting can make
ouchan COMPLETE.

The third row is a trap worth naming. Narrowing the roots to `services` does
produce a COMPLETE enumeration and all twelve daemons — by looking at less.
It would also drop `pkg/sapphire/proto/v1/types.proto`, the zero-service
negative case C-02b relies on. Buying a completeness claim by shrinking the
observed set is precisely the trade the operating principles forbid, so this
campaign raises the budget to the ceiling, keeps both roots, and reports
TRUNCATED.

## A-3 — The `≥12` acceptance was unreachable before the owner decision

C-02b admitted only `blueapi/billing`, so exactly one proto service existed as
a fact. Of the 17 production registrations, 15 name a blueapi proto service —
but fourteen of those services live in unadmitted roots. The maximum provable
yield was 1.

The owner was asked and chose to admit the fourteen further roots on the C-02a
precedent. Recorded here because an acceptance criterion that only becomes
reachable through a scope decision must not look, later, as though it were
always satisfiable.

## A-4 — Test-file registrations exist and are real

`pkg/exportcostfilters/sync_test.go` and
`pkg/exportcostfilters/exportcostfilters_test.go` both call
`cost.RegisterCostServer(...)` against stub servers. If test files were not
excluded, `Cost` would acquire two extra "implementations" that serve nothing.
The exclusion is a required behaviour with a live corpus, not a hypothetical.

## A-5 — `blued` proves that daemon and service are not one-to-one

`services/blued/main.go` registers six proto services: `Organization`, `Iam`,
`Operations`, `Preferences`, `Admin` and `Flags`. Any model that assumes one
service per daemon, or that keys a binding by daemon directory, is wrong on
the largest daemon in the repository. The join is per registration call site.

## A-6 — Two registrations name no blueapi service at all

`MetricsControlPlane` and `WebToolControlPlane` are registered but have no
proto in the approved universe. They must resolve to an explicit non-proven
state, and specifically not to `MISSING` in a way that reads as "this service
does not exist" — the honest statement is that no proto fact for it is
observable here.

## A-7 — Adding 443 operations re-arms the F-27 eviction hazard

C-02b added 147 and found DEF-C02B-1. This change adds 443 more, so the
evidence-class-scoped ambiguity fix becomes load-bearing for the whole proto
surface rather than for one file. `gc` carries 46 RPCs against 48
`google.api.http` occurrences, so real `additional_bindings` enter the corpus
for the first time and the AMBIGUOUS path stops being synthetic-only.
