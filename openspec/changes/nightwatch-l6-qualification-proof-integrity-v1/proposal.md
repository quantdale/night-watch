## Why

Nightwatch treats nightwatch.process-network-containment.v1 as the load-bearing authority for authenticated subprocess execution. Its qualification currently returns a fully PROVEN capability even though the UDP probe result is omitted from the denial predicate, browser direct-listener counters observe endpoints the browser never targets, a resolver flag suppresses the speculative-DNS stimulus, and the resulting constant-only capability is not bound to the later Bubblewrap, Node, Chrome, target, or namespace instance. A vacuous or stale qualification can therefore authorize an execution whose exact containment was never proven.

## What Changes

- Replace aggregate booleans with a versioned qualification receipt containing a complete probe manifest, stimulus/outcome evidence, exact executable identities, and a fresh qualification generation.
- Make every claimed denial non-vacuous: each probe must prove that its target is reachable in a positive control, is actually attempted in the contained lane, and cannot reach the parent/external observer; omitted, suppressed, timed-out, malformed, or ambiguous outcomes fail closed.
- Bind authenticated execution to the exact qualified Bubblewrap/Node/Chrome policy inputs and revalidate them at launch through immutable handles or descriptor/digest-backed identity.
- Remove or confine the public synthetic READY constructor so production authority cannot be fabricated from constants.
- Add mutation, substitution, race, process-tree, privacy, and unsupported-host tests for every proof field.

## Capabilities

### New Capabilities

- l6-qualification-proof-integrity: Defines non-vacuous probe evidence, exact runtime binding, capability consumption, revocation, and adversarial validation for L6 process/network containment.

### Modified Capabilities

None.

## Impact

- Affects src/core/oops/{l6,process,sandbox}.ts, L6 tests, hardening checks, campaign receipts, and containment documentation.
- Preserves the rootless namespace and bounded relay model while making qualification evidence complete and bound to the execution it authorizes.
- Introduces no external target, authenticated campaign, privileged firewall, cloud/data access, or broader runtime authority.
