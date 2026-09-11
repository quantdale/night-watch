# Proposal — C-08 Deployment-Fact Binding

## Why

Nightwatch knows 1,851 operations and, for almost all of them, has no recorded
answer to "where does this run". The absence is not marked as an absence: the
field simply is not there, so nothing distinguishes an operation whose
deployment was investigated and found unknowable from one nobody looked at.

That matters because the next campaigns in the programme want to make requests.
An unrecorded unknown is the shape a guess hides in.

## What changes

Every operation gains a deployment-binding record. The record is an explicit
three-hop CHAIN rather than a single flat verdict:

```
route ──▶ host ──▶ kubernetes service ──▶ deployed?
```

because the useful output of this campaign is knowing exactly which hop is
missing, and a flat `UNKNOWN` cannot tell "not investigated" from "blocked at
hop three by a repository we cannot read".

## What the evidence actually supports

Established read-only before designing anything.

**The `mochi` deployment manifests are not locally available.** Verified four
independent ways: no repository named `mochi` at depth ≤ 2, no `ingress.yaml`
anywhere under the sibling root, no `appproxy` or `serviceproxy` directory, and
no `remote.origin.url` mentioning mochi across ~160 repositories. The two
`mochi*` paths that exist are `blueinternal/mochi/v1` and
`blue-internal-go/mochi/v1` — protobuf for a SERVICE named mochi, not the
manifest repository.

So **U-1** (which Kubernetes service serves `/m/ripple/*` and `/m/blue/*` per
environment) and **U-2** (whether five named `ouchan` services are still
deployed) both remain UNKNOWN, carrying
`C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`. §37 says that is correct, and C-08
does not infer around it.

**`ouchan/build/config.yaml` is real deployment configuration** and supports a
NEGATIVE fact: a service excluded from the build on branch `production` is not
built or deployed to production from this repository at this revision. It does
not support the positive direction, because `build_all: false` means
non-exclusion implies eligibility, not deployment.

**`ripple-ui/src/config/common.js` is the host matrix, and it is a SOURCE
fact.** It states what the frontend is configured to CALL. What the
infrastructure SERVES is a different claim. Calling it `DEPLOYMENT_FACT` would
be precisely the error §34 forbids — an expected architecture asserted without
current deployment evidence.

## The uncomfortable consequence, stated rather than engineered away

With the manifests unavailable, the positive route → endpoint
`DEPLOYMENT_FACT` count may legitimately be **zero**. C-08 reports that. The
one failure this campaign must not commit is manufacturing a
`DEPLOYMENT_FACT` out of client configuration so that a number looks better,
and the acceptance criteria are written so that doing so would fail rather
than pass.

## What does not change

C-08 is information. It grants no request authority of any kind, and no
existing request authority is altered by the presence of a deployment fact.
There is no cluster read, no kubectl, no cloud API, no credential search and no
secret-store access; `ouchan/kubeconf-dev.yaml` is deliberately not read. Zero
runtime contact.
