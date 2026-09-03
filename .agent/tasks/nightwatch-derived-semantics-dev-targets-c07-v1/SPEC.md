# SPEC — C-07 Derived Endpoint Semantics + Generated DEV Targets

Task ID: nightwatch-derived-semantics-dev-targets-c07-v1
Phase: DERIVED_SEMANTICS_DEV_TARGETS_C07_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a34064711d2682f090c4d35079a27f08a7767ea5
Predecessor Task ID: nightwatch-eig-prioritization-c16-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_DERIVED_SEMANTICS_DEV_TARGETS_C07_V1

## Frozen intent

Derive the endpoint semantic registry from mechanically established evidence
rather than reviving a hand-authored catalog, generate DEV targets that pass
the UNCHANGED admission chain, and report the funnel honestly — including if it
ends at zero.

A generated DEV target is not an authorized request until the existing safety
chain admits it.

## Measured baseline, and it decides the campaign

All four §7 offline preconditions are satisfied: R-12, C-05, C-08 and C-09 are
each COMPLETE and certified.

The existing registry is INTENTIONALLY EMPTY.
`RIPPLE_ENDPOINT_SEMANTIC_REGISTRY` is `[]`, under the rule that "HTTP method
is not a read/write contract" and "no API semantics are asserted without a
reviewed exact source-backed rule". C-07 must DERIVE it, not repopulate it by
hand.

### The read-only classification distribution over all 1,851 operations

| Classification | Count |
|---|---|
| `PROVEN_MUTATION_CAPABLE` | 1,107 |
| `READ_ONLY_METHOD_ONLY` | 485 |
| `UNSUPPORTED` | 179 |
| `CONDITIONAL_MUTATION` | 80 |
| **`READ_ONLY_PROVEN`** | **0** — the class does not appear at all |

`READ_ONLY_METHOD_ONLY` is 485 operations whose only evidence is the GET verb,
and C-06 established that method alone is not a read contract. So none of them
can become `KNOWN_READ`.

### The admission funnel

`portfolio: considered 1,851 · eligible 0 · excluded 1,851`, with nine distinct
exclusion reason codes in play: `AUTH_REQUIREMENT_UNBOUND`,
`BEHAVIOR_OWNER_AMBIGUOUS`, `CONTRACT_IDENTITY_UNPROVEN`, `MUTATION_REQUIRED`,
`PROJECTION_UNSAFE`, `REPLAY_UNSUPPORTED`, `ROUTE_IDENTITY_UNPROVEN`,
`SEMANTIC_CONTRACT_UNPROVEN`, `SEMANTIC_PRECONDITIONS_UNBOUNDED`.

This is consistent with C-06's own recorded finding: `READ_ONLY_PROVEN` over the
approved universe fell 5 → 0, with 6,114 unclassified callee identities
blocking promotion via `CALLEE_CLASSIFICATION_INCOMPLETE`.

### Consequence, stated before any code is written

With zero operations carrying an effect proof, a DERIVED registry contains
zero `KNOWN_READ` entries, and the unchanged admission chain admits zero DEV
targets. §7's sixth condition — "existing Nightwatch DEV admission accepts the
target" — therefore fails, and **no DEV traffic is authorized**.

Runtime binding is `SOURCE_ONLY` for 1,843 of 1,851 operations, with 8
`RUNTIME_BOUND_EXACT`; those 8 are the only ones carrying a `targetId` at all.

## Scope

- A DERIVED endpoint semantic registry where every classification traces to
  mechanically established evidence.
- A DEV target generator reporting the full funnel: generated, rejected,
  unknown, stale, mutation-capable, eligible, with per-reason counts.
- C-16 EIG wired to ORDER already-admissible targets, never to widen them.
- Pre-DEV qualification run through the existing local tooling.
- An honest zero report where the evidence yields zero.

## Non-goals

- No hand-authored semantic rule, and no revival of the retired eleven-row
  catalog as safety authority.
- No weakening of any admission threshold, classification, or gate to create
  eligible targets or reach the historical ≥ 30 figure.
- No fabricated product finding. Zero legitimate findings is reported as zero.
- No credential acquisition, no auth-configuration change, no reuse of
  production state.
- No production or NEXT contact of any kind.

## Absolute invariants

- Every registry classification names the evidence that produced it; a rule
  without derivation evidence is not admitted.
- `UNKNOWN` and `AMBIGUOUS` grant nothing.
- EIG may order admissible targets and may NEVER promote an inadmissible one.
- Generation is not execution: a generated target carries no request authority.
- If admission admits nothing, the honest output is zero eligible targets and
  the reasons — not a relaxed threshold.
- Zero production contact and zero NEXT contact.

## Acceptance

1. The registry is DERIVED: every entry traces to mechanically established
   evidence, and no hand-authored rule is admitted.
2. Classification vocabulary covers known-read, mutation-capable, unknown,
   ambiguous and unsupported, each traceable.
3. The generated-target funnel is reported in full with per-reason counts.
4. The historical ≥ 30 figure is evaluated honestly: met, or not met with the
   blocker named. No threshold is weakened to reach it.
5. EIG orders admissible targets and cannot promote an inadmissible one,
   proven by probe.
6. Pre-DEV qualification is run and its verdict recorded; UNKNOWN denies.
7. DEV execution status is recorded truthfully, with its exact blocker if
   blocked.
8. Product findings reported honestly; zero is reported as zero.
9. Zero production contact, zero NEXT contact, and DEV contact count recorded
   exactly.
10. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
    exact-head CI PASS; `siblingWrites` 0; session released.

## Declared Deletions

None.
