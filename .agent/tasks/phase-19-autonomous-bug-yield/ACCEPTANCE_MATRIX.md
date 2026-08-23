# Phase 19 Acceptance Matrix

| ID | Capability | Required evidence | Status |
|---|---|---|---|
| A01 | Unified campaign plan | Versioned deterministic plan DTO and byte-stable ordering tests | PASS — `campaign-plan.v1`, focused suite |
| A02 | Explainable priority | Bounded components, reason codes, tie/missing/stale/unsupported tests | PASS — deterministic bounded scoring and exclusion reasons |
| A03 | Change impact | Behavior-level impact report feeds selected candidates | PASS — `campaign-impact-report.v1` feeds planner |
| A04 | Semantic coverage | Multi-stage matrix with partial-coverage reasons and planner input | PASS — `campaign-coverage.v1` staged matrix |
| A05 | Yield intelligence | Sanitized result analytics, attribution, zero-yield and coverage deltas | PASS — `campaign-yield.v1` and attribution tests |
| A06 | Replay V4 | Exact/equivalent/divergence/stale/invalid/nondeterministic outcomes | PASS — V4 taxonomy and regressions |
| A07 | Minimization | Deterministic reduction search and honest proof-strength taxonomy | PASS — chunk/step fixed-point proof kinds |
| A08 | Nondeterminism | Bounded repeated execution and stability classification | PASS — bounded stability classifier |
| A09 | Clustering | Semantic/protocol composite identity with adversarial separation tests | PASS — semantic/protocol keys and privacy checks |
| A10 | Confidence V2 | Explainable score/reasons and mechanically gated high confidence | PASS — evidence-gated categorical confidence |
| A11 | Owner dossier | Stable structured evidence, limitations, next action, no raw values | PASS — structured dossier V3 |
| A12 | Product abstraction | Synthetic second-product adapter proves generic campaign contracts | PASS — generic adapter plus synthetic-only fixture |
| A13 | Corpus | Data-driven adversarial matrix and zero benign/privacy false positives | PASS — 31-case matrix; synthetic campaign 27 passed |
| A14 | Operator UX | Safe local status/plan/coverage/campaign/findings/explain path | PASS — local operator routes and scripts |
| A15 | Diagnostics | Stable codes, safe context, and remediation hints | PASS — stable codes and safe remediation |
| A16 | Performance/consolidation | Correctness-preserving cache/count invariant and compatibility cleanup | PASS — source-keyed bounded caches and linear duplicate counting |
| A17 | Safety/privacy | Owner freeze, fail-closed, redaction, no external side effects | PASS — hardening plus local/source/synthetic boundary |
| A18 | Canonical regression | Full canonical suite exact counts and no unexpected skips | PASS — 2,297 enumerated; 2,293 passed; 4 skipped; 0 failed |
| A19 | Isolated parity | Topology-correct isolated suite exact enumeration and skip parity | PASS — exact canonical enumeration and four skip identities |
| A20 | Static/continuity truth | typecheck, hardening, agent, project checks green | PASS — typecheck, hardening, agent, project-state |
| A21 | External CI truth | One post-push inspection, blocked/green reported without retries | PASS — run 32643603911 / job 97204345223, steps=[]; inspected once, blocked |
