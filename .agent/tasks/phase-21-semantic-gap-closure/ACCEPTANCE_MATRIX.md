# Phase 21 Acceptance Matrix

| ID | Capability | Required evidence | Status |
|---|---|---|---|
| A01 | Exact gap census/ledger | Versioned closure DTO, one record per baseline gap, deterministic before/after counts and explicit irreducible reasons | PASS_LOCAL — 86 identities preserved; 83 closed; 3 irreducible |
| A02 | Privacy-safe membership | Bounded membership categories, source-bound in-memory comparison, hostile reconstruction/probing tests | PASS_LOCAL — 5/5 focused privacy tests; no raw values/tokens |
| A03 | Enum/set mutation applicability | Wrong-member, missing-member, unexpected-member, subset/superset, exact-set mutants with truthful applicability | PASS_LOCAL — 46/46 applicable and detected; 0 surviving; 0 benign false positives |
| A04 | Differential saturation | Explicit mechanically proven pair discovery, alignment, outcome classification, cross-surface mutation evidence | PASS_LOCAL — 22 candidates; 21 admitted pairs; differential fixtures measured |
| A05 | Replay saturation/equivalence | Contract-bound exact/semantic replay outcomes and occurrence identity; no generic-error reproduction | PASS_LOCAL — 67/67 replayed with contract-bound classifications |
| A06 | Dependency-aware minimization | Explicit dependency edges, semantic identity preservation, adversarial delta-debugging tests | PASS_LOCAL — 67/67 minimized with dependency proofs |
| A07 | Provable-uncovered/binding closure | Deterministic suggestions and synthetic admissions without real execution authority | PASS_LOCAL — 21 synthetic bindings; 0 real execution authority |
| A08 | Metamorphic exercise | Remaining relations exercised only where mechanically justified, with benign controls | PASS_LOCAL — 4/7 exercised; 3 proof-limited exclusions explicit |
| A09 | Quality/graph/planner | Quality levels, duplicate normalization, gap-driven deterministic closure cycle and cache counters | PASS_LOCAL — graph 239/233/3; deterministic plan and telemetry |
| A10 | Dossier/operator | Dossier V5 and local gap/replay/minimization/mutation views with safe evidence | PASS_LOCAL — V5 and operator commands green; legacy CLI cone repaired |
| A11 | Corpus/privacy/performance | Data-driven expanded adversarial/privacy/cache corpus; zero floors/regressions | PASS_LOCAL — 151 cases / 23 families; privacy and benign floors zero |
| A12 | Compatibility/safety | Phase 9–21 cone, typecheck, hardening, owner provenance, campaign, continuity, project, full canonical/isolated parity | PASS_LOCAL — 1,295/1,295 cone; typecheck/hardening/campaign/owner provenance PASS; canonical and isolated 2,333/2,329/4/0 with exact parity |
| A13 | Terminal truth | Clean synchronized main, final implementation checkpoint, one truthful Actions inspection, complete handoff | IN_PROGRESS |
