# Report — nightwatch-systemmap-browser-stability-v1

Status: IN_PROGRESS (M2 pending)

## Campaign

```text
Campaign: C-15c browser spec stale-UI race hardening (test-only)
Task ID: nightwatch-systemmap-browser-stability-v1
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Implementation anchor: NONE (no implementation change yet)
Final SHA: not yet integrated
```

## Objective

Close the stale-UI race in `tests/browser/systemMapV2.browser.ts` with two
additive member-readiness gates; prove 10/10 serial repeats; integrate.

## Diagnosis (evidence, not conclusion)

- Serial `--repeat-each` runs of the unmodified spec fail ~30–50% at step
  6e (line 242) and occasionally at step 6d (line 212) and step 9.
- L4 traffic logs (all runs): `/l4?focus=op:op-0 => [consumer:e1,op:op-0]`
  — server/adapter/projection correct every run.
- React-fiber probe of a failing run: trail `l4:op:op-0`, query null, L4
  data ready, search clear, `selectedNodeId: "op:op-1"` — the ArrowRight
  was processed against the pre-drill L3 member list because the
  `map-authority` gate passes on the stale pre-drill view.
- Product model verified sound (unit suites + fiber parity); no product
  change is made by this campaign.

## Change

Pending (M2): 6d L2-member gate + 6e L4-op-0 breadcrumb/consumer gates.
Diff limited to the one spec file, additive assertions only.

## Validation

Pending (M3): 10x serial browser repeats, sibling spec, adjacent unit
suites, typecheck, hardening, agent/project/handoff checks. No
validation results to report yet.

## Known issues

The flake under repair (see Diagnosis). No other open issues.

## Recommendation

Complete M2–M4; no follow-up campaign required for this defect.
```

## Requirement ledger

SPEC.md acceptance criteria map 1:1 to M2–M4 milestones in PLAN.md; all
pending.
