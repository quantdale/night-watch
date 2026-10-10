## Context

`assertScopeContinuity` already refuses a scope mismatch. `policyFromCheckpoint` already restores the stored ceiling rather than the caller's `ceilingName`. Reasoner construction is independent: `driverAndPolicy(input)` uses live caller fields, and `reasonerIdentity` is optional on resume.

## Goals / Non-Goals

**Goals:** exact identity admission on resume; fail closed on omit/mismatch; preserve F-19 recording.

**Non-Goals:** hostile same-user isolation, remote provider attestation, rewriting historical yield, or changing spawn/no-shell rules.

## Decisions

### Identity is a resume generation

A campaign generation includes the resolved executable path, content digest, provider label, model label, and canonical argv digest. Attribution without comparison is not continuity.

### Omit is a mismatch

A checkpoint that recorded identity cannot resume when the caller omits it. Defaulting to "configured" or reusing the stored values silently is forbidden.

### Compare before driver use

Identity comparison happens after checkpoint parse and before `reasoner.complete`. A mismatch throws a categorical resume error and performs zero reasoner calls.

### Do not weaken F-19

Path existence, no-shell spawn, and evidence recording remain owned by the production-completion configuration contract. This change only makes that recorded identity load-bearing at resume.

## Risks / Trade-offs

Operators must pass the same reasoner on resume. That is the intended fail-closed behavior and matches how scope is already bound.

## Migration Plan

1. Extend the progress envelope with complete identity members if any are missing.
2. Compare caller vs stored identity before constructing a live driver.
3. Add adversarial resume tests; keep the current swap test as a negative that must now refuse.
4. Run local-campaign/runtime suites without executing a real campaign.

## Open Questions

None. Recording without comparison is not resume authority.
