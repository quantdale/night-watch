# Audit — MA-8 / F-13 against repository truth

## Canonical requirements implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| MA-8 | review §6 | IMPLEMENTED — `nightwatch.p1-observation-scope.v1` |
| F-13 | review §6 | IMPLEMENTED — attach-only definition, scope chain, L6 option-B invariant, attributable criterion |
| UA-8 | review §6 | RESOLVED — "issues no requests" replaced by attributable accounting |
| E-16 | review §E | IMPLEMENTED — precise P1 definition, L6 exemption with rationale, scope chain |
| C-12 row | review §10 | CRITERION CORRECTED IN CODE — "zero requests attributable to Nightwatch, every request counted and attributed" |
| §5.5 P1 stage | master-plan design | CONSUMED — historical text stays historical; code implements the corrected definition |
| §5.6 observer identity | master-plan design | CONSUMED — P1 minimum `ORDINARY_USER`, enforced by `P1_OBSERVER_IDENTITY` |
| F-09/F-10 | review §6 | CONSUMED — external-only scope config; allowlist built, never inverted |
| C-10/C-10.5 | privacy + provenance | CONSUMED — policy, projection, firewall, persistence audit; not modified |
| C-11 chain | safety kernel | CONSUMED AS PRECEDENT — named-chain, code-confinement, digest, one-shot registry patterns; not modified |

## Explicitly deferred (not this change)

- C-12 execution, operator subject provisioning, admitted production config
  values, C-08b deployment facts, DEV/NEXT behavior, P2/P3 promotion.
