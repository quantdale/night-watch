## Why

The converged artifact facade calls strict structural validators, but several current validators traverse unbounded arrays and nested values before or without enforcing resource limits. Minimization sequences/evaluations, cluster batches/run IDs, coverage lists, project-health collections, source provenance, and recursive sentinel scans can consume attacker- or corruption-controlled CPU and memory. The facade also returns arbitrary thrown `Error.message` values from leaf validators instead of applying its DTO registry's stable privacy-safe error normalization.

Owner-local storage reduces remote exposure but does not make corrupt, oversized, or pathologically nested durable evidence safe to inspect. A validation boundary must be bounded before deep traversal and must never echo raw payload-derived messages.

## What Changes

- Add per-kind byte, depth, key, array, string, and aggregate-work budgets enforced before deep validation.
- Centralize safe categorical error normalization for every facade path.
- Make batch validation expose explicit truncation/incomplete status rather than silently stopping or exhausting resources.
- Align producer maxima and parser maxima through one registry.
- Add oversized/deep/cyclic/throwing-validator/property/mutation tests.

## Capabilities

### New Capabilities

- `durable-artifact-validation-bounds`: Defines total resource bounds, safe errors, producer/parser bound identity, and truthful batch completeness for durable artifact validation.

### Modified Capabilities

None.

## Impact

- Affects `src/core/artifactValidation/**`, `src/core/dtoFramework/**`, shared runtime validation helpers, and every artifact-facade consumer.
- Does not alter valid in-bound artifact semantics.
