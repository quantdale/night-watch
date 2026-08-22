# ACCEPTANCE MATRIX — Phase 16B

| ID | Gate | Required evidence |
|---|---|---|
| A01 | Live Git | HEAD/origin/main recorded; clean/legitimate state preserved |
| A02 | Authorization | Both required execution-token strings recorded before DEV contact |
| A03 | Runtime binding | Exact current source path from inert handoff to campaign runner shown; no bypass |
| A04 | Environment | Canonical Ripple DEV only; NEXT/prod/unknown attempts = 0 |
| A05 | Read-only | mutation attempts = 0; unknown actions never executed |
| A06 | Containment | existing proxy/browser guards active; containment violations = 0 |
| A07 | Auth/privacy | auth state loaded only through sanctioned path; traces off; privacy leaks = 0 |
| A08 | Portfolio validity | approved targets only; currentness valid; plan/manifest parsers pass |
| A09 | Determinism | identical pre-run inputs produce byte-identical plan/handoff |
| A10 | Budget | executed allocation <= frozen total budget; per-member caps respected |
| A11 | Scope freeze | no unplanned target/member executed |
| A12 | Checkpoint integrity | fingerprints/version/resume checks green; no executor on mismatch |
| A13 | Candidate truth | all anomalies assigned truthful reproduced/invalid/transient/blocked disposition |
| A14 | Replay truth | read-only replay only where supported; no structural false certification |
| A15 | Minimality truth | no false 1-minimal claim; exact/reduced/precondition divergence distinct |
| A16 | Semantic/protocol | current receipts and coverage/currentness gates applied |
| A17 | Dedupe/confidence | cluster identity stable; partial/stale evidence cannot become high confidence |
| A18 | Reconciliation | planned/attempted/completed/blocked member counts and budget reconcile |
| A19 | Private artifacts | no screenshots/traces/bodies/DOM/customer financial/identity persistence added |
| A20 | Safety counters | production=0, next=0, mutation=0, ownerPolicyEscape=0, containmentViolation=0, privacyLeak=0 |
| A21 | Post-run local | focused campaign/portfolio/runtime checks green; typecheck/hardening green when source changed |
| A22 | CI truth | exact run/job/steps inspected once for pushed checkpoint; no retry loop |
| A23 | Report | raw counts, fingerprints, runtime source SHA, candidates/findings and limitations recorded |
| A24 | Frozen gates | Phase 6 frozen; Phase 11B/13B unauthorized; no selfDev/promotion/catalog mutation |

A zero-candidate or zero-dossier-ready campaign may PASS if A01–A24 are satisfied. The acceptance target is truthful runtime composition, not a quota of bugs.
