## 1. Soak and cache

- [ ] 1.1 Soak 3× synthetic with resource snapshots
- [ ] 1.2 Cache 12-case (same/changed SHA/content, dep, analyzer, interrupted/malformed/duplicate/stale) — 12/12 PASS

## 2. Containment and chaos

- [ ] 2.1 L6 requal 4/4 + manual proxy denied
- [ ] 2.2 Replay/resume chaos 8-case — no lost/duplicate

## 3. Auth and fuzz

- [ ] 3.1 Auth 9-case fail-closed sanitized
- [ ] 3.2 Fuzz/property ≥20 cases PASS

## 4. Reproducibility and requalification

- [ ] 4.1 Dead-code, deps audit, no mass upgrade
- [ ] 4.2 `gate:clean` Node20 PASS
- [ ] 4.3 Isolated parity exact (or truthfully explained)
- [ ] 4.4 Final DEV requalification (phase2c/phase5/campaign) or truthful blocker
