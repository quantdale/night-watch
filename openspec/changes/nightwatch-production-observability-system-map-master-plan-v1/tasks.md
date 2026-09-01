# Tasks — Nightwatch Production Observability & System Map Master Plan

## Planning campaign (this session)

- [x] M0 discover live Git state and enumerate the real sibling repository population (148 repos, 46 active)
- [x] M1 audit Nightwatch as-built from implementation and tests, not documentation
- [x] M2 reproduce the source-intelligence result with Nightwatch's own read-only census and attribute it (128 operations, 100 % `ripple-api`, 100 % YAML routes)
- [x] M3 prove the two silent ceilings (223→128 truncation at `surfaces.ts:59`; read-only proof reduces to an 11-row hand catalog at `surfaces.ts:149-162`)
- [x] M4 census the company system: backends, frontends, SDKs/contracts, deployment topology, dormant population — each conclusion evidence-classed
- [x] M5 measure the unread evidence (662 HTTP-annotated RPCs; 17 gRPC registration sites; ≈350 Requirements / ≈823 Scenarios of product OpenSpec)
- [x] M6 define the fact taxonomy and the whole-system model (`design.md §2-3`)
- [x] M7 design two-witness read-only proof (`design.md §4`)
- [x] M8 design `PROD_OBSERVE`: separate authorization class, eleven-gate chain, budgets/breakers/kill switch, five-stage ladder (`design.md §5`)
- [x] M9 design the privacy firewall and production retention model (`design.md §6`)
- [x] M10 design System Map V2 and the two coverage ledgers (`design.md §7-8`)
- [x] M11 design the bug-hunting loop and EIG prioritization (`design.md §9`)
- [x] M12 threat-model 34 hazards with prevention/detection/containment/evidence/recovery/test (`docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md`)
- [x] M13 build the 16-row gap matrix and the 15-campaign dependency-ordered programme (`docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` §1-3)
- [x] M14 define the 20 hard production readiness gates (`docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` §4)
- [x] M15 write the requirement deltas (`specs/`)
- [x] M16 point durable documentation at the master plan without rewriting history
- [x] M17 verify the diff is planning-only, commit, push, confirm `HEAD == origin/main`, clean worktree, sibling repositories unmodified

## Future implementation campaigns — NOT AUTHORIZED

Each requires its own explicit one-shot owner authorization. Acceptance
criteria are in `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` §2; gates in `§4`.

### Track A — Reach

- [ ] C-01 truncation truth and discovery paging — acceptance: `ripple-api` reports 223 operations, `routeOperationsTruncated = 0`, `TRUNCATED` propagated to CLI + contract + ledger
- [ ] C-02 protobuf source intelligence — acceptance: ≥ 147 operations from `blueapi/billing` with verb, path, request and response message; zero operations from commented or malformed options
- [ ] C-03 Go/gRPC topology binding — acceptance: ≥ 12 ouchan services bound to ≥ 12 proto services as `SOURCE_FACT`
- [ ] C-04 frontend consumer intelligence — acceptance: ≥ 400 frontend→route edges; no `SOURCE_FACT` edge from a non-literal path
- [ ] C-05 universe discovery and admission hygiene — acceptance: one owner-approved allowlist; no persisted mutable git state; unapproved repositories provably unscanned

### Track B — Proof

- [ ] C-06 two-witness read-only proof — acceptance: ≥ 200 `READ_ONLY_PROVEN` operations, each with two named witnesses; the 11-row catalog is no longer an input to classification
- [ ] C-07 derived endpoint semantics and generated targets — acceptance: registry fully derived; ≥ 30 generated DEV targets; ≥ 1 product finding on DEV
- [ ] C-08 deployment-fact binding — acceptance: every operation carries a binding class; U-1 recorded as an explicit unknown, never inferred
- [ ] C-09 spec-derived expectations — acceptance: ≥ 40 admitted expectations bound to `repo@SHA:path`; non-checkable scenarios grant nothing

### Track C — Production

- [ ] C-10 privacy firewall — acceptance: all five `design.md §6.5` tests green; projection cone import-isolated; persistence audit clean
- [ ] C-11 `PROD_OBSERVE` safety kernel — acceptance: PQ receipt with all eleven gates exercised against mock production at 100 % denial for non-admitted cases; **zero real contact**; D-4 textually intact
- [ ] C-12 P1 passive production observation — acceptance: ≥ 3 sessions, zero requests issued by Nightwatch, zero raw values persisted, baselines recorded
- [ ] C-13 P2 bounded active production reads — acceptance: ≥ 5 campaigns, zero safety/privacy events, zero budget overruns, every request traceable to a two-witness surface
- [ ] C-14 P3 bounded production replay — acceptance: ≥ 1 candidate reproduced with exact fingerprint equality; dossier privacy-clean

### Track D — Visibility

- [ ] C-15 System Map V2 and coverage ledgers — acceptance: byte-identical deterministic layout across runs; 10⁴-node render budget met; all eight operator queries answerable; `TRUNCATED` rendered; Control Center still GET/HEAD-only with `executionAuthority: NONE`

### Designed but not planned

- [ ] P4 autonomous read-only production campaigns — blocked on U-3 (organizationally enforced read-only observer identity), an owner/organization decision outside Nightwatch's scope
