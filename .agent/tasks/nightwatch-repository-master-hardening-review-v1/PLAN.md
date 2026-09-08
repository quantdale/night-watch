# Repository-wide master hardening review plan

## Milestones

- M0 — session/bootstrap and fixed-snapshot inventory: COMPLETE
- M1 — source/configuration/test/document review and baseline checks: COMPLETE
- M2 — validate findings and synthesize canonical plan: COMPLETE
- M3 — requirement audit, documentation validation, commit and integration: IN_PROGRESS

## Review method

Inventory every tracked path and scan all tracked bytes for authority-bearing
operations and incompleteness signals. Deep-inspect system boundaries and
primary execution flows. Use bounded synthetic probes for hypotheses that can
be verified without external contact. Distinguish source evidence from executed
evidence and from validation still required.

## Decision log

- Preserve W10 as the owner of reproduction-surface expansion; reference its
  current evidence rather than duplicating its implementation plan.
- Treat production deployment as outside the target. Production-quality means
  robust private-local engineering and truthful environment qualification.
- Record the routing mismatch seen at the original baseline as resolved by
  current origin/main; retain the broader documentation-coherence finding.
- Prefer evolutionary shared primitives and compatibility-aware readers over
  rewrites, new databases, or framework migrations.
