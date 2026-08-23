# Phase 16CH — Portfolio Runtime Binding Hardening

## Context

Phase 16B proved the Phase-16A inert DEV handoff had no runtime consumer and correctly stopped before DEV. Phase 16C then implemented the missing local seam: canonical real runtime profile and universe, strict handoff/plan admission, separately supplied authorization, restrictive budget mapping, selected-member binding, optional load-bearing campaign metadata, prepare/resume integration and one opt-in launcher path. Phase 16C deliberately stopped after focused/moderate local proof and zero DEV contact.

Phase 16CH is the exhaustive repair-and-proof layer before any DEV retry.

## Architecture under test

```text
canonical runtime profile / registries
        |
real approved universe
        |
portfolio plan + inert DEV handoff
        |
strict admission + independent authorization
        |
monotone-restrictive budget mapping
        |
exact selected-member -> existing work-item binding
        |
CampaignManifest optional portfolioBinding
        |
prepareCampaign -> checkpoint -> resumeCampaign
        |
owner policy
        |
existing executor
```

No second executor or runner is permitted.

## Key invariants

1. Handoff remains inert: `executable:false` never becomes runtime authority.
2. Authorization is external to plan identity and cannot mutate the plan.
3. Real universe is derived from canonical runtime definitions; synthetic/demo IDs are excluded.
4. Portfolio budgets only restrict the existing approved Phase-7 profile.
5. Every selected member maps exactly once to an existing approved work item.
6. Every load-bearing portfolio binding field participates in resume compatibility as intended.
7. Prepare executes zero product callbacks; resume reauthorizes before executor construction/use.
8. Historical non-portfolio campaigns remain compatible.
9. Launcher input is one explicit path into the existing manual campaign adapter.
10. Errors/artifacts remain categorical/private-safe.

## Hardening strategy

Adversarial corpus first, then affected compatibility, then complete canonical regression, then topology-correct isolated regression with exact parity, then continuity/project/catalog/CI closure. New source is permitted only for observed defects.

## Runtime boundary

Phase 16CH is local/source/synthetic only. No DEV/NEXT/production/browser/auth/product traffic occurs. A Phase-16D DEV acceptance retry requires a new owner authorization after this hardening closes.