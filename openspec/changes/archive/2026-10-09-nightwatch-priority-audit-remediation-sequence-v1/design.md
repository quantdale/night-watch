## Context

Five strict-valid planning changes exist and their defects remain live at
base `4a3df8cd`. Handoff v1 binds one Campaign ID to one OpenSpec route that
must contain tracked `audit.md`, `proposal.md`, `design.md`, `tasks.md`, and
at least one spec. The five remediation changes intentionally omit `audit.md`
because they were produced by a planning-only campaign. NW-AUD-006 established
the implementation-campaign precedent: a dedicated campaign task, its own
OpenSpec change including `audit.md`, and C-00 under the authority-binding
contract.

## Goals / Non-Goals

**Goals:**

- One writer, one owned worktree, one session identity for all five phases.
- Strict serial execution with a per-phase admission gate before the next
  phase starts.
- Each remediation proved against live source with reproduction, focused
  regression, adversarial/mutation proof, and a coherent commit.
- Shared privacy primitives reused across NW-AUD-019 and NW-AUD-018 without
  collapsing their distinct policy domains.
- One final full certification; honest closure of all five OpenSpec task
  ledgers; terminal stop with remaining backlog enumerated.

**Non-Goals:**

- Any NW-AUD item outside 010/014/019/018/020.
- Real Alphaus traffic, authenticated product execution, database/cloud
  access, sibling mutation, external publication, force push, history
  rewrite.
- Rewriting the five planning-only task STATE records into false
  implementation history.
- Starting another remediation automatically after completion.

## Decisions

### Umbrella campaign owns handoff and C-00; remediations keep their OpenSpec identities

Handoff v1 requires `OpenSpec: openspec/changes/${Campaign ID}/` with all
four artifact classes tracked. The umbrella change is the campaign route;
each remediation's existing change remains the normative delta spec for its
capability and is strict-validated at its phase gate and again at closure.
Planning task STATEs stay COMPLETE/planning-only historical records; the
umbrella STATE is the living implementation waypoint.

Alternative considered: five sequential campaigns with five handoff flips.
Rejected: five times the C-00 lifecycle overhead, five ACTIVE_TASK rewrites,
and no benefit to serial phases inside one authorized sequence.

### Fixed phase order 010 → 014 → 019 → 018 → 020

Owner-authorized order. NW-AUD-019 precedes NW-AUD-018 so structural privacy
primitives exist before authenticated evidence reuses them. NW-AUD-020 is last
because it has the largest runtime containment blast radius. NW-AUD-014 early
so later phases' new child processes sit inside an already-total boundary.

### Per-phase admission gate

A phase is complete only when: defect re-reproduced on live source (or
mechanically proven superseded); focused failing regression preserved then
made green by the fix; implementation matches the capability spec (recording
planning drift honestly); adversarial/mutation proof appropriate to the
authority passes; focused validation plus `gate:dev` and `gate:milestone`
PASS; OpenSpec/task truth updated from evidence; a coherent commit exists.
Skipping a gate is campaign interruption (PARTIAL — BLOCKED), not silent
advance.

### One final certification

Optimized lanes (`gate:dev`, `gate:milestone`, sharding) run throughout.
`npm test`, `gate:local`, `gate:clean`, `validation:universe`, and the full
check list run once after Phase 5 and the cross-phase audit, unless live
governance mechanically requires a stronger checkpoint for a specific change.
Timeouts are never inflated to force green; skips are never hidden.

### Cross-phase interaction audit is mandatory

Specifically: 010 vs documentation descendants (exact binding must not let
docs commits re-certify older code); 014 vs test/gate tooling (no ambient
credential exposure, no broken sharding); 019 vs 018 (no conflicting shared
schemas or duplicated bypasses); 018 vs 020 (admission receipts satisfy
minimization without concrete route parameters); 014 vs 020 (browser/proxy
helpers classified and bounded).

## Risks / Trade-offs

- Broad surface area across five subsystems -> serial phases, focused
  validation per phase, full certification once.
- Passive-allow removal in 020 can break navigation until finite proven
  initialization exemptions land -> exemptions are in-scope for Phase 5, and
  all proof is synthetic/loopback.
- Structural privacy migration may reject historical owner-local artifacts
  -> explicit legacy dispositions; no real private data in tests.
- Session continuity is strict -> umbrella ACTIVE_TASK/STATE/handoff are
  admitted in M0 before product writes; integrate requires IN_PROGRESS or
  COMPLETE compatible status.

## Migration Plan

1. M0 — bootstrap umbrella continuity/handoff; checks green; commit.
2. M1–M5 — each remediation per the admission gate above; commit each phase.
3. M6 — cross-phase audit; full certification; strict-validate five changes
  plus umbrella; C-00 integrate with exact session/HEAD; release; remove;
  terminal routing flip; final report A–N; stop.

Rollback may leave a phase unimplemented; it must never fabricate a passing
gate or mark a remediation complete without its evidence.

## Open Questions

None at campaign open. Phase-level open questions from each remediation's own
design.md remain owned by that phase and are resolved (or escalated as
blockers) inside that phase.
