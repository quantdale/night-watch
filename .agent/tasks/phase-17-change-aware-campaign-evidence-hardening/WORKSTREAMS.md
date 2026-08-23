# Phase 17 Workstreams

| ID | Workstream | Primary surfaces | Completion evidence |
| --- | --- | --- | --- |
| W1 | Change-aware portfolio bridge | `src/core/portfolio/changeImpact.ts`, portfolio barrel, allocation seam | direct/shared/transitive/fallback/stale/unlinked fixtures; deterministic effective ranking and sanitized explanations |
| W2 | Parser/privacy hardening | `runtimeValidation.ts`, `changeIntelligence/baseline.ts` | malformed/inherited/duplicate/hostile baseline matrix; no raw duplicate diagnostic |
| W3 | Replay evidence truth | `triage/minimizer.ts`, `triage/minimalityEvidence.ts` | repeated-action ambiguity cannot produce proven minimality; historical result compatibility remains green |
| W4 | Adversarial corpus/determinism | `corpus/phase17`, focused unit tests | permutation, stale, malformed, privacy, and repeated-action matrices; zero leaks and zero digest mismatches |
| W5 | Operator/docs truth | report renderer, task/project docs | explanations are bounded/categorical; docs and continuity agree with source and Git |

## Cross-cutting constraints

- Pure planner and replay cores have no fs/network/process/browser/AI/DB/selfDev
  authority.
- Approved target universe and owner policy remain hard gates.
- Unknown, stale, ambiguous, or malformed evidence is never promoted by a
  convenience fallback.
- New identities use one canonical stable serializer; historical versions are
  not silently rebound.
