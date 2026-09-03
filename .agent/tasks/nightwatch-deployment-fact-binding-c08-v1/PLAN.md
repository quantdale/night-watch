# C-08 Deployment-Fact Binding

## Purpose

After C-08, every operation Nightwatch knows about carries an explicit answer
to "where does this run, and how do we know" — including, for most of them,
the answer "we do not know, and here is exactly which hop is missing and why".
An absent field becomes a recorded unknown.

## Starting State

Task `nightwatch-deployment-fact-binding-c08-v1`; starting SHA
`43cff07af2fe2c943ca62154ad01f185602a41d9`; predecessor
`nightwatch-universe-admission-hygiene-c05-v1` COMPLETE, certified at CI run
`33796281169`.

Established by measurement and not to be rediscovered:

- 1,851 operations: blueapi 1,181, ouchan 341, ripple-api 223, wave-api 55,
  blueinternal 51. 131 services in `ouchan/services/`.
- The `mochi` manifests are NOT locally available, verified four independent
  ways. C-08b is `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`.
- `ouchan/build/config.yaml` is real deployment configuration and supports a
  NEGATIVE fact (excluded from the build on a branch ⇒ not deployed to that
  environment). It does not support the positive direction.
- `ripple-ui/src/config/common.js` is the host matrix and is CLIENT
  configuration: a SOURCE fact about what the frontend calls, not a deployment
  fact about what the infrastructure serves.
- U-2's five services: `rbac`, `user`, `openid-connect-server` present in
  source; `gateway`, `safe-box` absent. Presence settles nothing; absence
  constrains without settling.
- C-15b already defines `FACT_CATEGORIES` = SOURCE_FACT, DEPLOYMENT_FACT,
  RUNTIME_FACT, OBSERVATION, INFERENCE, with a strength ordering used for
  joins. C-08 reuses it rather than inventing a parallel vocabulary.

## Scope

Binding record per operation; evidence identity with currentness; consumption
of C-03 topology; totality regression; explicit U-1 and U-2.

## Non-Goals

No inference of U-1 or U-2; no access brute-forcing; no cluster or cloud read;
no new request authority; no `DEPLOYMENT_FACT` from similarity or documents.

## Safety Constraints

Zero runtime contact — no production, NEXT or DEV request. No kubectl, cloud
API, credential search or secret-store read. `ouchan/kubeconf-dev.yaml` is not
read. Sibling repositories stay read-only; `siblingWrites` 0. All
implementation inside the owned session worktree
`session/nightwatch-deployment-fact-bindi-9d9f8b7b`.

## Architecture / Approach

A new pure module `src/core/source/deploymentBinding.ts`, data-only like the
rest of the source-policy layer, producing one `DeploymentBinding` per
operation:

```
operation ─▶ { chain: [ROUTE_TO_HOST, HOST_TO_SERVICE, SERVICE_TO_DEPLOYMENT],
               factCategory, state, evidence[], unknownReason? }
```

The chain is explicit because the interesting truth is WHICH HOP is missing.
Reporting a single flat `UNKNOWN` would lose that, and it is the difference
between "we never looked" and "we looked, and the third hop needs a repository
we cannot read".

State vocabulary: `EXACT`, `PARTIAL`, `UNKNOWN`, `UNSUPPORTED`, `STALE`,
`AMBIGUOUS`. A chain is `PARTIAL` when an earlier hop is established and a
later one is not — which is the expected steady state here, and is strictly
more informative than UNKNOWN.

Evidence identity carries `{ repoId, sourceSha, path, extractorVersion,
digest }`. A digest mismatch against the current artifact yields `STALE`; it
never silently rebinds, because a rebind would let a changed deployment
artifact keep an old binding's authority.

Totality is enforced the way R-12 taught: not by asking each caller to
remember, but by a function that takes the operation population and returns a
binding for every member, plus a check that the two counts are equal.

## Milestones

- M1 Task record, OpenSpec change, measured evidence survey — COMPLETE
- M2 Binding model, chain and state vocabulary — COMPLETE
- M3 Build-exclusion extractor (the one real deployment-evidence source) — COMPLETE
- M4 Host-matrix extractor, classified SOURCE_FACT — COMPLETE
- M5 Totality over the 1,851 operations; U-1 and U-2 explicit — COMPLETE
- M6 Currentness and STALE behaviour — COMPLETE
- M7 Hardening rule, negative probes, no-authority proof — COMPLETE
- M8 Validation, integration, exact-head CI, closure — COMPLETE

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `workspace:check`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, the C-03 suites, the new C-08 suite, the canonical
regression, `gate:local`, `gate:clean`, exact-head GitHub Actions.

## Decision Log

- 2026-09-04 — Classify the `ripple-ui` host matrix as SOURCE_FACT, not
  DEPLOYMENT_FACT. Reason: it is committed client configuration stating what
  the frontend calls; what the infrastructure serves is a different claim, and
  §34 forbids a deployment fact asserted from an expected architecture without
  current deployment evidence. Consequence: positive route→endpoint
  `DEPLOYMENT_FACT` count may be zero, and that is reported rather than
  engineered away.
- 2026-09-04 — Model the binding as an explicit three-hop CHAIN rather than one
  flat state. Reason: the campaign's real output is which hop is missing; a flat
  UNKNOWN cannot distinguish "not looked at" from "blocked at hop three by an
  unavailable repository".
- 2026-09-04 — Admit only the NEGATIVE direction from build exclusions.
  Reason: `build/config.yaml` proves exclusion, and `build_all: false` means
  non-exclusion implies eligibility rather than deployment. Consequence: a
  service can be proven NOT deployed to an environment, and never proven
  deployed, from this source alone.

## Discoveries

- The chain breaks at a knowable, nameable place, which makes C-08's honest
  output far more useful than a bare count: route → host is establishable from
  committed source, host → k8s service is U-1, service → deployed is U-2, and
  both unknowns share one blocker.
- Two of U-2's five services no longer exist in `ouchan/services/` at all,
  which is a source fact worth recording next to the unknown even though it
  does not resolve it.

## Deferred Work

C-08b owns U-1 and U-2 and is blocked on organizational access to `mochi`.
C-13's precondition is therefore unmet, which C-08 records rather than works
around.

## Completion Criteria

The nine acceptance rows of `SPEC.md`, each carried in the REPORT requirement
ledger with exact evidence.
