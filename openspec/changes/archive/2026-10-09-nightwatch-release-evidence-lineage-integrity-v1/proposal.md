## Why

Release certification currently rejects only evidence SHAs that are strict ancestors of the certified checkpoint. A `MET` condition with no evidence SHA, `HEAD` resolving to a later commit, an unknown object, or a future/divergent commit remains met, so the central release gate can claim checkpoint-bound evidence that was never established at that checkpoint.

## What Changes

- Require every `MET` release condition to bind an exact, resolvable commit identity equal to the certified checkpoint; absence or any other lineage relation is non-certifying.
- Replace the current boolean ancestry callback with a categorical resolver that distinguishes exact, stale ancestor, future descendant, divergent, missing object, malformed, and Git-indeterminate states.
- Resolve `HEAD` once from the admitted checkout snapshot and reject it when it differs from the certified checkpoint.
- Make missing/unresolvable/future/divergent evidence refuse an advance with stable condition-specific categories, just as stale evidence does today.
- Bind check output, evidence identity, certified checkpoint, definition digest, and evaluation snapshot into the rendered verdict so prose/config edits cannot masquerade as checkpoint evidence.
- Add pure and full-process negative matrices plus non-vacuous mutations for null, `HEAD`, unknown, future, divergent, and ancestry-command failure cases.

## Capabilities

### New Capabilities

- `release-evidence-lineage-integrity`: Defines exact checkpoint evidence binding, categorical Git lineage resolution, fail-closed release verdicts, and adversarial proof for every release condition.

### Modified Capabilities

None.

## Impact

- Affects `src/core/releaseCertification/index.ts`, `bin/project-state-check.mjs`, `config/release-certification.v1.json`, focused project-state tests, mutation coverage, and release verdict documentation.
- Strengthens the in-progress production-completion `release-definition-and-verdict` contract; it does not choose the pending next status or make any currently unmet condition pass.
- Does not alter exact-head CI identity, runtime toolchain selection, product behavior, or external production authorization.
