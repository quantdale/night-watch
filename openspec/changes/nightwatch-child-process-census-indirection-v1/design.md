## Context

The parser uses separate regular expressions for import forms. Namespace
`require` is not captured, and the invocation scanner only searches recognized
bindings/namespaces. A real call can therefore be absent from the census while
the import file count increases.

## Goals / Non-Goals

**Goals:** total supported indirection, explicit unknown refusal, stable
classification, and mutation-detectable tests.

**Non-Goals:** eval, runtime tracing, arbitrary transpilation, or changes to
child execution policy.

## Decisions

### Parse namespace require before aliases

Collect namespace bindings first, then resolve direct method aliases against
the closed invocation vocabulary. Destructured require aliases use the same
closed binding set.

### Unknown imports are not empty success

If a file imports child_process but has no recognized binding/namespace or
contains an unresolved dynamic indirection, return an explicit unknown record.
The hardening rule fails on it rather than accepting zero invocations.

### Keep analysis pure and bounded

All inputs are source strings. Unknown patterns are categorical records with
file/line/callee only; no raw values or process execution are introduced.

## Risks / Trade-offs

Regex parsing remains bounded to supported syntax. Broader JavaScript alias
chains require a future explicit grammar and must fail closed until then.

## Migration Plan

1. Add fixture tests and unknown-result contract.
2. Implement namespace/alias discovery and hardening refusal.
3. Run mutation probes and required lanes.
4. Update census counts/digests only through generated or reviewed mechanisms.

## Open Questions

None.
