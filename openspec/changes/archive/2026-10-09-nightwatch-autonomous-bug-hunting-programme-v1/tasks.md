# Tasks — autonomous bug-hunting programme

## W0 — protocol freeze
- [x] Frozen `src/core/agentProtocol/` with fail-closed validators
 — COMPLETED_LATER: the protocol freeze landed in W0 and the fail-closed validators are pinned by `tests/unit/agentProtocol*` suites registered in the gate-selected synthetic campaign. [2026-10-10, M13 14.2]
- [x] `AUTONOMOUS_AGENT_LOCAL` owner-scope class
 — COMPLETED_LATER: the owner-scope class exists in `src/core/policy/ownerScope.ts` and `status:local` renders the frozen owner scope (`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`, frozen=22, markers-match=true). [2026-10-10, M13 14.2]
- [x] Programme state, continuity, OpenSpec
 — COMPLETED_LATER: the W0-W12 continuity records and the archived OpenSpec changes are in place; this reconciliation closes the programme's own ledger. [2026-10-10, M13 14.2]
- [x] Focused protocol tests and hardening rule
 — COMPLETED_LATER: the protocol suites and their hardening rules are registered and every rule carries a mutation probe (M8 campaign 175/175 DETECTED; M9-M12 advances). [2026-10-10, M13 14.2]

## W1 — independent lanes
- [x] AgentRuntime loop, checkpoint, budget
 — COMPLETED_LATER: W8/W9 delivered the loop with checkpoints and the HOUR_1-calibrated budget; M5 of this campaign (tasks 6.1-6.17) repaired the resume, conservation, provider-attribution and signal-pause semantics with permanent regressions. [2026-10-10, M13 14.2]
- [x] CLI ReasonerDriver with fake CLI tests
 — COMPLETED_LATER: the print adapter and the full reasoner identity (executable, adapter, print CLI, `PRINT_ARGS`, provider, model) with `REASONER_IDENTITY_MISMATCH` landed in M5 (6.4), proven by `tests/unit/reasonerIdentityBinding.test.ts` and the M12 13.1 provider attack row. [2026-10-10, M13 14.2]
- [x] Agent tools over existing engines
 — COMPLETED_LATER: the tool surface is admitted through the existing engines; NW-AUD-046/047's fixture-fallback over-claim is closed (M5 6.15: `ADAPTER_UNAVAILABLE`, never a substituted fixture) and locally-finding admission grounding is closed (M5 6.1/6.10). [2026-10-10, M13 14.2]
- [x] Bug Atlas
 — COMPLETED_LATER: the atlas miner is integrated and its Lane C synthetic fallback is closed (M5 6.15). [2026-10-10, M13 14.2]
- [x] System Atlas overlay
 — COMPLETED_LATER: the overlay is integrated and its synthetic previews are relabelled `SYNTHETIC_PREVIEW` with `measured: false` (M6 7.9). [2026-10-10, M13 14.2]
- [x] Historical benchmark harness
 — COMPLETED_LATER: the harness ran W11's 14-case historical arm (66.8 min, 78 leak-isolated calls) and its frozen arm is preserved. [2026-10-10, M13 14.2]
- [x] Autonomous finding dossier
 — COMPLETED_LATER: the dossier readiness is DERIVED (M6 7.1) and the content-addressed `AgentFindingRecord` is published atomically BEFORE any checkpoint deletion (M5 6.1/6.2, proven by M11 12.4: 24/24 record-level checks). [2026-10-10, M13 14.2]

## W2 — integration
- [x] Review diffs, reconcile, integrate, cross-subsystem tests
 — COMPLETED_LATER: every wave was reviewed, reconciled and integrated fast-forward; the cross-subsystem suites are registered in the validation universe and the gate. [2026-10-10, M13 14.2]

## W3 — adversarial proof
- [x] Seeded positive discovery
 — COMPLETED_LATER: the seeded positive path is proven by the synthetic hunt suite (5/5) and the W9 `PRE_FAIL_POST_PASS` ouchan product-path proof. [2026-10-10, M13 14.2]
- [x] False-anomaly rejection
 — COMPLETED_LATER: the W11 historical arm scored its negative control as a MISS with 0 false positives; M5 6.12 refuses an environment-signature failure for admission (`ENVIRONMENT_DEPENDENT`) and M11 12.3 truthfully REFUSED both candidates. [2026-10-10, M13 14.2]
- [x] Required fail-closed cases
 — COMPLETED_LATER: the fail-closed cases are covered by the synthetic hunt suite (admission, refusal, persistence, resume, provider outage, signal pause) and the M12 13.1 adversarial audit (14 attack rows, 4 defects repaired). [2026-10-10, M13 14.2]

## W4 — historical rediscovery
- [x] Corpus policy, leakage controls, honest results
 — COMPLETED_LATER: the leakage controls are proven live by canaries (`tests/unit/w11LeakageCanary.test.ts`, 5 tests) and the M11 12.3 run scanned 4018 chars with 0 findings; every arm states its yield honestly including zero. [2026-10-10, M13 14.2]

## W5 — endurance and certification
- [x] Bounded local campaigns
 — COMPLETED_LATER: `npm run agent:campaign` is declared with `--wall-clock-minutes` (narrow-only) and the M11 12.3 proof ran a 20-minute bounded campaign. [2026-10-10, M13 14.2]
- [x] gate:local, gate:clean, programme report
 — COMPLETED_LATER: `gate:local` 15/15 at `14efed2e` and `gate:clean` PASS with `clean-receipt:sha256:3300f6eb113ed46816b5ac66` (M11 12.5, UI 105/105, TOPOLOGY PROVEN); the programme report is the README's governed status block plus `docs/CURRENT_STATE.md`. [2026-10-10, M13 14.2]
