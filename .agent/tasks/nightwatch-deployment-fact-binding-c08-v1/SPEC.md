# SPEC — C-08 Deployment-Fact Binding

Task ID: nightwatch-deployment-fact-binding-c08-v1
Phase: DEPLOYMENT_FACT_BINDING_C08_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Predecessor Task ID: nightwatch-universe-admission-hygiene-c05-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_DEPLOYMENT_FACT_BINDING_C08_V1

## Frozen intent

Give EVERY source operation a deployment-binding classification, so that "we
do not know where this runs" is a recorded fact rather than an absent field.
A service name is not a deployment fact.

## Measured evidence survey

Conducted read-only at `43cff07`. This is the part that decides what C-08 can
honestly claim, so it was established before any design.

### The mochi manifests are NOT locally available

U-1 and U-2 both require `mochi`'s
`services/{env}/{appproxy,serviceproxy}/ingress.yaml`. Verified absent four
independent ways:

| Check | Result |
|---|---|
| a repository named `mochi` at depth ≤ 2 under the sibling root | none |
| any `ingress.yaml` anywhere under the sibling root | none |
| any `appproxy` or `serviceproxy` directory | none |
| `remote.origin.url` mentioning mochi across ~160 repositories | none |

The two paths matching `mochi*` are `alphauslabs/blueinternal/mochi/v1` and
`alphauslabs/blue-internal-go/mochi/v1` — protobuf/API subdirectories for a
SERVICE called mochi, not the deployment-manifest repository. So C-08b is
`C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, and U-1 and U-2 stay UNKNOWN here.
That is the correct outcome, not a shortfall.

### What IS locally available, and what each is actually worth

**`mobingilabs/ouchan/build/config.yaml` — genuine deployment configuration.**
It declares which services are EXCLUDED from the build, per branch, with the
branch set `qa` / `next` / `production` naming environments, plus
`build_all: false` meaning "build modified services only". This supports a
NEGATIVE deployment fact: a service excluded on branch `production` is not
built or deployed to production from this repository at this revision. It does
NOT support the positive direction — not being excluded means eligible to be
built, not currently deployed.

**`mobingilabs/ripple-ui/src/config/common.js` — the host matrix, and it is a
SOURCE fact, not a deployment fact.** It maps route prefixes to hosts per
environment (`/m/ripple/*` and `/m/blue/*` → `api` / `apinext` / `apidev`
`.alphaus.cloud`). This is committed CLIENT configuration: it says what the
frontend is configured to CALL, which is not the same claim as what the
infrastructure SERVES. Classifying it `DEPLOYMENT_FACT` would be exactly the
error §34 forbids — an expected architecture asserted without current
deployment evidence.

**`ouchan/kubeconf-dev.yaml` exists and is deliberately NOT used.** Reading a
cluster is forbidden by the owner scope freeze and by C-08's own boundary. Only
its top-level key shape was observed, and no value was read.

### Consequence, stated plainly

With the manifests unavailable, the route → runtime-endpoint chain breaks at a
known place:

```
route  ──SOURCE_FACT──▶  host (client config)  ──UNKNOWN: U-1──▶  k8s service  ──UNKNOWN: U-2──▶  deployed?
```

So the honest achievable outcome is that positive `DEPLOYMENT_FACT` bindings
for the route → endpoint chain may legitimately be **zero**, with negative
build-exclusion facts where the build config supports them. A count is an
observation. Manufacturing `DEPLOYMENT_FACT` from client configuration to make
the number non-zero is the one failure this campaign must not commit.

### U-2, partially informed but still UNKNOWN

Of the five services U-2 names, source presence in `ouchan/services/` is:
`rbac` PRESENT, `user` PRESENT, `openid-connect-server` PRESENT,
`gateway` ABSENT, `safe-box` ABSENT.

Source absence is a SOURCE_FACT that CONSTRAINS deployment without settling
it — an absent service cannot be deployed from this revision, but could still
be running from an older image. Source presence settles nothing at all. U-2
therefore remains UNKNOWN, with that source-presence observation recorded
beside it and labelled as what it is.

## Baseline population

1,851 operations across five contributing repositories (blueapi 1,181,
ouchan 341, ripple-api 223, wave-api 55, blueinternal 51), with 131 services
in `ouchan/services/`.

## Scope

- A binding record for EVERY operation — no silent absence.
- A fact-class and state vocabulary reusing C-15b's `FACT_CATEGORIES`.
- Deployment evidence identity carrying artifact, SHA, path, extractor version
  and digest, so a changed artifact makes a binding STALE rather than
  silently rebinding it.
- Consumption of C-03's proven service topology without rewriting it.
- A totality regression: a new operation with no deployment classification
  fails the suite.
- U-1 and U-2 recorded as explicit unknowns with their blocker.

## Non-goals

- No inference of U-1 or U-2, and no brute-forcing access to the manifests.
- No cluster, kubectl, cloud API, credential search or secret-store read.
- No new execution or request authority: C-08 is information only.
- No `DEPLOYMENT_FACT` from name similarity, route-prefix similarity, a guessed
  hostname, historical familiarity, or a document describing an expected
  architecture.

## Absolute invariants

- A join is never stronger than its weakest input; `INFERENCE` never becomes
  `DEPLOYMENT_FACT`.
- UNKNOWN is never rendered as zero, and an unmeasured chain hop is never
  reported as measured.
- Deployment facts grant NO request authority of any kind.
- Zero runtime contact: no production, NEXT or DEV request is issued.

## Acceptance

1. Every one of the 1,851 operations carries a deployment-binding record.
2. No operation is silently missing a classification; totality is enforced by
   a regression that fails when one is absent.
3. Every `DEPLOYMENT_FACT` traces to deployment evidence, and each forbidden
   basis is negative-probed.
4. U-1 and U-2 are explicit UNKNOWNs carrying
   `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, never inferred.
5. Deployment evidence identity is complete, and a changed artifact yields
   STALE rather than a silent rebind.
6. C-03 topology is consumed, not rewritten.
7. C-08 grants no execution or request authority, proven by probe.
8. Zero runtime contact.
9. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
   exact-head CI PASS; `siblingWrites` 0; session released.

## Declared Deletions

None.
