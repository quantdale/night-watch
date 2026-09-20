## Why

The exploration engine claims to independently verify each action's structural/read contract, but the real Ripple runtime does not observe the structural postcondition. After a successful click it merges `action.expectedStructuralDelta` into an in-memory `safeViewState` and returns that same expected object as `structuralDelta`. The engine then compares the value to itself. A click that resolves but changes nothing, selects the wrong option, or leaves sorting unchanged can therefore create a false next state, coverage edge, replay match, and downstream action eligibility.

The focused mismatch test uses a fake runtime that deliberately returns a different delta; it does not exercise the real runtime's expected-value injection. Network-read settlement does not repair the gap for `LOCAL_ONLY` actions and does not prove the selected UI state even when reads occur.

## What Changes

- Replace expected-value injection with source-backed, bounded before/after UI postcondition observers for every approved action kind.
- Derive `safeViewState`, `structuralDelta`, next state, transition identity, and replay evidence only from observed structural facts.
- Require time-bounded stable settlement and exact/unique observations; unchanged, ambiguous, stale, or contradictory state fails the action without mutating model state.
- Keep expected deltas as declarative predicates evaluated against observations, never as runtime output.
- Add real-runtime negative fixtures and mutations for no-op clicks, wrong options/tabs, stale menus, unchanged/reversed sort state, and network/UI disagreement.

## Capabilities

### New Capabilities

- `exploration-observed-postcondition-integrity`: Defines source-backed postcondition observation, stable settlement, observation-derived transitions/state, exact replay proof, and non-vacuous real-runtime tests.

### Modified Capabilities

None.

## Impact

- Affects `src/products/ripple/{explorationRuntime,explorationCatalog}.ts`, exploration types/engine/replay evidence, and exploration tests.
- Preserves the fixed read/local-only action catalog and safety envelope; it grants no new selector, action, endpoint, or route authority.
- Implementation validation uses synthetic local DOM/network fixtures only and does not contact DEV or production.
