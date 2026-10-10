## Why

Phase 6 is permanently frozen by owner policy, yet its compatibility adapters enforce the owner gate only in the default `GatedReadToolInvoker`. Every adapter accepts an arbitrary injected `ReadToolInvoker` and calls it after only checking the structural `__validatedReadPlan === true` marker. A caller can forge that marker and supply an arbitrary invoker, bypassing both plan validation and the owner freeze at the actual invocation seam. `assertRealDataReadAllowed` can also return success without consulting owner policy, and query permits are not identity-bound or one-shot at completion.

No current production invoker exists and source imports show these paths are test/compatibility-only, limiting immediate reachability. The retained API nevertheless contradicts the permanent rule that real data execution is quarantined behind the owner gate.

## What Changes

- Enforce owner policy as the first check at every non-synthetic adapter execution seam, independent of invoker implementation.
- Replace structural validated-plan and permit markers with runtime-minted, registry-bound capabilities.
- Split synthetic execution into an explicit synthetic-only capability that cannot be paired with real targets or relabeled.
- Make budget permits ledger-bound, one-shot, phase/scope/plan-bound, and coherently settled.
- Add arbitrary-invoker, forged-plan, forged-permit, cross-ledger, and gate-order mutations.

## Capabilities

### New Capabilities

- `phase6-owner-scope-quarantine-integrity`: Defines non-bypassable owner gating, runtime capability identity, synthetic/real separation, and permit lifecycle for retained Phase 6 compatibility APIs.

### Modified Capabilities

None.

## Impact

- Affects `src/data/phase6/{adapters,gates,validators,budget,compiler}.ts` and Phase 6 hardening/tests.
- Preserves types and synthetic fixtures while keeping real datastore execution unavailable.
