# HARDENING HANDOFF — Phase 13 Overnight Batch

This document is the required handoff from the implementation-only overnight batch into the **next separate hardening campaign**.

Do not run the hardening campaign under `PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY`.

## Overnight implementation inventory

Populate during the overnight run with actual evidence:

### C1 — Contract & identity correctness

- implementation SHA(s):
- replay-plan schema/version changes:
- occurrence-identity representation:
- API cardinality fix:
- semantic-evidence coherence changes:
- semantic/AI-ready confidence changes:
- compatibility decisions:
- known unresolved risks:

### C2 — Real-campaign semantic runtime plumbing

- implementation SHA(s):
- source-bundle schema/version:
- fixed target/journey mapping:
- semantic observer seam changes:
- manifest/checkpoint/version changes:
- historical compatibility/migration behavior:
- unsupported protocol-only surfaces:
- known unresolved risks:

### C3 — Real replay + triage + dossier integration

- implementation SHA(s):
- candidate classes with real replay source binding:
- candidate classes still explicitly unsupported:
- `invalidReducedReplay()` remaining occurrences and why:
- semantic clustering integration:
- semantic confidence integration:
- dossier-v2 integration:
- private output/brief changes:
- known unresolved risks:

## Minimal overnight validation evidence

Record exact results only:

- C1 typecheck:
- C1 git diff --check:
- C2 typecheck:
- C2 git diff --check:
- C3 typecheck:
- C3 git diff --check:
- final focused smoke command/count:
- final agent:check:
- GitHub Actions observations, if any:

Anything not explicitly listed above is **NOT_RUN** unless actual output proves otherwise.

## Required next hardening campaign

The next owner-authorized task should treat all three changes as one integrated surface and perform, at minimum:

1. Re-read live Git and every C1/C2/C3 changed file.
2. Cross-check implementation against the original Phase 13 SPEC/workstreams and this amendment.
3. Run `npm run hardening:check` and extend hardening guards for every new pure/runtime boundary.
4. Build/complete permanent focused regressions for replay occurrence identity, API cardinality, semantic evidence coherence, manifest/checkpoint version drift, source-bundle fail-closed behavior, semantic observer attachment, replay binding, semantic cluster/confidence/dossier readiness, privacy and authority boundaries.
5. Execute the full Phase 13 acceptance matrix rather than accepting implementation intent.
6. Run Phase 12 compatibility and the relevant Phase 9/10/11 matrices.
7. Run `campaign:synthetic` and owner-provenance.
8. Run deterministic shadow-campaign/backtest repeats and verify zero false reproduction / false READY / partial false PASS / stale false PASS / privacy leaks.
9. Run fresh current-source remote-SHA + disposable-snapshot derivation/currentness canary with canonical sibling writes 0.
10. Run canonical complete Playwright with `--workers=1` and record raw pass/skip/fail counts.
11. Run topology-correct isolated complete Playwright from a fresh clone with `npm ci` and record raw counts.
12. Run `agent:check`, `agent:audit`, `project:check`, catalog integrity, and `git diff --check`.
13. Inspect exact GitHub Actions runs. If billing still blocks jobs before execution, terminalize truthfully as external-CI blocked; do not claim CI success.
14. Only after hardening is genuinely green should any Phase 13B contained DEV acceptance be designed or authorized.

## Hardening priorities

Prioritize in this order:

1. safety/authority boundary regressions;
2. replay occurrence/cardinality correctness;
3. stale/currentness/manifest-resume fail-closed semantics;
4. semantic PARTIAL/stale/unavailable truth propagation;
5. privacy and raw-value leakage;
6. replay/minimization fingerprint correctness;
7. semantic confidence/READY/AI-ready non-overclaim;
8. protocol-only backward compatibility;
9. determinism and clustering identity;
10. full regression and CI/continuity closure.

## State rule

The overnight batch may end `IMPLEMENTED_AWAITING_HARDENING` only. This handoff must never be used as evidence that any deferred hardening row passed.