# SPEC — C-16 Expected Information Gain + Orphaned Ownership Closure

Task ID: nightwatch-eig-prioritization-c16-v1
Phase: EXPECTED_INFORMATION_GAIN_C16_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 529b02a8d54a951eda1636e144a05a7442238c5b
Predecessor Task ID: nightwatch-spec-derived-expectations-c09-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_EXPECTED_INFORMATION_GAIN_C16_V1

## Frozen intent

Resolve two orphaned requirements that belong to no campaign, then implement a
bounded, deterministic, explainable LOCAL prioritisation that ranks targets and
grants nothing.

A high EIG score is not execution authority.

## The two orphans, from their authoritative definitions

§55 and §61 require the exact original definitions, not invented ones. Both
come from `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` and the
independent review's F-28.

### G-16 — and it is NOT about prioritisation at all

> `G-16` | Stale duplicate figures in durable docs | `"83 / 175 / 45-80-3"`
> reads as current | **one derived figure source** | fix: make the census the
> only writer of these figures; retire superseded narratives | assert: no
> document contains a census figure absent from the current ledger | check:
> doc/ledger equality check in the gate | depends on G-14 | size S

The review's F-28 maps fifteen gaps to campaigns and records that **`G-16` has
no owner**, separately from EIG also appearing in no campaign's scope.

G-16 is a documentation-truth requirement: durable docs must not carry census
figures that the current ledger does not support. It is directly implementable
offline, and it is acutely relevant right now — this overnight campaign has
been writing measured figures into `docs/CURRENT_STATE.md` all night (1,851
operations, 2,114 expectations, 332 scenarios), which is exactly the condition
G-16 exists to police.

### EIG — design §9.2, verbatim

```
EIG = novelty × contract_depth × change_recency × blast_radius
      ÷ (cost + duplicate_risk)
```

with the factors defined as:

- `novelty` — never observed > observed-but-no-oracle > observed-with-oracle
- `contract_depth` — `TYPE`/`COLLECTION` expectations beat `SHAPE` beat
  protocol-only
- `change_recency` — from the source-snapshot diff, which finally gives the
  orphaned change-intelligence layer a consumer
- `blast_radius` — count of frontend consumers and downstream services from
  the system model
- `cost` — budget units
- `duplicate_risk` — prior fingerprints in the same cluster

and the explicit non-goal: **not maximising request volume**; `cost` in the
denominator and per-route budget caps must make a broad shallow sweep score
worse than a deep pass over new contracts.

## Ownership assignment

| Requirement | Previous owner | Assigned owner |
|---|---|---|
| `G-16` one derived figure source | **none** | **C-16** |
| EIG prioritisation (design §9.2) | **none** | **C-16** |

Both are recorded in the master ledger so the orphan rows close.

## Scope

- Assign both orphans explicitly and close their ledger rows.
- Implement EIG with bounded integer factor levels, exact integer ordering,
  explicit UNKNOWN handling, deterministic tie-breaking, and a per-target
  factor breakdown with reason codes.
- Implement G-16 as a doc/ledger figure check.
- Prove EIG grants no authority.

## Non-goals

- No floating-point score. §56 forbids blindly encoding the arbitrary
  multiplicative formula, and a float score would also make ordering depend on
  rounding.
- No wall-clock recency. §60 forbids age from an unverifiable value.
- No admission, execution, credential or environment authority of any kind.
- No target-selection change in this campaign: EIG may ORDER what safety has
  already admitted, and may never widen it.

## Absolute invariants

- `UNKNOWN` for any factor is an explicit level that neither maximises nor
  zeroes the score. A zero would silently eliminate a target and a maximum
  would silently promote one; both are wrong for "we do not know".
- Identical source snapshot, evidence and configuration yield an IDENTICAL
  ranking, including tie order.
- No timestamp participates in the score unless it is bound to source-change
  evidence.
- A high score grants nothing: not admission, not DEV execution, not
  production, not replay, not credentials, not environment access.
- Every ranked entry carries its factor breakdown; there is no unexplained
  global number.
- The result is bounded and reports its truncation.

## Acceptance

1. `G-16` and EIG both have an explicit owning campaign, from their
   authoritative definitions, with the master ledger rows closed.
2. EIG is deterministic: the same inputs produce byte-identical rankings, and
   tie-breaking is defined and stable.
3. Missing facts are safe: `UNKNOWN` neither maximises nor zeroes, proven per
   factor.
4. The ranking is explainable: every entry carries factor levels and reason
   codes.
5. The ranking grants no authority, proven by probe.
6. Duplicate risk demotes: a repeatedly observed, already-understood surface
   ranks below a genuinely novel deep surface when the rest is comparable.
7. Novelty and contract depth behave as §9.2 defines, including that
   `TYPE`/`COLLECTION` beats `SHAPE` beats protocol-only.
8. Change recency consumes source-change evidence, never wall-clock age.
9. A broad shallow sweep scores worse than a deep pass over new contracts.
10. G-16 is implemented: no durable document carries a census figure the
    current ledger does not support, and the check bites.
11. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
    exact-head CI PASS; `siblingWrites` 0; session released.

## Declared Deletions

None.
