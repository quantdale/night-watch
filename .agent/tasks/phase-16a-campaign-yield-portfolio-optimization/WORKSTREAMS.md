# WORKSTREAMS — Phase 16A

## W1 Portfolio model
Versioned deterministic member DTO, authority/currentness/coverage/yield/starvation/cost fields, strict parser, sanitized evidence only.

## W2 Priority scoring
Explainable component score + digest. No AI/model judgment. Stale/unavailable/blocked evidence cannot improve rank.

## W3 Budget allocator
Total budget, per-member caps/floors, starvation control, retry ceiling, duplicate suppression, reserved exploration share, deterministic tie-breaking.

## W4 Yield accounting
Local/synthetic historical counters for admitted/reproduced/minimized/distinct-cluster/dossier-ready/duplicate/invalid/transient and cost-per-useful-candidate.

## W5 Campaign manifest
Versioned deterministic owner-gated plan with selection order, budget, reasons, oracle/semantic coverage, replay/minimization/checkpoint policies.

## W6 Change-aware replan
Reuse/reprioritize/invalidate classification from existing project snapshot + source movement/currentness evidence.

## W7 Shadow simulator
Pure synthetic/historical simulation comparing baseline and portfolio allocation. Never describe synthetic delta as proven real-world uplift.

## W8 Tooling / handoff
Read-only CLI/report APIs: inspect, explain, plan, compare, simulate. Emit a separately authorized DEV campaign handoff; do not execute it.

## Cross-cutting invariants
Existing authority only; no target expansion; no runtime product calls; deterministic normalized identity; private-safe outputs; frozen/gated phase markers stay blocking; compatibility with Phase 12–15 lifecycle/replay/triage/currentness APIs.
