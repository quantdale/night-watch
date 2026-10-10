## Context

The previous audit campaign is terminal. A fresh discovery wave found multiple
concrete remaining candidates, and the owner resolved the canonical-dirty C-00
blocker without changing the certified baseline. The current first child is
shard certification integrity because its false-green behavior was reproduced
with a bounded synthetic fixture and has the best impact/confidence/executability
to risk ratio.

## Goals / Non-Goals

**Goals:** reproduce before selection; select one coherent campaign at a time;
preserve adversarial proof and periodic reassessment; integrate only through
C-00.

**Non-Goals:** reopen old campaign history, contact real environments, use
credentials/customer data, mutate sibling repositories, or claim completion
without a legitimate terminal condition.

## Decisions

- Use current source/test evidence over stale audit numbering.
- Keep child campaign OpenSpecs and task state separate from this umbrella.
- Use focused tests and `gate:dev`/`gate:milestone`; full certification only
  at justified release groupings.

## Risks / Trade-offs

The backlog contains several high-impact issues. Sequencing is deliberate so
small evidence-integrity defects do not get hidden by larger architectural work.
Unknown external state remains explicitly blocked rather than inferred.

## Migration Plan

1. Complete shard-certification child campaign.
2. Reassess run-evidence transaction integrity and other candidates.
3. Create a new child task/change for each selected successor.
4. Close only after final adversarial review and exact C-00 integration.

## Open Questions

None.
