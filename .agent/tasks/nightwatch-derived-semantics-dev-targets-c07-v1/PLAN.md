# C-07 Derived Endpoint Semantics + Generated DEV Targets

## Purpose

After C-07, Nightwatch's endpoint semantics are DERIVED from evidence rather
than asserted by hand, and the path from "an operation exists" to "a request is
authorized" is a visible funnel with a count and a reason at every stage —
including, as it turns out, a zero at the end.

## Starting State

Task `nightwatch-derived-semantics-dev-targets-c07-v1`; starting SHA
`a34064711d2682f090c4d35079a27f08a7767ea5`; predecessor
`nightwatch-eig-prioritization-c16-v1` COMPLETE, certified at CI run
`33811693944`.

Established by measurement, and not to be rediscovered:

- All four §7 offline preconditions hold: R-12, C-05, C-08, C-09 COMPLETE.
- `RIPPLE_ENDPOINT_SEMANTIC_REGISTRY` is intentionally `[]`.
- Read-only classification over 1,851 operations: `PROVEN_MUTATION_CAPABLE`
  1,107; `READ_ONLY_METHOD_ONLY` 485; `UNSUPPORTED` 179;
  `CONDITIONAL_MUTATION` 80; **`READ_ONLY_PROVEN` 0**.
- Admission funnel: considered 1,851, eligible **0**, excluded 1,851, across
  nine reason codes.
- Runtime binding: 1,843 `SOURCE_ONLY`, 8 `RUNTIME_BOUND_EXACT`; only those 8
  carry a `targetId`.
- Methods: GET 677, POST 739, PUT 260, DELETE 169, PATCH 6.
- `bin/phase22-dev.mjs` `manifest`, `preflight` and `acceptance --dry-run` are
  local and read-only; only `acceptance --execute --env=dev` invokes a
  launcher.
- A DEV storage state exists at `$HOME/.nightwatch/auth/ripple-dev-state.json`
  (mode 600). Its CONTENTS are never read by this campaign.

## Scope

Derived registry; target-generation funnel with per-reason counts; EIG ordering
restricted to admissible targets; pre-DEV qualification through existing
tooling; honest zero reporting.

## Non-Goals

No hand-authored semantic rule; no weakened threshold; no fabricated finding;
no credential acquisition or auth-config change; no production or NEXT contact.

## Safety Constraints

Generation is not execution. EIG orders and never widens. No admission
threshold, classification or gate is weakened for any reason, including to
reach the historical ≥ 30 figure. The DEV storage state's contents are not
read. Sibling repositories read-only; `siblingWrites` 0. All implementation
inside the owned session worktree
`session/nightwatch-derived-semantics-dev-16e96515`.

## Architecture / Approach

`src/core/source/derivedEndpointSemantics.ts` maps each operation's
mechanically established evidence onto a semantic classification, and every
entry carries the evidence that produced it:

| Evidence | Derived classification |
|---|---|
| `READ_ONLY_PROVEN` | `KNOWN_READ` |
| `PROVEN_MUTATION_CAPABLE` | `MUTATION_CAPABLE` |
| `CONDITIONAL_MUTATION` | `MUTATION_CAPABLE` (conditional is still capable) |
| `READ_ONLY_METHOD_ONLY` | `UNKNOWN` — method alone is not a read contract |
| `UNSUPPORTED` | `UNSUPPORTED` |
| conflicting inputs | `AMBIGUOUS` |

The `READ_ONLY_METHOD_ONLY` row is the one that matters. 485 operations sit
there, and promoting them would produce a registry that looks productive and
asserts a read contract from an HTTP verb — precisely what the existing
module's own comment forbids.

The target generator then runs those classifications through the UNCHANGED
admission chain and reports each stage's count and reason. It cannot admit;
it can only observe what admission decided.

EIG ordering takes ONLY the admissible set as input, so an inadmissible target
has no path to a rank however high it would have scored.

## Milestones

- M1 Task record, OpenSpec change, measured baseline — COMPLETE
- M2 Derived semantic registry with per-entry evidence — COMPLETE
- M3 Target-generation funnel with per-reason counts — COMPLETE
- M4 EIG ordering restricted to admissible targets — COMPLETE
- M5 Pre-DEV qualification through existing tooling; record the verdict — COMPLETE
- M6 Hardening rule and negative probes — COMPLETE
- M7 Validation, integration, exact-head CI, closure — COMPLETE

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `workspace:check`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, `gate:predev`, `dev-manifest`, `dev-preflight`, the C-06
suite, the new C-07 suite, the canonical regression, `gate:local`,
`gate:clean`, exact-head GitHub Actions.

## Decision Log

- 2026-09-04 — Derive `UNKNOWN`, not `KNOWN_READ`, from
  `READ_ONLY_METHOD_ONLY`. Reason: C-06 established that HTTP method is not a
  read/write contract, and the endpoint-semantics module says so in its own
  header. Consequence: 485 operations stay UNKNOWN and the derived registry
  contains zero `KNOWN_READ` entries, because zero operations carry an effect
  proof.
- 2026-09-04 — Report zero eligible DEV targets rather than relax admission.
  Reason: §66 requires each target to pass UNCHANGED admission, and the
  portfolio admits none of the 1,851. Consequence: the historical ≥ 30 figure
  is not met, and the blocker is named rather than engineered around.
- 2026-09-04 — Feed EIG only the admissible set. Reason: §67 says EIG may
  choose ordering and may not override safety; passing it the full population
  would let a high score sit above an inadmissible target in a ranked list an
  operator might read as a work queue.

## Discoveries

- The campaign's headline number is zero, and it is zero for a reason that is
  fully explained by earlier campaigns rather than by anything C-07 did:
  `READ_ONLY_PROVEN` fell to 0 in C-06 when method-only evidence stopped
  counting, and 6,114 unclassified callee identities block promotion.
- Only 8 of 1,851 operations are `RUNTIME_BOUND_EXACT`, and only those carry a
  `targetId` — so even the runtime-binding precondition is satisfied for well
  under one percent of the population.

## Deferred Work

DEV execution remains available to a future campaign if and when an effect
proof admits an operation. C-07 changes nothing about that path except making
its current emptiness visible.

## Completion Criteria

The ten acceptance rows of `SPEC.md`, each carried in the REPORT requirement
ledger with exact evidence.
