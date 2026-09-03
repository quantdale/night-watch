# Design — C-08

## Why a chain and not a verdict

The obvious model is one field per operation: `deploymentBinding:
DEPLOYMENT_FACT | INFERENCE | UNKNOWN`. It is wrong here, because it destroys
the only information C-08 can actually produce.

Route → runtime endpoint is three hops, and they fail differently:

```
route  ──▶  host  ──▶  kubernetes service  ──▶  deployed?
        (1)        (2)                     (3)
```

Hop 1 is establishable from committed source. Hops 2 and 3 need a repository
that is not available. A flat `UNKNOWN` for the whole chain cannot distinguish
"nobody looked" from "hop 1 is established, hops 2-3 are blocked on
`C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`". The second statement is useful and
the first is an admission of nothing, so the model keeps the hops.

This is also what makes `PARTIAL` a real state rather than a hedge: a chain
with hop 1 established and hop 2 unknown is PARTIAL, and PARTIAL is the
expected steady state of this campaign.

## States

| State | Meaning |
|---|---|
| `EXACT` | every hop established from admissible evidence |
| `PARTIAL` | at least one hop established, at least one not |
| `UNKNOWN` | no hop established, and the reason is recorded |
| `UNSUPPORTED` | the operation's shape cannot carry this binding at all |
| `STALE` | evidence existed and its artifact has since changed |
| `AMBIGUOUS` | evidence resolves to more than one answer |

`AMBIGUOUS` and `UNKNOWN` are deliberately different: one means the evidence
disagrees with itself, the other that there is none. Collapsing them would hide
a contradiction inside an absence.

## What may become a DEPLOYMENT_FACT

Exactly one local source qualifies, and only in the negative direction.

`ouchan/build/config.yaml` declares per-branch build EXCLUSIONS over
`qa` / `next` / `production`. An exclusion proves the service is not built or
deployed to that environment from this repository at this revision. That is
deployment configuration, not a naming coincidence, so it is admissible.

Non-exclusion is NOT the converse. `build_all: false` means "build modified
services only", so a non-excluded service is merely ELIGIBLE. Treating
eligibility as deployment would be an inference wearing a fact's label.

Explicitly refused as bases, each with a negative probe:

- service name similarity
- route prefix similarity
- a guessed hostname
- historical familiarity
- a document describing an expected architecture without current evidence
- **client configuration** — the case that actually arises here

The last is the one a well-meaning implementation gets wrong.
`ripple-ui/src/config/common.js` looks authoritative: it is committed, current,
and names real hosts per environment. But it states what the FRONTEND CALLS.
What the infrastructure serves is a different proposition, and the gap between
them is exactly where a stale or rerouted deployment hides. It is admitted as
`SOURCE_FACT`.

## Consequence: zero is a legitimate answer

With the manifests unavailable, the positive route → endpoint
`DEPLOYMENT_FACT` count may be zero. The acceptance criteria are written so
that reporting zero PASSES and manufacturing a non-zero count from client
configuration FAILS. A count is an observation; §34 is a rule.

## Evidence identity and currentness

Every evidence record carries `{ repoId, sourceSha, path, extractorVersion,
digest }`. The digest is over the normalized extracted structure, not the raw
bytes, so reformatting does not invalidate a binding while a semantic change
does.

On a digest mismatch the binding becomes `STALE`. It is never silently
rebound, because a rebind would let a changed deployment artifact inherit the
authority of the binding it replaced — the same "evidence is never upgraded in
place" rule the rest of the system already holds.

## Totality, enforced the way R-12 taught

Not by asking each call site to remember a field, but by construction: one
function takes the operation population and returns a binding for every
member, and a check asserts the two counts are equal. R-12's lesson was that a
rule each author must remember to apply is a convention; this one cannot be
forgotten because a missing binding is a count mismatch.

## No authority

A deployment fact is information. The probe set includes an explicit check that
no request-authority surface consults the binding module, so that a future
change cannot quietly make "we know where it runs" into "we may call it".

## Negative probes

| # | Mutation | Expected |
|---|---|---|
| 1 | derive a DEPLOYMENT_FACT from the host matrix | DETECTED |
| 2 | derive one from service-name similarity | DETECTED |
| 3 | treat build non-exclusion as deployment | DETECTED |
| 4 | infer U-1 instead of recording UNKNOWN | DETECTED |
| 5 | infer U-2 from source presence | DETECTED |
| 6 | drop an operation's binding | DETECTED by totality |
| 7 | silently rebind after a digest change | DETECTED, must be STALE |
| 8 | collapse AMBIGUOUS into UNKNOWN | DETECTED |
| 9 | let a join exceed its weakest input | DETECTED |
| 10 | give the binding module request authority | DETECTED |
