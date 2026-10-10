## Context

`GatedReadToolInvoker` calls owner policy, but `BaseReadAdapter.executeValidated` does not. Its constructor accepts any invoker. `assertValidated` trusts a public boolean marker, so a forged plan can reach compilation and the injected callback. The standalone real-data gate checks environment/auth/scope/privacy/budget but not the permanent owner freeze. `QueryBudgetManager.complete` ignores permit identity and repeat completion.

## Goals / Non-Goals

**Goals:** owner denial at every effect seam; unforgeable capabilities; explicit synthetic isolation; coherent permit lifecycle; hardening coverage.

**Non-Goals:** authorize data access, query any datastore, or redesign preserved plan catalogs.

## Decisions

### Owner policy dominates the invocation boundary

Every adapter method capable of reaching an injected callback calls `assertOwnerPolicyAllows` before compilation, scope access, credential/tool work, or callback invocation. The default invoker is defense in depth, not the only gate.

### Mint capabilities at runtime

Validated plans and permits are exact registered objects tied to validator/ledger instances and immutable canonical plan/scope identities. A copied or structurally similar object is not authority.

### Separate synthetic execution

Synthetic invokers accept only a dedicated synthetic fixture capability and plans whose provenance/targets are synthetic. The real adapter types cannot accept that capability, and synthetic success never satisfies real-data gates.

### Settle permits exactly once

Completion validates ledger identity, permit state, plan/scope/phase identity, and bounded results before a one-way transition. Foreign, repeated, or fabricated completion refuses without changing counters.

## Risks / Trade-offs

Test fixtures must mint explicit synthetic capabilities. This makes the safety boundary visible and intentional.

## Migration Plan

1. Add failing forged/injected/cross-ledger tests.
2. Introduce registered plan, synthetic, and permit capabilities.
3. Put owner policy first at all real effect seams.
4. Update fixtures and hardening import/call checks.
5. Run Phase 6, owner-scope, hardening, local/clean, and full gates.

## Open Questions

None. An injected callback cannot be allowed to remove the owner gate.
