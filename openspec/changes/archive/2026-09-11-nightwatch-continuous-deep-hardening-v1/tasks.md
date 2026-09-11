## 1. Soak and cache

- [x] 1.1 Soak 3× synthetic with resource snapshots
- [x] 1.2 Cache 12-case (same/changed SHA/content, dep, analyzer, interrupted/malformed/duplicate/stale) — 12/12 PASS

## 2. Containment and chaos

- [x] 2.1 L6 requal 4/4 + manual proxy denied
- [x] 2.2 Replay/resume chaos 8-case — no lost/duplicate

## 3. Auth and fuzz

- [x] 3.1 Auth 9-case fail-closed sanitized
- [ ] ~~3.2 Fuzz/property ≥20 cases PASS~~ — not done: the task record shows 12/12 fuzz cases in M6, below the entry's ≥20 threshold; carried to nightwatch-production-completion-programme-v1 §Carried forward.

## 4. Reproducibility and requalification

- [x] 4.1 Dead-code, deps audit, no mass upgrade
- [ ] ~~4.2 `gate:clean` Node20 PASS~~ — deferred: task record defers `gate:clean` execution due to session budget (STATE Deferred / PLAN M7).
- [ ] ~~4.3 Isolated parity exact (or truthfully explained)~~ — deferred: task record defers isolated parity re-run due to session budget (STATE Deferred / PLAN M7).
- [x] 4.4 Final DEV requalification (phase2c/phase5/campaign) or truthful blocker
