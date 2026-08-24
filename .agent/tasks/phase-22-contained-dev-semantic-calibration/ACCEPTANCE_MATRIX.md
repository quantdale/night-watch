# Phase 22 Acceptance Matrix

| ID | Capability | Required evidence | Status |
|---|---|---|---|
| A01 | Eligibility classifier | Deterministic seven-state classifier with fail-closed reasons | PASS — focused core + source inventory; 3 eligible, 1 runtime-binding blocker, 2 synthetic-only |
| A02 | Fresh source derivation | Current SHA/evidence re-derivation and drift classification | PASS — fresh `ripple-api` `85e400a`; 4 historical + 4 collection derivations, 0 failures |
| A03 | Frozen manifest | Versioned immutable metadata-only manifest, max six targets | PASS — 3 targets / 3 exclusions, manifest `manifest:sha256:3c0d357a25328212f7011d1d` |
| A04 | Preflight V2 | Versioned receipt covering all required safety/currentness gates | PASS — versioned receipt and complete check vocabulary; live execution was gated before contact |
| A05 | Runtime privacy firewall | Hostile synthetic tests and category-only boundary | PASS — runtime observer seam, hostile raw-field tests, serial focused 7/7 |
| A06 | Collection acceptance | Real-source-derived collection path with partial coverage non-PASS | READY LOCALLY / BLOCKED REAL — 3 eligible collection targets in frozen manifest; no real evaluation occurred |
| A07 | Membership acceptance | Ephemeral categorical membership path or explicit no-eligible result | PASS — explicit `NO_ELIGIBLE_REAL_MEMBERSHIP_CONTRACT`; no member values manufactured |
| A08 | Differential eligibility | Mechanical real-pair classification without route expansion | PASS — all eligible rows classified `NO_REAL_SECOND_SURFACE`; 0 real pairs evaluated |
| A09 | Replay V4 | FIRST/replay identity and outcome classifications, no retries | PASS LOCALLY / BLOCKED REAL — one FIRST + one replay is frozen per target; 0 real observations |
| A10 | Minimization policy | Safe-plan reduction only; unauthorized real minimization explicit | PASS — safe read-only reduction only; `REAL_MINIMIZATION_NOT_AUTHORIZED` path covered |
| A11 | Calibration metrics | Safe per-target and aggregate metrics | PASS — bounded metric builder and dry-run schema; real metric counts remain 0 |
| A12 | Confidence calibration | Real evidence requirements and downgrade regressions | PASS — real HIGH requires current decisive observation + fresh replay + privacy/protocol truth |
| A13 | Dossier V6 | Sanitized owner-only real acceptance mode | PASS — sanitized real dossier/summary mode; no real finding dossier generated |
| A14 | Operator UX | Local preflight/manifest/dry-run/acceptance/results/explain views | PASS — five local commands, explicit execute, no `--all` |
| A15 | Dry-run | Exact frozen manifest synthetic no-contact proof | PASS — 3 FIRST + 3 replay plans, 6 contexts, `externalContact=false`, mutation/raw persistence 0 |
| A16 | DEV campaign | One launcher invocation, <=6 targets, <=12 contexts, or zero contact with blocker | BLOCKED_BEFORE_DEV — Actions run `32681204267`, job `97298112036`, `steps=[]`; launcher not invoked |
| A17 | Privacy audit | Artifact/schema/content checks with all restricted leaks zero | PASS PRE-DEV — hostile/schema audit and dry-run raw persistence 0; no authenticated artifacts existed |
| A18 | Safety vector | All prohibited operation counts zero | PASS — every restricted category 0; DEV observations also 0 |
| A19 | Compatibility | Phase 9–22 focused cone and canonical/isolated parity | PASS — 1,302 cone tests; canonical and isolated 2,336/4/0 exact parity |
| A20 | Continuity/project state | Strict v2, project check, clean synchronized Git | PASS — `agent:check` strict errors 0, `project:check` PASS, pushed `64cffaf` with `HEAD == origin/main` |
